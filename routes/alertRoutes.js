import express from 'express';
import {
  getAlertById,
  resolveAlert,
  resolveAllAlertsByUserId,
  deleteAlert,
  deleteMyOldAlerts,
  getMyAlerts,
  getAllAlertsWithUsers,
  deleteAllSystemAlerts
} from '../controllers/alertController.js';
import { createUserRegisteredAlert } from '../services/authAlertService.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// Aplicar middleware de autenticación a todas las rutas
router.use(authMiddleware);

// Rutas básicas CRUD
router.get('/', getMyAlerts); // Obtener alertas del usuario autenticado
router.delete('/old', deleteMyOldAlerts); // Ruta específica antes de la genérica
router.get('/:id', getAlertById);
router.delete('/:id', deleteAlert);

// Rutas de acciones
router.put('/:id/resolve', resolveAlert);
router.put('/resolve-all', resolveAllAlertsByUserId);

// Rutas para administrador
router.get('/admin/all', getAllAlertsWithUsers);
router.delete('/admin/all', deleteAllSystemAlerts);

// Rutas para crear alertas específicas (uso interno)
router.post('/user-registered', createUserRegisteredAlert);

export default router;
