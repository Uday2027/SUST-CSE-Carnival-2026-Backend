import { z } from 'zod';

// =======================
// Admin Schemas
// =======================

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const createAdminSchema = z.object({
  email: z.string().email('Invalid email format'),
  scopes: z.array(z.enum(['IUPC', 'HACKATHON', 'DL_ENIGMA_2_0'])).min(1, 'At least one scope is required'),
});

// =======================
// Team Registration Schema
// =======================

export const memberSchema = z.object({
  name: z.string().min(1, 'Member name is required'),
  email: z.string().email('Invalid email format'),
  phone: z.string().min(10, 'Phone number must be at least 10 characters'),
  tshirtSize: z.enum(['S', 'M', 'L', 'XL', 'XXL']),
  universityName: z.string().min(1, 'University name is required'),
});

export const teamRegistrationSchema = z.object({
  teamName: z.string().min(1, 'Team name is required'),
  segment: z.enum(['IUPC', 'HACKATHON', 'DL_ENIGMA_2_0']),
  members: z.array(memberSchema).min(1, 'At least one member is required').max(3, 'Maximum 3 members allowed'),
});

// =======================
// Team Management Schemas
// =======================

export const updateTeamSelectionSchema = z.object({
  isSelected: z.boolean(),
});

export const disqualifyTeamSchema = z.object({
  isDisqualified: z.boolean(),
  reason: z.string().optional(),
});

export const updateStandingSchema = z.object({
  standing: z.enum(['NONE', 'WINNER', 'FIRST_RUNNER_UP', 'SECOND_RUNNER_UP']),
});

export const teamSearchSchema = z.object({
  segment: z.enum(['IUPC', 'HACKATHON', 'DL_ENIGMA_2_0']).optional(),
  isSelected: z.boolean().optional(),
  search: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
});

// =======================
// Email Schemas
// =======================

export const sendBulkEmailSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Email body is required'),
  filter: z.object({
    type: z.enum(['ALL', 'SEGMENT', 'SELECTED', 'CUSTOM']),
    segment: z.enum(['IUPC', 'HACKATHON', 'DL_ENIGMA_2_0']).optional(),
    teamIds: z.array(z.string()).optional(),
  }),
});

// =======================
// Payment Schemas
// =======================

export const initiatePaymentSchema = z.object({
  teamId: z.string().uuid('Invalid team ID'),
  amount: z.number().positive('Amount must be positive'),
});

export const manualApprovalSchema = z.object({
  note: z.string().min(1, 'Approval note is required'),
});

// Type exports
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateAdminInput = z.infer<typeof createAdminSchema>;
export type TeamRegistrationInput = z.infer<typeof teamRegistrationSchema>;
export type UpdateTeamSelectionInput = z.infer<typeof updateTeamSelectionSchema>;
export type DisqualifyTeamInput = z.infer<typeof disqualifyTeamSchema>;
export type UpdateStandingInput = z.infer<typeof updateStandingSchema>;
export type TeamSearchInput = z.infer<typeof teamSearchSchema>;
export type SendBulkEmailInput = z.infer<typeof sendBulkEmailSchema>;
export type InitiatePaymentInput = z.infer<typeof initiatePaymentSchema>;
export type ManualApprovalInput = z.infer<typeof manualApprovalSchema>;
