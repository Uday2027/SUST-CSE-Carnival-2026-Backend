import { Router } from 'express';
import { validate } from '../../common/middleware/validation.middleware.js';
import { requestOTP, verifyOTP } from './verification.controller.js';
import { requestOtpSchema, verifyOtpSchema } from './verification.validation.js';

const router = Router();

router.post('/request-otp', validate(requestOtpSchema), requestOTP);
router.post('/verify-otp', validate(verifyOtpSchema), verifyOTP);

export default router;
