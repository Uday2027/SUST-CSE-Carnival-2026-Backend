import { Router } from 'express';
import { validate, validateQuery } from '../middleware/validation.middleware.js';
import { authenticate, requireSuperAdmin } from '../middleware/auth.middleware.js';
import {
  registerTeam,
  getTeams,
  getTeamById,
  updateTeamSelection,
  disqualifyTeam,
  updateStanding,
  deleteTeam,
} from '../controllers/team.controller.js';
import {
  teamRegistrationSchema,
  teamSearchSchema,
  updateTeamSelectionSchema,
  disqualifyTeamSchema,
  updateStandingSchema,
} from '../validations/schemas.js';

const router = Router();

// Public route - Team registration
router.post('/register', validate(teamRegistrationSchema), registerTeam);

// Protected routes - Admin only
router.get('/', authenticate, validateQuery(teamSearchSchema), getTeams);
router.get('/:id', authenticate, getTeamById);

// Super admin only routes
router.patch('/:id/selection', authenticate, requireSuperAdmin, validate(updateTeamSelectionSchema), updateTeamSelection);
router.patch('/:id/disqualify', authenticate, requireSuperAdmin, validate(disqualifyTeamSchema), disqualifyTeam);
router.patch('/:id/standing', authenticate, requireSuperAdmin, validate(updateStandingSchema), updateStanding);
router.delete('/:id', authenticate, requireSuperAdmin, deleteTeam);

export default router;
