import { Router } from 'express';
import { validate } from '../../common/middleware/validation.middleware.js';
import { authenticate } from '../../common/middleware/auth.middleware.js';
import { sendBulkEmail, sendSingleEmail, getEmailLogs } from './email.controller.js';
import { sendBulkEmailSchema, sendSingleEmailSchema } from './email.validation.js';

const router = Router();

// All routes require authentication
router.post('/send-bulk', authenticate, validate(sendBulkEmailSchema), sendBulkEmail);
router.post('/send-single', authenticate, validate(sendSingleEmailSchema), sendSingleEmail);
router.get('/logs', authenticate, getEmailLogs);

export default router;
