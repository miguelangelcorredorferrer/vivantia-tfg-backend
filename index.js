import express from "express";
import dotenv from "dotenv";
import colors from "colors";
import cors from "cors";
import { conectarDB } from './config/db.js'
import alertRoutes from './routes/alertRoutes.js'
import authRoutes from './routes/authRoutes.js'
import cropRoutes from './routes/cropRoutes.js'
import deviceRoutes from './routes/deviceRoutes.js'
import irrigationRoutes from './routes/irrigationRoutes.js'
import sensorReadingRoutes from './routes/sensorReadingRoutes.js'
import ttnDownlinkRoutes from './routes/ttnDownlinkRoutes.js'
import ttnUplinkRoutes from './routes/ttnUplinkRoutes.js'
import userRoutes from './routes/userRoutes.js'

//Variables de entorno
dotenv.config()

//configurar la app
const app = express()

//Leer datos via body
app.use(express.json())

// Conectar a BD
conectarDB()

//Configurar CORS
const whiteList = [
    process.env.FRONTEND_URL,
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://vivantia-tfg-frontend.vercel.app',
    'https://vivantia-tfg-frontend.vercel.app/'
]

const corsOptions = {
    origin: (origin, callback) => {
        // Permitir peticiones sin origin (como Postman)
        if (!origin) return callback(null, true);
        
        // En desarrollo, permitir localhost
        if (process.env.NODE_ENV !== 'production') {
            return callback(null, true);
        }
        
        // Verificar si el origin está en la whitelist
        if(whiteList.includes(origin)) {
            //Permite la conexión
            callback(null, true)
        } else {
            // Log para debugging
            console.log('CORS blocked origin:', origin);
            console.log('Allowed origins:', whiteList);
            //No permite la conexión
            callback(new Error("Error de CORS"))
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-access-token']
}

app.use(cors(corsOptions))

//Definir rutas de la API
app.use('/api/alerts', alertRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/crops', cropRoutes)
app.use('/api/devices', deviceRoutes)
app.use('/api/irrigation', irrigationRoutes)
app.use('/api/sensor-readings', sensorReadingRoutes)
app.use('/api/ttn', ttnUplinkRoutes)  // Router de TTN
app.use('/api', ttnDownlinkRoutes)    // Downlinks simples: /api/ttn/led/on|off
app.use('/api/users', userRoutes)

//Definir el puerto
const PORT = process.env.PORT || 3001

//Arrancar la app
app.listen(PORT, () => {
    console.log(colors.blue('El servidor está funcionando en el puerto:'), colors.blue.bold(PORT))
})

