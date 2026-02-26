import { Router } from 'express';
import { askQuestion, getPublicFaqs, getAdminFaqs, answerQuestion } from './faq.controller.js';
import { authenticate } from '../../common/middleware/auth.middleware.js';
import { validate } from '../../common/middleware/validation.middleware.js';
import { askQuestionSchema, answerQuestionSchema } from './faq.validation.js';

const router = Router();

// Public routes
router.post('/ask', validate(askQuestionSchema), askQuestion);
router.get('/', getPublicFaqs);

// Admin routes
router.get('/admin', authenticate, getAdminFaqs);
router.post('/admin/:id/answer', authenticate, validate(answerQuestionSchema), answerQuestion);

export default router;
