# CAMBIOS FINALES — Memo’s Pizza

## Cómo ejecutar
1. Instalar Node.js 22.22.3 o superior en la rama 22, o Node.js 24.15.0 o superior (versiones compatibles con Angular 22).
2. Abrir una terminal en esta carpeta.
3. Ejecutar `npm install` y luego `npm start`.
4. Abrir http://localhost:4200/.

El entorno de generación no tiene acceso al registro de npm y su versión local de Node.js es anterior a la mínima exigida por Angular 22. Instala las dependencias y verifica la compilación en tu PC usando los pasos de abajo; no se afirma que se hayan resuelto todas las alertas del auditor de npm.

## Cambios de blindaje legal incluidos
- Siete páginas legales accesibles desde el footer en `/legal/...`.
- Datos **ficticios**: Memo’s Pizza Entretenimiento y Alimentos, S.A. de C.V., Av. Principal núm. 1987, Nuevo Laredo, y teléfono 55-202-1983.
- Contacto solicitado `memospizza@delicias.com` enlazado desde el pie de página y la sección legal. Su formato es válido, pero es un correo **ficticio/no verificado**; un dominio con extensión `.com` no garantiza que exista una bandeja activa.
- Aceptación explícita en modal de pedido; por defecto desmarcada.
- Eliminación de captura de número de tarjeta, fecha de caducidad y CVV. No se efectúan pagos reales.
- Banner de preferencias de cookies que guarda la elección localmente.

## Pendiente para uso comercial real
- El registro original aún almacena las contraseñas sin seguridad suficiente en `localStorage`. **No utilizar datos reales de personas ni contraseñas reutilizadas.** Se requiere backend, autenticación y base de datos segura.
- No hay pasarela real, CFDI, correo operativo, sistema de quejas ni pruebas de seguridad. La casilla de aceptación y el banner son prototipos de interfaz.
- Verificar permisos de imágenes, música y referencias a franquicias ajenas.
- Revisar con profesional las políticas y la aplicabilidad de las reglas de devoluciones antes de vender.

Versión académica de demostración, no acreditación de cumplimiento legal.

## Correcciones de ejecución (29 de octubre de 2026)
- Se corrigió el error `Could not resolve bootstrap/dist/css/bootstrap.min.css`: Bootstrap **5.3.8** (CSS y `bootstrap.bundle.min.js`) ahora está guardado de forma local en `public/vendor/bootstrap/` con su licencia MIT. Se quitó el import de `node_modules` en `angular.json` y se reemplazó el CDN en `src/index.html`. **No es necesario ejecutar `npm install bootstrap`** para esta versión.
- Se agregó `allowScripts` con aprobaciones por versión para los cuatro paquetes identificados en tu registro de instalación (dependencias conocidas de la cadena de compilación). Esto evita el aviso por *scripts sin revisar* si usas las versiones exactas del lock. Si versiones cambian, revisa con `npm install-scripts ls` antes de aprobar nuevas.
- El correo ahora es `memospizza@delicias.com`; la dirección tiene formato válido, pero la bandeja de correo **no ha sido creada ni comprobada**.

### Instalación desde cero en PowerShell
```powershell
cd 'C:\Users\berna\OneDrive\Escritorio\cambios finales'
node -v
npm -v
npm ci
npm start
```
Abrir http://localhost:4200/. Si no hay dependencias en caché, `npm ci` requiere conexión a Internet. Si `npm ci` rechaza una modificación local, borra la carpeta `node_modules` y vuelve a ejecutarlo.

### Auditoría de vulnerabilidades (pendiente de verificar en tu PC)
El reporte de 20 vulnerabilidades proviene de tu instalación anterior. **No se ha confirmado su resolución**: en este entorno el registro de npm no está accesible. Una vez instaladas las dependencias, consulta el detalle con:
```powershell
npm audit
npm audit --omit=dev
npm audit fix
npm run build
```
`npm audit fix` puede actualizar paquetes compatibles y modificar `package-lock.json`. Revisa y prueba los cambios. Evita `npm audit fix --force` sin inspeccionar los cambios mayores que propone.

### Referencias de licencia
Los archivos `public/vendor/bootstrap/` fueron tomados de la copia de Bootstrap 5.3.8 que ya venía dentro de tu `contexto.zip`; son recursos de terceros sujetos a la licencia MIT incluida en `LICENSE.txt`.

## Nueva interfaz de Términos y Condiciones

Ver `GUIA_ACTUALIZACION_TERMINOS.md` para el nuevo flujo de registro, aceptación, página de Ajustes, requisito de cuenta para confirmar pedidos y consideraciones legales.


## Registro manual y cuentas temporales

El registro guarda la cuenta temporalmente en `sessionStorage` y lleva al formulario de inicio de sesión sin autenticar al usuario. Allí debe escribir su contraseña. El apartado completo se documenta en `CAMBIO_REGISTRO_INICIO_SESION.md`.
