import { z } from 'zod';

export const initiatePaymentSchema = z.object({
  teamId: z.string().uuid('Invalid team ID'),
  amount: z.number().positive('Amount must be positive'),
});

export const manualApprovalSchema = z.object({
  note: z.string().min(1, 'Approval note is required'),
});

export type InitiatePaymentInput = z.infer<typeof initiatePaymentSchema>;
export type ManualApprovalInput = z.infer<typeof manualApprovalSchema>;
