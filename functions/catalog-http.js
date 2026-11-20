const { randomUUID } = require('node:crypto');
const products = require('./catalog.json');

const demoCatalog = {
  products,
  categories: [...new Set(products.map(({ category }) => category))],
};

function normalize(value) {
  return value.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
}

function positiveInteger(value, fallback) {
  if (value === null) return fallback;
  const number = Number(value);
  return /^[1-9]\d*$/.test(value) && Number.isSafeInteger(number) ? number : NaN;
}

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function error(res, status, code, message) {
  json(res, status, { code, message, requestId: randomUUID() });
}

function createCatalogHandler(loadCatalog = async () => demoCatalog) {
  return async function handleCatalog(req, res) {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname !== '/api/products') {
      return error(res, 404, 'NOT_FOUND', 'La ruta solicitada no existe.');
    }
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return error(res, 405, 'METHOD_NOT_ALLOWED', 'El catálogo se consulta con GET.');
    }

    const { searchParams } = url;
    const query = (searchParams.get('q') ?? '').trim();
    const category = searchParams.get('category');
    const page = positiveInteger(searchParams.get('page'), 1);
    const limit = positiveInteger(searchParams.get('limit'), 20);
    const invalidQuery = 'Revisa la búsqueda, la categoría, la página y el límite.';

    if (query.length > 100 || !Number.isFinite(page) || !Number.isFinite(limit) || limit > 100) {
      return error(res, 400, 'INVALID_QUERY', invalidQuery);
    }

    let catalog;
    try {
      catalog = await loadCatalog();
    } catch (cause) {
      console.error('No se pudo consultar el catálogo.', cause.code ?? '');
      return error(res, 503, 'CATALOG_UNAVAILABLE', 'El catálogo no está disponible por el momento.');
    }
    if (category !== null && !catalog.categories.includes(category)) {
      return error(res, 400, 'INVALID_QUERY', invalidQuery);
    }

    const term = normalize(query);
    const results = catalog.products.filter(product => {
      return (category === null || product.category === category)
        && (!term || normalize(`${product.id} ${product.name} ${product.description}`).includes(term));
    });
    const offset = (page - 1) * limit;
    return json(res, 200, {
      items: results.slice(offset, offset + limit),
      total: results.length,
      page,
      limit,
      currency: 'MXN',
    });
  };
}

module.exports = { createCatalogHandler };
