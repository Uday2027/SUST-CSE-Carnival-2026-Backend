import { z } from 'zod';

// Simpler email validation regex to avoid false negatives
const simpleEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const memberSchema = z.object({
  name: z.string().min(1, 'Member name is required').max(100, 'Name is too long'),
  email: z.string()
    .min(1, 'Email is required')
    .regex(simpleEmailRegex, 'Please enter a valid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 characters').max(15, 'Phone number is too long'),
  tshirtSize: z.enum(['S', 'M', 'L', 'XL', 'XXL'], { errorMap: () => ({ message: 'Please select a valid T-shirt size' }) }),
  universityName: z.string().min(1, 'University name is required').max(200, 'University name is too long'),
});

export const teamRegistrationSchema = z.object({
  teamName: z.string().min(1, 'Team name is required'),
  segment: z.enum(['IUPC', 'HACKATHON', 'DL_ENIGMA_2_0']),
  members: z.array(memberSchema).min(1, 'At least one member is required').max(3, 'Maximum 3 members allowed'),
});

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

export type TeamRegistrationInput = z.infer<typeof teamRegistrationSchema>;
export type UpdateTeamSelectionInput = z.infer<typeof updateTeamSelectionSchema>;
export type DisqualifyTeamInput = z.infer<typeof disqualifyTeamSchema>;
export type UpdateStandingInput = z.infer<typeof updateStandingSchema>;
export type TeamSearchInput = z.infer<typeof teamSearchSchema>;
