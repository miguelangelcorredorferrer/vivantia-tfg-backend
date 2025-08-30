import pkg from 'pg';
import dotenv from 'dotenv';
const { Pool } = pkg;

// Cargar variables de entorno
dotenv.config();

// Configuración para diferentes entornos
const config = {
    // Configuración local (para pruebas)
    local: {
        host: 'localhost',
        port: 5432,
        database: 'vivantia',
        user: 'postgres',
        password: 'root',
        connectionTimeoutMillis: 10000,
        options: '-c timezone=Europe/Madrid',
        ssl: false
    },
    
    // Configuración Railway (PostgreSQL en la nube)
    railway: {
        host: 'switchyard.proxy.rlwy.net',
        port: 18286,
        database: 'railway',
        user: 'postgres',
        password: 'AGfqUZjodjzplVioNhsYnpnDUrqFKcvo',
        connectionTimeoutMillis: 10000,
        options: '-c timezone=Europe/Madrid',
        ssl: {
            rejectUnauthorized: false
        }
    }
};

// Determinar qué configuración usar
const useRailway = process.env.USE_RAILWAY === 'true' || process.env.NODE_ENV === 'production';

// Debug: mostrar qué configuración se está usando
console.log('🔧 Configuración de base de datos:');
console.log('USE_RAILWAY env:', process.env.USE_RAILWAY);
console.log('NODE_ENV env:', process.env.NODE_ENV);
console.log('useRailway calculado:', useRailway);
console.log('Configuración seleccionada:', useRailway ? 'Railway' : 'Local');

const pool = new Pool(useRailway ? config.railway : config.local);

// Función para probar la conexión
const conectarDB = async () => {
    try {
        const client = await pool.connect();
        console.log(`✅ Base de datos conectada correctamente (${useRailway ? 'Railway' : 'Local'})`);
        client.release();
    } catch (error) {
        console.error('❌ Error al conectar la base de datos:', error.message);
        process.exit(1);
    }
};

export { pool, conectarDB };
