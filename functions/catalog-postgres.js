async function readCatalog(pool) {
  const { rows: [catalog] } = await pool.query(`
    SELECT
      ARRAY(SELECT codigo FROM memos_pizza.categorias) AS categories,
      COALESCE((
        SELECT jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
          'id', sku,
          'category', categoria,
          'name', nombre,
          'description', descripcion,
          'priceCents', precio_centavos,
          'emoji', emoji,
          'image', imagen,
          'tag', etiqueta,
          'badgeText', insignia_texto,
          'badgeColor', insignia_color
        )) ORDER BY posicion, sku)
        FROM memos_pizza.productos
      ), '[]'::jsonb) AS products
  `);
  return catalog;
}

module.exports = { readCatalog };
