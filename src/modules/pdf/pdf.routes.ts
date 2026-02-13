import { Router } from 'express';
import { authenticate } from '../../common/middleware/auth.middleware.js';
import { downloadTeamsPDF } from './pdf.controller.js';

const router = Router();

// Download teams as PDF
router.get('/teams', authenticate, downloadTeamsPDF);

export default router;
