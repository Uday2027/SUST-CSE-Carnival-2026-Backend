import { Router } from 'express';
import { validate } from '../../common/middleware/validation.middleware.js';
import { authenticate, requireSuperAdmin } from '../../common/middleware/auth.middleware.js';
import {
  login,
  createAdmin,
  updateAdmin,
  getAdmins,
  deleteAdmin,
  getMe,
  getDashboardStats,
  exportTeamsCSV,
  getDeadlines,
  upsertDeadline,
} from './admin.controller.js';
import { loginSchema, createAdminSchema, updateAdminSchema } from './admin.validation.js';

const router = Router();

// Public routes
router.post('/login', validate(loginSchema), login);

// Protected routes (require authentication)
router.get('/me', authenticate, getMe);
router.get('/dashboard/stats', authenticate, getDashboardStats);
router.get('/export/csv', authenticate, exportTeamsCSV);
router.get('/deadlines', authenticate, getDeadlines);

// Super admin only routes
router.post('/', authenticate, requireSuperAdmin, validate(createAdminSchema), createAdmin);
router.patch('/:id', authenticate, requireSuperAdmin, validate(updateAdminSchema), updateAdmin);
router.get('/', authenticate, requireSuperAdmin, getAdmins);
router.delete('/:id', authenticate, requireSuperAdmin, deleteAdmin);
router.put('/deadlines', authenticate, requireSuperAdmin, upsertDeadline);

export default router;
