import { Router } from 'express';
import adminRoutes from '../modules/admin/admin.routes.js';
import teamRoutes from '../modules/team/team.routes.js';
import emailRoutes from '../modules/email/email.routes.js';
import paymentRoutes from '../modules/payment/payment.routes.js';
import pdfRoutes from '../modules/pdf/pdf.routes.js';
import verificationRoutes from '../modules/auth/verification.routes.js';

const router = Router();

/**
 * Main application routes
 */
router.use('/admin', adminRoutes);
router.use('/teams', teamRoutes);
router.use('/email', emailRoutes);
router.use('/payment', paymentRoutes);
router.use('/download', pdfRoutes);
router.use('/auth', verificationRoutes);

export default router;
