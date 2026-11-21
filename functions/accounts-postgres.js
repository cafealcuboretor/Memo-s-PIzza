const { createHash, randomBytes, randomUUID, scrypt, timingSafeEqual } = require('node:crypto');
const { promisify } = require('node:util');
const { ApiError, assertFields, field } = require('./operations-validation');

const derive = promisify(scrypt);
const scryptParams = { N: 2 ** 15, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };
const termsVersion = '1.1-2026-11-20';
const sessionSeconds = 8 * 60 * 60;
const cookieName = '__session';

function fingerprint(token) {
  return createHash('sha256').update(token).digest('hex');
}

function publicAccount(account) {
  return {
    id: account.id,
    name: account.nombre,
    email: account.correo,
    role: account.rol,
    acceptedTermsVersion: account.version,
    acceptedTermsAt: account.aceptado_en,
  };
}

function sessionToken(headers) {
  const value = (headers.cookie ?? '').split(';').map(part => part.trim())
    .find(part => part.startsWith(cookieName + '='));
  const token = value?.slice(cookieName.length + 1);
  return /^[a-f0-9]{64}$/.test(token ?? '') ? token : null;
}

function sessionCookie(token, secure) {
  return `${cookieName}=${token ?? ''}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${token ? sessionSeconds : 0}${secure ? '; Secure' : ''}`;
}

function credentials(input) {
  const email = field(input.email, 'correo', 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      || typeof input.password !== 'string' || input.password.length < 12
      || Buffer.byteLength(input.password) > 256 || !input.password.trim()) {
    throw new ApiError(400, 'INVALID_ACCOUNT', 'Escribe un correo válido y una contraseña de al menos 12 caracteres.');
  }
  return { email, password: input.password };
}

async function inTransaction(pool, execute) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await execute(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

function createAccounts(pool) {
  let hashing = 0;
  async function hashPassword(password, salt) {
    if (hashing >= 4) throw new ApiError(429, 'TRY_LATER', 'Espera un momento e inténtalo de nuevo.');
    hashing++;
    try {
      return await derive(password, salt, 64, scryptParams);
    } finally {
      hashing--;
    }
  }

  function acceptTerms(db, id) {
    return db.query(`
      INSERT INTO memos_pizza.consentimientos (cuenta_id, version)
      VALUES ($1, $2) ON CONFLICT DO NOTHING
    `, [id, termsVersion]);
  }

  return {
    async register(input) {
      assertFields(input, ['name', 'email', 'password', 'termsVersion']);
      const name = field(input.name, 'nombre', 100);
      const { email, password } = credentials(input);
      if (input.termsVersion !== termsVersion) {
        throw new ApiError(400, 'TERMS_REQUIRED', 'Acepta los términos y el aviso de privacidad vigentes.');
      }
      const id = randomUUID();
      const salt = randomBytes(16);
      const key = await hashPassword(password, salt);
      await inTransaction(pool, async client => {
        const result = await client.query(`
          INSERT INTO memos_pizza.cuentas (id, nombre, correo, clave_derivada)
          VALUES ($1, $2, $3, $4) ON CONFLICT (correo) DO NOTHING RETURNING id
        `, [id, name, email, salt.toString('hex') + ':' + key.toString('hex')]);
        if (!result.rowCount) throw new ApiError(409, 'ACCOUNT_EXISTS', 'Ya existe una cuenta para este correo.');
        await acceptTerms(client, id);
      });
    },

    async login(input, previousToken) {
      assertFields(input, ['email', 'password', 'termsVersion']);
      const { email, password } = credentials(input);
      const { rows: [account] } = await pool.query(`
        SELECT c.id, c.nombre, c.correo, c.rol, c.clave_derivada, t.version, t.aceptado_en
        FROM memos_pizza.cuentas c
        LEFT JOIN memos_pizza.consentimientos t ON t.cuenta_id = c.id AND t.version = $2
        WHERE c.correo = $1
      `, [email, termsVersion]);
      const [salt, storedKey] = account?.clave_derivada.split(':') ?? [];
      const candidate = await hashPassword(password, salt ? Buffer.from(salt, 'hex') : Buffer.alloc(16));
      const match = timingSafeEqual(candidate, storedKey ? Buffer.from(storedKey, 'hex') : Buffer.alloc(64));
      if (!account || !match) throw new ApiError(401, 'INVALID_LOGIN', 'El correo o la contraseña no coinciden.');
      if (!account.version && input.termsVersion !== termsVersion) {
        throw new ApiError(409, 'TERMS_REQUIRED', 'Acepta los términos y el aviso de privacidad vigentes.');
      }

      const token = randomBytes(32).toString('hex');
      await inTransaction(pool, async client => {
        if (!account.version) {
          await acceptTerms(client, account.id);
          const consent = await client.query(`
            SELECT version, aceptado_en FROM memos_pizza.consentimientos WHERE cuenta_id = $1 AND version = $2
          `, [account.id, termsVersion]);
          Object.assign(account, consent.rows[0]);
        }
        await client.query('DELETE FROM memos_pizza.sesiones WHERE expira_en <= now()');
        if (previousToken) {
          await client.query('DELETE FROM memos_pizza.sesiones WHERE huella = $1', [fingerprint(previousToken)]);
        }
        await client.query(`
          INSERT INTO memos_pizza.sesiones (huella, cuenta_id, expira_en)
          VALUES ($1, $2, now() + $3::integer * interval '1 second')
        `, [fingerprint(token), account.id, sessionSeconds]);
      });
      return { token, account: publicAccount(account) };
    },

    async current(token) {
      if (!token) return null;
      const { rows: [account] } = await pool.query(`
        SELECT c.id, c.nombre, c.correo, c.rol, t.version, t.aceptado_en
        FROM memos_pizza.sesiones s
        JOIN memos_pizza.cuentas c ON c.id = s.cuenta_id
        JOIN memos_pizza.consentimientos t ON t.cuenta_id = c.id AND t.version = $2
        WHERE s.huella = $1 AND s.expira_en > now()
      `, [fingerprint(token), termsVersion]);
      return account ? publicAccount(account) : null;
    },

    async logout(token) {
      if (token) await pool.query('DELETE FROM memos_pizza.sesiones WHERE huella = $1', [fingerprint(token)]);
    },
  };
}

module.exports = { createAccounts, inTransaction, termsVersion, sessionToken, sessionCookie };
