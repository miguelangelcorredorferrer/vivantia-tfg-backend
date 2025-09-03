# Middleware

Los middleware son funciones que se ejecutan entre la recepción de una petición HTTP y el envío de la respuesta. Actúan como filtros que pueden modificar, validar o interceptar las peticiones antes de que lleguen a los controladores. Son fundamentales para la seguridad, autenticación y validación de datos.

## Archivos

### `authMiddleware.js`
Middleware de autenticación que verifica la validez de los tokens JWT en las peticiones. Valida que el usuario esté autenticado y tenga los permisos necesarios para acceder a los recursos solicitados. Protege las rutas privadas del sistema.

### `passwordMiddleware.js`
Middleware especializado en la validación y procesamiento de contraseñas. Incluye funciones para verificar la fortaleza de las contraseñas, encriptación y validación de formatos. Asegura que las contraseñas cumplan con los estándares de seguridad del sistema.
