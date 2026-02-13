import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const createAdminSchema = z.object({
  email: z.string().email('Invalid email format'),
  scopes: z.array(z.enum(['IUPC', 'HACKATHON', 'DL_ENIGMA_2_0'])).min(1, 'At least one scope is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateAdminInput = z.infer<typeof createAdminSchema>;
export type UpdateAdminInput = z.infer<typeof updateAdminSchema>;

export const updateAdminSchema = z.object({
  scopes: z.array(z.enum(['IUPC', 'HACKATHON', 'DL_ENIGMA_2_0'])).min(1, 'At least one scope is required'),
  status: z.enum(['ACTIVE', 'SUSPENDED']).optional(),
});
