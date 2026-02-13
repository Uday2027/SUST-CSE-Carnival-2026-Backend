import { Router } from 'express';
import { validate } from '../middleware/validation.middleware.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { sendBulkEmail, getEmailLogs } from '../controllers/email.controller.js';
import { sendBulkEmailSchema } from '../validations/schemas.js';

const router = Router();

// All routes require authentication
router.post('/send-bulk', authenticate, validate(sendBulkEmailSchema), sendBulkEmail);
router.get('/logs', authenticate, getEmailLogs);

export default router;
