REVOKE ALL ON DATABASE memos_pizza FROM PUBLIC;
REVOKE ALL ON SCHEMA memos_pizza FROM PUBLIC;

GRANT CONNECT ON DATABASE memos_pizza TO memos_catalogo_lector, memos_operacion;
GRANT USAGE ON SCHEMA memos_pizza TO memos_catalogo_lector, memos_operacion;
GRANT SELECT ON memos_pizza.categorias, memos_pizza.productos TO memos_catalogo_lector;

GRANT SELECT ON memos_pizza.cuentas, memos_pizza.productos, memos_pizza.inventario_demo TO memos_operacion;
GRANT INSERT (id, nombre, correo, clave_derivada) ON memos_pizza.cuentas TO memos_operacion;
GRANT SELECT, INSERT ON memos_pizza.consentimientos, memos_pizza.pedidos, memos_pizza.partidas_pedido TO memos_operacion;
GRANT SELECT, INSERT, DELETE ON memos_pizza.sesiones TO memos_operacion;
GRANT INSERT ON memos_pizza.eventos_pedido TO memos_operacion;
GRANT UPDATE (existencias) ON memos_pizza.inventario_demo TO memos_operacion;
GRANT UPDATE (etapa_minima) ON memos_pizza.pedidos TO memos_operacion;
