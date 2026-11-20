const { strict: assert } = require('node:assert');
const { once } = require('node:events');
const { createServer } = require('node:http');
const { after, before, test } = require('node:test');
const { handleCatalog } = require('./catalog-http');

const server = createServer(handleCatalog);
let base;

before(async () => {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

test('pagina el catálogo actual con importes en centavos', async () => {
  const response = await fetch(base + '/api/products?page=2');
  assert.equal(response.status, 200);
  const { items, total, page, limit, currency } = await response.json();
  assert.equal(total, 25);
  assert.equal(page, 2);
  assert.equal(limit, 20);
  assert.equal(currency, 'MXN');
  assert.equal(items.length, 5);
  assert.equal(items[0].id, 'combo-guardia');
  assert.equal(items[0].priceCents, 24900);
});

test('filtra por categoría y encuentra Clásica con una búsqueda sin acento', async () => {
  const response = await fetch(base + '/api/products?category=pizzas&q=clasica');
  assert.equal(response.status, 200);
  const { items, total } = await response.json();
  assert.equal(total, 1);
  assert.equal(items[0].id, 'pz-bonnie');
  assert.equal(items[0].priceCents, 18900);
});

test('rechaza parámetros inválidos con el formato de error de la API', async () => {
  for (const query of ['page=0', 'page=1.5', 'limit=101', 'category=otra']) {
    const response = await fetch(base + '/api/products?' + query);
    assert.equal(response.status, 400);
    const { code, requestId } = await response.json();
    assert.equal(code, 'INVALID_QUERY');
    assert.ok(requestId);
  }
});

test('responde con 404 en otras rutas y 405 cuando intentan escribir', async () => {
  const other = await fetch(base + '/api/orders');
  assert.equal(other.status, 404);
  const write = await fetch(base + '/api/products', { method: 'POST' });
  assert.equal(write.status, 405);
  assert.equal(write.headers.get('allow'), 'GET');
});
