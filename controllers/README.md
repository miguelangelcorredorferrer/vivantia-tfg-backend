# Controllers

Los controladores son el componente principal de la lógica de negocio de la aplicación. Cada controlador maneja las peticiones HTTP entrantes, procesa los datos y devuelve las respuestas apropiadas. Siguen el patrón MVC (Model-View-Controller) donde actúan como intermediarios entre las rutas y los modelos.

## Archivos

### `authController.js`
Gestiona toda la lógica relacionada con la autenticación de usuarios. Incluye registro, login, logout, verificación de tokens JWT y gestión de sesiones. Es responsable de mantener la seguridad del sistema.

### `alertController.js`
Maneja la creación, actualización y eliminación de alertas del sistema. Procesa las alertas generadas por sensores, dispositivos y condiciones ambientales, proporcionando notificaciones en tiempo real.

### `cropController.js`
Gestiona la información de cultivos, incluyendo su creación, modificación, eliminación y consulta. Maneja los datos de los cultivos asociados a cada usuario y sus configuraciones específicas de riego.

### `deviceController.js`
Controla la gestión de dispositivos IoT del sistema. Incluye el registro de nuevos dispositivos, actualización de su estado de comunicación y configuración del dispositivo.

### `irrigationConfigController.js`
Controla la configuración de los modos de riego. Define parámetros como horarios, duración, condiciones ambientales y lógica de activación de las bombas de riego.

### `pumpActivationController.js`
Gestiona los estados por los que pasa una bomba de riego durante el proceso de riego.

### `sensorReadingController.js`
Procesa las lecturas de los sensores IoT. Recibe, valida y almacena los datos de temperatura y humedad ambiental y humedad del suelo.

### `ttnDownlinkController.js`
Maneja la comunicación descendente o downlink con los dispositivos a través de The Things Network (TTN). Envía ordenes de riego a los dispositivos IoT.

### `ttnWebhookController.js`
Procesa los webhooks recibidos desde TTN. Recibe las actualizaciones de estado y datos de los dispositivos conectados a la red LoRaWAN.

### `userController.js`
Gestiona las operaciones relacionadas con los usuarios del sistema. Incluye creación de perfiles, actualización de información personal y gestión de roles y permisos.

