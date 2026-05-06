import { z } from 'zod';

import type { LoginResponse } from '@/types/api';

export const loginRequestSchema = z.object({
  email: z.string().email('Informe um e-mail valido').max(255),
  password: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres'),
});

export const backendLoginResponseSchema = z
  .object({
    access_token: z.string().min(1),
    refresh_token: z.string().min(1),
    expires_in: z.number().int().positive(),
    user: z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      email: z.string().email(),
      role: z.enum(['admin', 'tech', 'viewer']),
      organization_id: z.string().min(1),
    }),
  })
  .transform(
    (value): LoginResponse => ({
      accessToken: value.access_token,
      refreshToken: value.refresh_token,
      expiresIn: value.expires_in,
      user: {
        id: value.user.id,
        name: value.user.name,
        email: value.user.email,
        role: value.user.role,
        organizationId: value.user.organization_id,
      },
    }),
  );
