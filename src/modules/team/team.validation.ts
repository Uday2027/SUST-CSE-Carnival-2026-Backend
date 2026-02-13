import { z } from 'zod';

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
