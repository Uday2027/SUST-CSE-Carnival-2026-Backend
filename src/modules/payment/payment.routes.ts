import { Router } from 'express';
import { validate } from '../../common/middleware/validation.middleware.js';
import { authenticate, requireSuperAdmin } from '../../common/middleware/auth.middleware.js';
import {
  initiatePayment,
  handlePayLater,
  handlePaymentCallback,
  getPayments,
  manualApprovePayment,
  handleDummyPayment,
} from './payment.controller.js';
import { initiatePaymentSchema, manualApprovalSchema, payLaterSchema } from './payment.validation.js';

const router = Router();

// Public/Frontend routes
router.post('/initiate', validate(initiatePaymentSchema), initiatePayment);
router.post('/pay-later', validate(payLaterSchema), handlePayLater);
router.post('/dummy', handleDummyPayment);
router.post('/callback', handlePaymentCallback); // SSLCommerz IPN callback

// Admin routes
router.get('/', authenticate, getPayments);
router.patch('/:id/approve', authenticate, requireSuperAdmin, validate(manualApprovalSchema), manualApprovePayment);

export default router;
