# Routes

Las rutas definen los endpoints de la API REST y establecen la correspondencia entre las peticiones HTTP y los controladores que las manejan. Cada archivo de rutas agrupa endpoints relacionados con una funcionalidad específica del sistema, proporcionando una estructura organizada y mantenible.

## Archivos

### `alertRoutes.js`
Define los endpoints para la gestión de alertas. Incluye rutas para crear, consultar, actualizar y eliminar alertas del sistema.

### `authRoutes.js`
Contiene las rutas de autenticación y autorización. Define endpoints para registro de usuarios, login, logout, verificación de tokens y gestión de sesiones. Es fundamental para la seguridad del sistema.

### `cropRoutes.js`
Gestiona las rutas relacionadas con los cultivos. Incluye endpoints para crear, modificar, eliminar y consultar información de cultivos, así como configuraciones específicas de riego para cada tipo de cultivo.

### `deviceRoutes.js`
Define los endpoints para la gestión de dispositivos IoT. Maneja el registro de nuevos dispositivos, actualización de configuraciones, consulta de estado de estado de comunicación y monitoreo de dispositivos registrados en el sistema.

### `irrigationRoutes.js`
Contiene las rutas para la configuración y control de los distintos modos de riego. Incluye endpoints para definir parámetros de riego automático, programar horarios y consultar el historial de activaciones.

### `sensorReadingRoutes.js`
Gestiona las rutas para las lecturas de sensores. Define endpoints para recibir datos de sensores.

### `ttnDownlinkRoutes.js`
Define las rutas para la comunicación descendente o dowlink con dispositivos a través de TTN. Maneja el envío de comandos y configuraciones a los dispositivos IoT conectados a la red LoRaWAN.

### `ttnUplinkRoutes.js`
Contiene el endpoint al que TTN hará HTTP POST para mandar los datos de los sensores al servidor web.

### `userRoutes.js`
Gestiona las rutas relacionadas con los usuarios del sistema. Incluye endpoints para actualizar perfiles de usuario, gestionar roles y permisos, y consultar información de usuarios.

