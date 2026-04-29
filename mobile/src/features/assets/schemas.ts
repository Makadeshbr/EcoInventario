import { z } from 'zod';

export const createAssetSchema = z.object({
  assetTypeId: z.string().uuid('Selecione um tipo de ativo válido'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  gpsAccuracyM: z.number().min(0).max(1000).optional(),
  notes: z.string().max(2000).optional(),
});

export type CreateAssetPayload = z.infer<typeof createAssetSchema>;

export const updateAssetSchema = z.object({
  assetTypeId: z.string().uuid().optional(),
  notes: z.string().max(2000).optional(),
});

export type UpdateAssetPayload = z.infer<typeof updateAssetSchema>;

export const createManejoSchema = z.object({
  description: z.string().min(1, 'A descrição do manejo é obrigatória.').max(2000),
  beforePhotoUri: z.string().optional(),
  afterPhotoUri: z.string().optional(),
});

export type CreateManejoPayload = z.infer<typeof createManejoSchema>;

export const createMonitoramentoSchema = z.object({
  notes: z.string().min(1, 'As notas do monitoramento são obrigatórias.').max(2000),
  healthStatus: z.enum(['healthy', 'warning', 'critical', 'dead'], {
    errorMap: () => ({ message: 'Selecione o estado fitossanitário.' })
  }),
});

export type CreateMonitoramentoPayload = z.infer<typeof createMonitoramentoSchema>;
