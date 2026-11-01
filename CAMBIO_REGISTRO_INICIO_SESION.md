# Memo's Pizza — registro temporal e inicio de sesión manual

## Cambio solicitado (noviembre de 2026)

El registro **ya no inicia sesión automáticamente** ni redirige al inicio de la tienda.

1. En **Iniciar sesión → Regístrate aquí**, llena nombre, correo y contraseña.
2. Pulsa **Continuar registro**.
3. Lee los Términos y Condiciones y marca la casilla obligatoria.
4. Pulsa **Acepto y crear mi cuenta**. Se guarda la cuenta y se muestra el formulario **Iniciar sesión**, con el correo ya escrito y la contraseña vacía.
5. **Escribe nuevamente la contraseña** y pulsa **Entrar a mi cuenta**. Solo entonces se inicia sesión y puedes consultar los términos en **Mi cuenta → Ajustes**.
6. Al cerrar sesión, puedes volver a ingresar mientras permanezca abierta la sesión de esa pestaña.

## ¿En dónde se guarda la cuenta?

- Se utiliza **sessionStorage**, sin base de datos: permanece durante la sesión de la pestaña y normalmente se borra cuando se cierra la pestaña o ventana. Una recarga dentro de la misma pestaña no la elimina.
- No se guarda la contraseña literal: se guarda una derivación PBKDF2 con salt aleatoria. **Esto solo mejora la demostración local y NO constituye un sistema de autenticación seguro**: el visitante puede manipular el almacenamiento en su propio navegador. No uses contraseñas reales ni datos personales sensibles.
- Las cuentas anteriores que estaban en `localStorage` se migran automáticamente al abrir registro o login, se convierten al formato temporal y se eliminan del almacenamiento antiguo, si la migración fue exitosa.
- No se guarda una sesión iniciada automáticamente después de registrar a un usuario. La sesión autenticada se almacena también en `sessionStorage` y no incluye contraseñas.

## Archivos modificados

- `src/app/pages/auth/auth.ts`: flujo registro → consentimiento → formulario login; derivación de contraseña; migración de usuarios antiguos.
- `src/app/pages/auth/auth.html`: aviso de éxito y errores del registro.
- `src/app/shared/header/header.ts`: estado de sesión temporal para la navegación.
- `src/app/pages/settings/settings.ts`: lectura/cierre de la sesión actual.
- `src/app/pages/cart/cart.ts`: verificación de aceptación de términos con la sesión temporal.

Se mantienen la temática, el carrito, el menú, las promociones, las páginas legales, el tracker y los estilos.

## Ejecutarlo en Windows

En PowerShell, desde la carpeta `cambios finales`:

```powershell
npm ci
npm start
```

Visita `http://localhost:4200/`. Si ya tenías `node_modules`, puedes intentar directamente `npm start`. Usa una versión de Node compatible con Angular 22.

### Prueba sugerida

1. Registra una cuenta de demostración y acepta los términos.
2. Verifica que NO aparece "Mi cuenta" y que sigues viendo la pantalla de login.
3. Intenta entrar con una contraseña equivocada: debe mostrar error.
4. Entra con la contraseña correcta: debe abrir sesión y mostrar "Mi cuenta".
5. Cierra sesión en Ajustes y vuelve a iniciar sesión con el mismo usuario.
6. Cierra la pestaña, abre otra, e intenta ingresar: deberá indicarte que la cuenta temporal ya no existe.

**Limitación:** esta implementación es para pruebas locales. Para recibir pedidos reales y autenticar clientes se necesita un servidor y una base de datos con controles de seguridad.
