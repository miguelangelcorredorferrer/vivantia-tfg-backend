import express from 'express';
import { handleTTNUplink } from '../controllers/ttnWebhookController.js';

const router = express.Router();

// Ruta para recibir datos de TTN uplink
router.post('/uplink', handleTTNUplink);

// Futuras rutas de TTN pueden ir aquí
// router.post('/downlink', handleTTNDownlink);
// router.get('/devices', getTTNDevices);

export default router; 