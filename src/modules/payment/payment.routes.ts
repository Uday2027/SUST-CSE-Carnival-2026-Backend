import { Router } from 'express';
import { validate } from '../../common/middleware/validation.middleware.js';
import { authenticate, requireSuperAdmin } from '../../common/middleware/auth.middleware.js';
import {
  initiatePayment,
  handlePaymentCallback,
  getPayments,
  manualApprovePayment,
} from './payment.controller.js';
import { initiatePaymentSchema, manualApprovalSchema } from './payment.validation.js';

const router = Router();

// Public/Frontend routes
router.post('/initiate', validate(initiatePaymentSchema), initiatePayment);
router.post('/callback', handlePaymentCallback); // SSLCommerz IPN callback

// Admin routes
router.get('/', authenticate, getPayments);
router.patch('/:id/approve', authenticate, requireSuperAdmin, validate(manualApprovalSchema), manualApprovePayment);

export default router;
