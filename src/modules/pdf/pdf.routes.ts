import { Router } from 'express';
import { authenticate } from '../../common/middleware/auth.middleware.js';
import { downloadTeamsPDF, downloadReceipt } from './pdf.controller.js';

const router = Router();

// Download teams as PDF
router.get('/teams', authenticate, downloadTeamsPDF);
router.get('/receipt/:teamId', downloadReceipt);

export default router;
