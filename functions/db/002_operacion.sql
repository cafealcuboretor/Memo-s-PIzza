CREATE TABLE IF NOT EXISTS memos_pizza.cuentas (
    id uuid PRIMARY KEY,
    nombre text NOT NULL,
    correo text NOT NULL UNIQUE CHECK (correo = lower(correo)),
    clave_derivada text NOT NULL,
    rol text NOT NULL DEFAULT 'cliente' CHECK (rol IN ('cliente', 'admin')),
    creada_en timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS una_cuenta_administradora
    ON memos_pizza.cuentas (rol) WHERE rol = 'admin';

CREATE TABLE IF NOT EXISTS memos_pizza.consentimientos (
    cuenta_id uuid NOT NULL REFERENCES memos_pizza.cuentas (id),
    version text NOT NULL,
    aceptado_en timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (cuenta_id, version)
);

CREATE TABLE IF NOT EXISTS memos_pizza.sesiones (
    huella text PRIMARY KEY,
    cuenta_id uuid NOT NULL REFERENCES memos_pizza.cuentas (id),
    expira_en timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS sesiones_expiracion_idx ON memos_pizza.sesiones (expira_en);

CREATE TABLE IF NOT EXISTS memos_pizza.inventario_demo (
    sku text PRIMARY KEY REFERENCES memos_pizza.productos (sku),
    existencias integer NOT NULL CHECK (existencias >= 0)
);

CREATE TABLE IF NOT EXISTS memos_pizza.pedidos (
    id uuid PRIMARY KEY,
    folio text NOT NULL UNIQUE,
    cuenta_id uuid NOT NULL REFERENCES memos_pizza.cuentas (id),
    intento uuid NOT NULL,
    solicitud_hash text NOT NULL,
    creado_en timestamptz NOT NULL DEFAULT clock_timestamp(),
    etapa_minima smallint NOT NULL DEFAULT 0 CHECK (etapa_minima BETWEEN 0 AND 5),
    metodo text NOT NULL CHECK (metodo IN ('efectivo', 'tarjeta_simulada')),
    entrega jsonb NOT NULL,
    subtotal_centavos integer NOT NULL CHECK (subtotal_centavos >= 0),
    envio_centavos integer NOT NULL CHECK (envio_centavos >= 0),
    total_centavos integer GENERATED ALWAYS AS (subtotal_centavos + envio_centavos) STORED,
    UNIQUE (cuenta_id, intento)
);

CREATE INDEX IF NOT EXISTS pedidos_cliente_fecha_idx
    ON memos_pizza.pedidos (cuenta_id, creado_en DESC, id DESC);

ALTER TABLE memos_pizza.pedidos ADD COLUMN IF NOT EXISTS version_terminos text NOT NULL;

CREATE TABLE IF NOT EXISTS memos_pizza.partidas_pedido (
    pedido_id uuid NOT NULL REFERENCES memos_pizza.pedidos (id),
    sku text NOT NULL REFERENCES memos_pizza.productos (sku),
    nombre text NOT NULL,
    emoji text NOT NULL,
    imagen text NOT NULL,
    categoria text NOT NULL,
    precio_centavos integer NOT NULL CHECK (precio_centavos >= 0),
    cantidad integer NOT NULL CHECK (cantidad BETWEEN 1 AND 20),
    PRIMARY KEY (pedido_id, sku)
);

CREATE TABLE IF NOT EXISTS memos_pizza.eventos_pedido (
    id uuid PRIMARY KEY,
    pedido_id uuid NOT NULL REFERENCES memos_pizza.pedidos (id),
    actor_id uuid NOT NULL REFERENCES memos_pizza.cuentas (id),
    etapa smallint NOT NULL CHECK (etapa BETWEEN 0 AND 5),
    registrado_en timestamptz NOT NULL DEFAULT now(),
    UNIQUE (pedido_id, etapa)
);

INSERT INTO memos_pizza.inventario_demo (sku, existencias)
SELECT sku, 50 FROM memos_pizza.productos
ON CONFLICT (sku) DO NOTHING;
