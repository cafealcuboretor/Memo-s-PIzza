# Memo's Pizza | Actualización de Términos y Condiciones

## Qué cambió

- El enlace **Términos y Condiciones** se eliminó del pie de página.
- Al pulsar **Continuar registro**, el usuario visualiza una ventana completa con las condiciones comerciales, que debe aceptar para crear su cuenta.
- Se registra la versión y fecha de aceptación dentro del perfil local. Si un usuario antiguo no ha aceptado esta versión, la visualizará al iniciar sesión por primera vez tras instalar los cambios.
- Las sesiones activas muestran **MI CUENTA** y en el menú ⚙️ aparece **Consultar Términos y Condiciones**, que lleva a `/ajustes`.
- Desde `/ajustes` el cliente autenticado puede pulsar **Ver Términos y Condiciones** y consultarlos en cualquier momento.
- El checkout mantiene su casilla de aceptación obligatoria, conforme a la actividad de blindaje legal. El enlace lleva a `/ajustes`, no al footer.
- Para abrir el checkout se exige haber iniciado sesión y aceptado la versión vigente de condiciones. Después del login se regresa al carrito.
- Las otras políticas (aviso legal, devoluciones, promociones, atención, privacidad, propiedad intelectual) **permanecen públicas** en el pie de página por transparencia.
- Los textos de las páginas públicas se reescribieron en tono comercial, sin autodescripciones académicas.

## Cómo probar

1. Ejecuta `npm ci` y `npm start`. Abre `http://localhost:4200`.
2. Comprueba que en el footer ya no hay enlace a Términos y Condiciones.
3. Entra a **INICIAR SESIÓN → Regístrate aquí** e introduce nombre, email y contraseña.
4. Pulsa **CONTINUAR REGISTRO**. Aparece la ventana de Términos; el botón de aceptar permanece bloqueado hasta marcar la casilla.
5. Acepta para **guardar la cuenta temporalmente**, sin iniciar sesión automáticamente. Aparece el formulario **Iniciar sesión**; escribe tu contraseña y entra manualmente. Después abre ⚙️ → **Consultar Términos y Condiciones** o **MI CUENTA**.
6. En Ajustes, pulsa **Ver Términos y Condiciones** y comprueba el texto completo. Cierra sesión; la opción deja de aparecer en Ajustes.
7. Con una cuenta antigua creada antes de esta actualización, al iniciar sesión se solicitan los términos una única vez.
8. Comprueba que al confirmar una compra se requiere sesión iniciada y la casilla del checkout sigue siendo obligatoria.

## Consideraciones comerciales y técnicas

- La razón social y el domicilio del ejemplo son datos ficticios proporcionados o autorizados para el proyecto; **no acreditan la existencia legal** de la empresa.
- `memospizza@delicias.com` se muestra como contacto, pero **no se ha verificado que el buzón exista o reciba mensajes**.
- A partir de esta versión, las cuentas y la sesión se almacenan temporalmente en `sessionStorage`; las contraseñas se guardan como derivaciones PBKDF2 con salt, no en texto claro. **Sigue siendo una simulación de autenticación, NO apta para clientes reales**: se necesita backend, base de datos, gestión segura de sesiones y medidas adecuadas de protección de datos.
- La aceptación guardada en `sessionStorage` sirve para demostrar el flujo académico, **no constituye evidencia legal auditada**. Para operación real, registra el consentimiento en un servidor con versión, fecha y prueba de aceptación.
- El módulo de tarjeta, el Tracker CCTV y la facturación aún tienen funciones de demostración y no deben describirse como servicios financieros, seguimiento en vivo o facturación habilitados.
- Los textos comerciales son un borrador para el proyecto y requieren validación fiscal y jurídica antes de su publicación real.
