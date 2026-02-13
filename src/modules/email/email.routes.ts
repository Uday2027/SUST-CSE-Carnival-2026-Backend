import { Router } from 'express';
import { validate } from '../../common/middleware/validation.middleware.js';
import { authenticate } from '../../common/middleware/auth.middleware.js';
import { sendBulkEmail, getEmailLogs } from './email.controller.js';
import { sendBulkEmailSchema } from './email.validation.js';

const router = Router();

// All routes require authentication
router.post('/send-bulk', authenticate, validate(sendBulkEmailSchema), sendBulkEmail);
router.get('/logs', authenticate, getEmailLogs);

export default router;
