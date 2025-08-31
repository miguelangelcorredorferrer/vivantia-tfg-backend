import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'vivantia',
    user: 'postgres',
    password: 'root',
    connectionTimeoutMillis: 10000, // 10 segundos
    // Configuración de zona horaria
    options: '-c timezone=Europe/Madrid',
    // SSL solo en producción, no en desarrollo local
    ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false
    } : false
});

// Función para probar la conexión
const conectarDB = async () => {
    try {
        const client = await pool.connect();
        console.log('✅ Base de datos conectada correctamente');
        client.release();
    } catch (error) {
        console.error('❌ Error al conectar la base de datos:', error.message);
        process.exit(1);
    }
};

export { pool, conectarDB };
