import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import {
  createCrop,
  getCropById,
  getCropByUserId,
  getAllCropsByUserId,
  getAllCrops,
  getAllCropsWithUsers,
  getSelectedCropByUserId,
  getCropCategories,
  updateCrop,
  selectCrop,
  deselectCrop,
  deleteCrop
} from '../controllers/cropController.js';

const router = express.Router();

// Rutas básicas CRUD (requieren autenticación)
router.post('/', authMiddleware, createCrop);
router.get('/', getAllCrops); // Pública para admin
router.get('/with-users', getAllCropsWithUsers); // Para admin con información de usuarios
router.get('/categories', getCropCategories); // Pública
router.get('/:id', authMiddleware, getCropById);
router.put('/:id', authMiddleware, updateCrop);
router.delete('/:id', authMiddleware, deleteCrop);

// Rutas por usuario (requieren autenticación)
router.get('/user/:user_id', authMiddleware, getCropByUserId);
router.get('/user/:user_id/all', authMiddleware, getAllCropsByUserId); // Nueva ruta para todos los cultivos del usuario
router.get('/user/:user_id/selected', authMiddleware, getSelectedCropByUserId);

// Rutas de acciones (requieren autenticación)
router.put('/:id/select', authMiddleware, selectCrop);
router.put('/:id/deselect', authMiddleware, deselectCrop);

export default router;
