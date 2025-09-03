# Models

Los modelos definen la estructura de datos de la aplicación y representan las tablas de la base de datos. Utilizan Sequelize como ORM (Object-Relational Mapping) para facilitar la interacción con PostgreSQL. Cada modelo define las propiedades, relaciones y validaciones de los datos que maneja el sistema.

## Archivos

### `Alert.js`
Modelo que representa las alertas del sistema. Define la estructura para almacenar notificaciones sobre eventos importantes como fallos de dispositivos, condiciones ambientales críticas o configuraciones de riego.

### `Crop.js`
Modelo para la gestión de cultivos. Define las propiedades de cada cultivo como nombre, tipo, fechas de plantación y cosecha, y configuraciones específicas de riego.

### `Device.js`
Modelo que representa los dispositivos IoT del sistema. Define propiedades relacionadas con la configuración del dispositivo en TTN.

### `IrrigationConfig.js`
Modelo para las configuraciones de los modos de riego del sistema. Define parámetros como horarios, duración de riego, umbrales de humedad y condiciones ambientales que activan el sistema de riego para los distintos modos de operación.

### `PumpActivation.js`
Modelo que registra los estados de la bomba de riego. Almacena información sobre el estado de la bomba, fecha en el que cambio de estado y otros parámetros de interés.

### `SensorReading.js`
Modelo para las lecturas de los sensores IoT. Define la estructura de datos para almacenar mediciones de temperatura y humedad ambiental y humedad del suelo

### `User.js`
Modelo que representa a los usuarios del sistema. Define propiedades como credenciales de acceso, información personal y roles. Es la base del sistema de autenticación y autorización.

### `index.js`
Archivo de configuración principal de Sequelize. Define la conexión a la base de datos, configuración de modelos y establece las relaciones entre las diferentes entidades del sistema.

