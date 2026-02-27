import { Router } from 'express';
import { validate, validateQuery } from '../../common/middleware/validation.middleware.js';
import { authenticate, requireSuperAdmin } from '../../common/middleware/auth.middleware.js';
import {
  registerTeam,
  getTeams,
  getTeamById,
  getTeamByUniqueId,
  updateTeamSelection,
  disqualifyTeam,
  updateStanding,
  deleteTeam,
  getPublicDeadlines,
  updateTeam,
} from './team.controller.js';
import {
  teamRegistrationSchema,
  teamSearchSchema,
  updateTeamSelectionSchema,
  disqualifyTeamSchema,
  updateStandingSchema,
  updateTeamSchema,
} from './team.validation.js';

const router = Router();

// Public routes
router.post('/register', validate(teamRegistrationSchema), registerTeam);
router.get('/by-unique-id/:uniqueId', getTeamByUniqueId);
router.get('/deadlines', getPublicDeadlines);

// Protected routes - Admin only
router.get('/', authenticate, validateQuery(teamSearchSchema), getTeams);
router.get('/:id', authenticate, getTeamById);

// Super admin only routes
router.patch('/:id/selection', authenticate, requireSuperAdmin, validate(updateTeamSelectionSchema), updateTeamSelection);
router.patch('/:id/disqualify', authenticate, requireSuperAdmin, validate(disqualifyTeamSchema), disqualifyTeam);
router.patch('/:id/standing', authenticate, requireSuperAdmin, validate(updateStandingSchema), updateStanding);
router.patch('/:id', authenticate, requireSuperAdmin, validate(updateTeamSchema), updateTeam);
router.delete('/:id', authenticate, requireSuperAdmin, deleteTeam);

export default router;
