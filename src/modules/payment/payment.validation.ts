import { z } from 'zod';

export const initiatePaymentSchema = z.object({
  uniqueId: z.string().uuid('Invalid team unique ID'),
});

export const payLaterSchema = z.object({
  uniqueId: z.string().uuid('Invalid team unique ID'),
});

export const manualApprovalSchema = z.object({
  note: z.string().min(1, 'Approval note is required'),
});

export type InitiatePaymentInput = z.infer<typeof initiatePaymentSchema>;
export type PayLaterInput = z.infer<typeof payLaterSchema>;
export type ManualApprovalInput = z.infer<typeof manualApprovalSchema>;
