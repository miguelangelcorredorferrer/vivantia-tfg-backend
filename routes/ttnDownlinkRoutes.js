import express from 'express';
import { sendOnCommand, sendOffCommand } from '../controllers/ttnDownlinkController.js';

const router = express.Router();

// Rutas simples para pruebas manuales de downlink
router.post('/ttn/led/on', sendOnCommand);
router.post('/ttn/led/off', sendOffCommand);

export default router;


