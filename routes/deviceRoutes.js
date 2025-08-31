import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import {
  createDevice,
  getDeviceById,
  getDevicesByUserId,
  getDeviceByEndDeviceId,
  getAllDevices,
  getAllDevicesWithUsers,
  getActiveDevices,
  updateDevice,
  activateDevice,
  deactivateDevice,
  deleteDevice,
  getDeviceSensorReadings,
  getDeviceLatestReading,
  checkActiveDevicesForUser,
  createApiKeyCopiedAlert
} from '../controllers/deviceController.js';

const router = express.Router();

// Rutas básicas CRUD (requieren autenticación)
router.post('/', authMiddleware, createDevice);
router.get('/', getAllDevices); // Pública para admin
router.get('/with-users', getAllDevicesWithUsers); // Para admin con información de usuarios
router.get('/:id', authMiddleware, getDeviceById);
router.put('/:id', authMiddleware, updateDevice);
router.delete('/:id', authMiddleware, deleteDevice);

// Rutas por usuario (requieren autenticación)
router.get('/user/:user_id', authMiddleware, getDevicesByUserId);
router.get('/user/:user_id/active', authMiddleware, checkActiveDevicesForUser);

// Rutas por filtros (requieren autenticación)
router.get('/active/all', authMiddleware, getActiveDevices);
router.get('/enddevice/:enddevice_id', authMiddleware, getDeviceByEndDeviceId);

// Rutas de acciones (requieren autenticación)
router.put('/:id/activate', authMiddleware, activateDevice);
router.put('/:id/deactivate', authMiddleware, deactivateDevice);

// Rutas relacionadas con sensores (requieren autenticación)
router.get('/:id/sensor-readings', authMiddleware, getDeviceSensorReadings);
router.get('/:id/latest-reading', authMiddleware, getDeviceLatestReading);

// Rutas relacionadas con alertas (requieren autenticación)
router.post('/api-key-copied', authMiddleware, createApiKeyCopiedAlert);

export default router;