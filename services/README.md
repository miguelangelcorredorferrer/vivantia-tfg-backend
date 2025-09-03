# Services

Los servicios contienen la lógica de negocio compleja y las operaciones que requieren procesamiento especializado. Actúan como una capa intermedia entre los controladores y los modelos, encapsulando operaciones que involucran múltiples entidades o requieren lógica específica del dominio de la aplicación.

## Archivos

### `automaticIrrigationService.js`
Servicio que implementa la lógica del riego automático. Analiza las lecturas de sensores, evalúa las condiciones ambientales y toma decisiones sobre cuándo activar las bombas de riego.

### `authAlertService.js`
Gestiona las alertas relacionadas con la autenticación y seguridad. Genera notificaciones sobre intentos de acceso fallidos, cambios de contraseña, inicios de sesión y otros eventos relacionados con el usuario dentro del sistema.

### `cropAlertService.js`
Servicio especializado en alertas relacionadas con cultivos. Genera notificaciones relacionadas con la selección/deselección de cultivos, agregación de nuevos cultivos al sistema y otros eventos relacionados con los cultivos.

### `deviceAlertService.js`
Maneja las alertas relacionadas con dispositivos IoT. Genera notificaciones sobre la activación/desactivación de la comunicación de un dispositivo con la base de datos, agregación de nuevos dispositivos, eliminación de dispositivos y otros eventos relacionados con los dispositivos

### `deviceValidationService.js`
Servicio de validación para dispositivos IoT. Verifica la autenticidad de los dispositivos, valida los datos recibidos y asegura que solo dispositivos autorizados puedan comunicarse con el sistema.

### `environmentalAlertService.js`
Gestiona alertas basadas en condiciones ambientales. Genera notificaciones relacionadas con eventos por condiciones ambientales.

### `irrigationAlertService.js`
Servicio especializado en alertas del sistema de riego. Genera notificaciones relacionadas con los distintos modos de riego de la aplicación, como activación de riego, pausa del riego y otros eventos relacionados con la configuración del riego.

### `sensorReadingService.js`
Servicio especializado en procesar y validar las lecturas de sensores.

### `ttnService.js`
Servicio de comunicación con The Things Network. Maneja la integración con la plataforma TTN, procesa mensajes LoRaWAN y gestiona la comunicación bidireccional con los dispositivos IoT.

### `userService.js`
Servicio de gestión de usuarios. Implementa lógica de negocio para la creación, actualización y gestión de perfiles de usuario.

