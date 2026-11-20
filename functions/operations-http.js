const { randomUUID } = require('node:crypto');
const { Pool } = require('pg');
const { createAccounts, sessionToken, sessionCookie, termsVersion } = require('./accounts-postgres');
const { createOrders, uuidPattern } = require('./orders-postgres');
const { ApiError } = require('./operations-validation');

const maxBodyBytes = 16 * 1024;

function json(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(JSON.stringify(body));
}

async function readJson(req, allowedOrigins) {
  if (req.headers['x-memos-request'] !== '1'
      || (req.headers.origin && !allowedOrigins.has(req.headers.origin))) {
    throw new ApiError(403, 'ORIGIN_DENIED', 'Abre esta operación desde la tienda.');
  }
  if (req.headers['content-type']?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    throw new ApiError(415, 'JSON_REQUIRED', 'Se requiere una solicitud JSON.');
  }
  const oversized = () => new ApiError(413, 'BODY_TOO_LARGE', 'La solicitud excede el tamaño permitido.');
  if (Number(req.headers['content-length']) > maxBodyBytes) throw oversized();
  let raw = req.rawBody;
  if (!Buffer.isBuffer(raw)) {
    const parts = [];
    let size = 0;
    for await (const chunk of req.iterator({ destroyOnReturn: false })) {
      size += chunk.length;
      if (size > maxBodyBytes) throw oversized();
      parts.push(chunk);
    }
    raw = Buffer.concat(parts);
  }
  if (raw.length > maxBodyBytes) throw oversized();
  try {
    return JSON.parse(raw.toString('utf8'));
  } catch {
    throw new ApiError(400, 'INVALID_JSON', 'No se pudo leer la solicitud.');
  }
}

function createOperationsHandler(pool, { origins, secureCookies }) {
  const allowedOrigins = new Set(origins);
  const accounts = createAccounts(pool);
  const orders = createOrders(pool);
  let rateLimits = new Map();
  let nextWindow = 0;
  function limitAuth(req) {
    const now = Date.now();
    if (nextWindow <= now) {
      rateLimits = new Map();
      nextWindow = now + 60_000;
    }
    const ip = req.socket.remoteAddress ?? 'unknown';
    const count = rateLimits.get(ip) ?? 0;
    if (count >= 20 || (count === 0 && rateLimits.size >= 2048)) {
      throw new ApiError(429, 'TRY_LATER', 'Espera un minuto e inténtalo de nuevo.');
    }
    rateLimits.set(ip, count + 1);
  }

  return async function handleOperations(req, res, path) {
    try {
      const method = req.method;
      const token = sessionToken(req.headers);
      if (method === 'POST' && path === '/api/auth/register') {
        const input = await readJson(req, allowedOrigins);
        limitAuth(req);
        await accounts.register(input);
        return json(res, 201, { ok: true });
      }
      if (method === 'POST' && path === '/api/auth/login') {
        const input = await readJson(req, allowedOrigins);
        limitAuth(req);
        const session = await accounts.login(input, token);
        res.setHeader('Set-Cookie', sessionCookie(session.token, secureCookies));
        return json(res, 200, { account: session.account });
      }
      if (method === 'POST' && path === '/api/auth/logout') {
        await readJson(req, allowedOrigins);
        await accounts.logout(token);
        res.setHeader('Set-Cookie', sessionCookie(null, secureCookies));
        return json(res, 200, { ok: true });
      }
      const account = await accounts.current(token);
      if (!account) throw new ApiError(401, 'SESSION_REQUIRED', 'Inicia sesión para continuar.');
      if (method === 'GET' && path === '/api/auth/me') {
        return json(res, 200, { account });
      }
      if (method === 'POST' && path === '/api/orders') {
        const input = await readJson(req, allowedOrigins);
        if (input?.termsVersion !== termsVersion) {
          throw new ApiError(400, 'TERMS_REQUIRED', 'Acepta los términos vigentes para confirmar tu pedido.');
        }
        const { order, created } = await orders.checkout(account.id, input, req.headers['idempotency-key']);
        return json(res, created ? 201 : 200, { order });
      }
      if (method === 'GET' && path === '/api/orders') {
        return json(res, 200, { orders: await orders.list(account.id) });
      }
      const [,, group, child, id] = path.split('/');
      if (method === 'GET' && group === 'orders' && !id && uuidPattern.test(child ?? '')) {
        return json(res, 200, { order: await orders.get(child, account.id) });
      }
      if (group === 'admin') {
        if (account.role !== 'admin') throw new ApiError(403, 'ADMIN_REQUIRED', 'Esta operación requiere una cuenta administradora.');
        if (method === 'GET' && path === '/api/admin/orders') {
          return json(res, 200, { orders: await orders.list(null) });
        }
        if (method === 'GET' && path === '/api/admin/inventory') {
          return json(res, 200, { inventory: await orders.inventory() });
        }
        if (method === 'PATCH' && child === 'orders' && uuidPattern.test(id ?? '') && path === `/api/admin/orders/${id}`) {
          const input = await readJson(req, allowedOrigins);
          return json(res, 200, { order: await orders.advance(id, account.id, input) });
        }
      }
      throw new ApiError(404, 'NOT_FOUND', 'La ruta solicitada no existe.');
    } catch (error) {
      const requestId = randomUUID();
      if (error instanceof ApiError) {
        return json(res, error.status, { code: error.code, message: error.message, requestId });
      }
      console.error('Error en la API de operación.', requestId, error.code ?? '');
      return json(res, 503, { code: 'OPERATIONS_UNAVAILABLE', message: 'La operación no está disponible por el momento.', requestId });
    }
  };
}

function createApiHandler(catalog, operationUrl, options) {
  const operations = operationUrl && createOperationsHandler(new Pool({
    connectionString: operationUrl,
    max: 6,
    connectionTimeoutMillis: 5000,
    statement_timeout: 5000,
  }).on('error', error => console.error('Conexión de operación interrumpida.', error.code ?? '')), options);

  return (req, res) => {
    const { pathname } = new URL(req.url, 'http://localhost');
    if (!/^\/api\/(?:auth|orders|admin)(?:\/|$)/.test(pathname)) return catalog(req, res);
    if (!operations) {
      return json(res, 503, { code: 'OPERATIONS_UNAVAILABLE', message: 'La operación con PostgreSQL está desactivada en este entorno.' });
    }
    return operations(req, res, pathname);
  };
}

module.exports = { createApiHandler, createOperationsHandler };
