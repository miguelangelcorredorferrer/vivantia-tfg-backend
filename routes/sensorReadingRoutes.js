import express from 'express';
import {
  createSensorReading,
  getSensorReadingsByDeviceId,
  getSensorReadingsByDateRange,
  getLatestSensorReadingByDeviceId,
  getSensorReadingsOutOfThreshold,
  deleteSensorReading,
  getLatestSensorReadingForActiveDevice
} from '../controllers/sensorReadingController.js';

const router = express.Router();

// Rutas básicas CRUD
router.post('/', createSensorReading);
router.delete('/:id', deleteSensorReading);

// Rutas por dispositivo
router.get('/device/:device_id', getSensorReadingsByDeviceId);
router.get('/device/:device_id/latest', getLatestSensorReadingByDeviceId);

// Ruta para obtener último dato del dispositivo activo del usuario
router.get('/user/:user_id/active-device/latest', getLatestSensorReadingForActiveDevice);

// Rutas por filtros y rangos
router.get('/date-range/:start_date/:end_date', getSensorReadingsByDateRange);
router.get('/threshold/out-of-range', getSensorReadingsOutOfThreshold);


export default router;
