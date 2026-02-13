import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { downloadTeamsPDF } from '../controllers/pdf.controller.js';

const router = Router();

// Download teams as PDF
router.get('/teams', authenticate, downloadTeamsPDF);

export default router;
