CREATE SCHEMA IF NOT EXISTS memos_pizza;

CREATE TABLE IF NOT EXISTS memos_pizza.categorias (
    codigo text PRIMARY KEY,
    CHECK (codigo <> '')
);

CREATE TABLE IF NOT EXISTS memos_pizza.productos (
    sku text PRIMARY KEY,
    categoria text NOT NULL REFERENCES memos_pizza.categorias (codigo),
    nombre text NOT NULL,
    descripcion text NOT NULL,
    precio_centavos integer NOT NULL CHECK (precio_centavos >= 0),
    emoji text NOT NULL,
    imagen text NOT NULL,
    etiqueta text,
    insignia_texto text,
    insignia_color text,
    posicion integer NOT NULL CHECK (posicion >= 0)
);

CREATE INDEX IF NOT EXISTS productos_categoria_idx
    ON memos_pizza.productos (categoria);
