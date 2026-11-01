# Ajuste de confirmación de registro — Memo's Pizza

Al registrar una cuenta y aceptar los Términos y Condiciones, ahora se presenta inmediatamente la pantalla **Iniciar Sesión** con el único mensaje:

> ¡Te has registrado correctamente!

El registro no inicia sesión automáticamente. La cuenta continúa guardándose temporalmente en `sessionStorage`, y se requiere ingresar la contraseña en el formulario de inicio de sesión.

## Archivos modificados
- `src/app/pages/auth/auth.ts`: mensaje simplificado y flujo de transición al formulario de inicio de sesión.

## Ejecución
1. Abrir la carpeta `cambios finales` con Visual Studio Code.
2. Ejecutar `npm ci` (solo si aún no están instaladas las dependencias).
3. Ejecutar `npm start`.
4. Probar con una cuenta nueva. Si el correo ya existe en esta pestaña, registrar otra cuenta o eliminar los datos temporales de prueba.

**Nota:** el almacenamiento de cuentas en `sessionStorage` es exclusivamente para una demostración local. No equivale a un sistema de autenticación de producción.
