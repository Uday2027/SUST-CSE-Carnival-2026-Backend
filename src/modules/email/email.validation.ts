import { z } from 'zod';

export const sendBulkEmailSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Email body is required'),
  filter: z.object({
    type: z.enum(['ALL', 'SEGMENT', 'SELECTED', 'CUSTOM', 'TEAM', 'MEMBER', 'INDIVIDUAL']),
    segment: z.enum(['IUPC', 'HACKATHON', 'DL_ENIGMA_2_0']).optional(),
    teamIds: z.array(z.string()).optional(),
    memberId: z.string().optional(),
    customEmail: z.string().email().optional(),
  }),
});

export type SendBulkEmailInput = z.infer<typeof sendBulkEmailSchema>;
