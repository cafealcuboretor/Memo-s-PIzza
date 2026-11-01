# Memo's Pizza — Corrección del botón de aceptación de términos

## Problema resuelto
Al presionar **ACEPTO Y CREAR MI CUENTA**, la operación de protección de contraseña y almacenamiento temporal finalizaba, pero la ventana de términos podía quedarse visible. Angular 22 usa detección de cambios *zoneless*, y los cambios hechos tras un `await` no siempre actualizan la plantilla automáticamente.

## Qué se corrigió
- Se agregó `ChangeDetectorRef.markForCheck()` tras los procesos asíncronos de **registro**, **inicio de sesión** y **aceptación de términos**.
- El botón ahora muestra **GUARDANDO...** mientras realiza la operación, y se vuelve a habilitar si ocurre un error.
- Al finalizar correctamente, se cierra el modal y se muestra de inmediato el formulario **Iniciar Sesión**.
- El aviso visible es exclusivamente: **¡Te has registrado correctamente!**
- Se completa el correo en la pantalla de inicio de sesión, pero **la contraseña queda vacía**.
- **No se inicia sesión automáticamente**; el usuario debe introducir su contraseña.
- Las cuentas se guardan temporalmente en `sessionStorage` y las nuevas contraseñas se comprueban mediante PBKDF2 en el navegador. No equivale a autenticación segura para un negocio real.

## Archivos modificados
- `src/app/pages/auth/auth.ts`
- `src/app/pages/auth/auth.html`

## Instalar el parche
1. Detén el servidor en PowerShell con `Ctrl + C`.
2. Descomprime el archivo de parche en `C:\Users\berna\OneDrive\Escritorio\`, **no dentro** de `cambios finales`; acepta reemplazar los dos archivos dentro de la carpeta existente.
3. Ejecuta `npm start` desde `cambios finales`.
4. Recarga la tienda con `Ctrl + Shift + R` y registra una cuenta con un correo nuevo.
5. Completa el formulario, abre los términos y pulsa **ACEPTO Y CREAR MI CUENTA**. Debe cerrarse el modal e iniciar la vista de login sin autenticar automáticamente.

Si estás viendo una versión publicada con PWA/service worker y el cambio no aparece tras recargar, abre DevTools (F12) > Application > Service Workers > Unregister. Después recarga. En `npm start` normalmente el service worker está deshabilitado.

## Verificación efectuada
Pruebas con código TypeScript y simulación del flujo: cierre del modal, notificación de detección de cambios, transición a login, ausencia de sesión automática, almacenamiento temporal, contraseñas no almacenadas en texto plano, rechazo de contraseña incorrecta y caducidad al limpiar `sessionStorage`.

La compilación completa de Angular y la ejecución real en el navegador del usuario no pudieron verificarse en este entorno por falta de dependencias y de una versión compatible de Node para Angular 22.
