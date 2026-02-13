import { Router } from 'express';
import { validate } from '../middleware/validation.middleware.js';
import { authenticate, requireSuperAdmin } from '../middleware/auth.middleware.js';
import {
  login,
  createAdmin,
  getAdmins,
  deleteAdmin,
  getMe,
} from '../controllers/admin.controller.js';
import { loginSchema, createAdminSchema } from '../validations/schemas.js';

const router = Router();

// Public routes
router.post('/login', validate(loginSchema), login);

// Protected routes (require authentication)
router.get('/me', authenticate, getMe);

// Super admin only routes
router.post('/', authenticate, requireSuperAdmin, validate(createAdminSchema), createAdmin);
router.get('/', authenticate, requireSuperAdmin, getAdmins);
router.delete('/:id', authenticate, requireSuperAdmin, deleteAdmin);

export default router;
