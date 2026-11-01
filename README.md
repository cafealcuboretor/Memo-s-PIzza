# Memo's Pizza — Cambios finales (corregidos)

Proyecto Angular de Memo's Pizza, con menú, carrito, seguimiento de pedidos, políticas comerciales y presentación de Términos y Condiciones durante el registro.

## Requisitos

- Node.js **22.22.3 o superior** (rama 22), o **24.15.0 o superior**.
- npm compatible con esa versión de Node.js.

## Iniciar en Windows / PowerShell

Abre la carpeta `cambios finales` en Visual Studio Code y ejecuta:

```powershell
npm ci
npm start
```

Abre **http://localhost:4200/** en el navegador.

Si ya instalaste dependencias previamente, cierra el servidor con **Ctrl+C** antes de volver a usar `npm start`.

## Qué se corrigió

1. Bootstrap 5.3.8 ahora se entrega dentro de `public/vendor/bootstrap` (CSS y JavaScript); **ya no se intenta importar** `bootstrap/dist/css/bootstrap.min.css` desde un paquete no instalado.
2. El correo visible en el footer y las páginas legales es **memospizza@delicias.com**, como solicitaste. Es un dato ficticio: no se ha verificado que el buzón exista.
3. Se fijaron aprobaciones `allowScripts` para las versiones exactas de cuatro paquetes que npm 11 te mostró como no revisados.
4. Se corrigieron errores de tipado en `src/app/app.ts` y `src/server.ts`, y se retiró un objeto de datos de tarjeta que ya no se utilizaba.

Lee **INSTRUCCIONES_CAMBIOS_FINALES.md** para conocer los límites de seguridad, el procedimiento de auditoría de npm y las advertencias sobre el uso comercial real.

**Nota:** la auditoría de vulnerabilidades de npm requiere consultar el registro en línea; este paquete **no certifica 0 vulnerabilidades**. Se verificó sin errores la compilación de TypeScript y la validación de plantillas de Angular con dependencias locales recuperadas del ZIP original. La CLI de Angular no pudo ejecutar el build completo en este entorno porque aquí se tiene Node.js 22.16.0, inferior al mínimo requerido por Angular 22.

## Novedades: registro, Términos y Ajustes

Consulta **GUIA_ACTUALIZACION_TERMINOS.md**. La aceptación se solicita una sola vez antes de completar el alta de la cuenta (o en el siguiente acceso de usuarios anteriores), y el documento puede revisarse desde **Mi cuenta → Ajustes** al iniciar sesión. Se eliminó el enlace de Términos del pie de página, conservando los demás avisos públicos y la aceptación obligatoria en el carrito.


## Registro temporal (actualización)

El registro ya no inicia sesión por sí mismo. Tras aceptar los Términos, se guarda temporalmente la cuenta, aparece el inicio de sesión y se debe escribir la contraseña manualmente. Los datos duran solo la sesión de la pestaña; no hay base de datos. Las contraseñas nuevas no se almacenan en texto claro. Más información en `CAMBIO_REGISTRO_INICIO_SESION.md`.
