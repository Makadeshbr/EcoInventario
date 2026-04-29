import { createAssetSchema, updateAssetSchema } from '../schemas';

describe('createAssetSchema', () => {
  test('valida payload mínimo válido', () => {
    const result = createAssetSchema.safeParse({
      assetTypeId: '550e8400-e29b-41d4-a716-446655440000',
      latitude: -23.5,
      longitude: -46.6,
    });
    expect(result.success).toBe(true);
  });

  test('valida payload completo', () => {
    const result = createAssetSchema.safeParse({
      assetTypeId: '550e8400-e29b-41d4-a716-446655440000',
      latitude: -23.5,
      longitude: -46.6,
      gpsAccuracyM: 3,
      notes: 'nota de teste com informações completas',
    });
    expect(result.success).toBe(true);
  });

  test('rejeita latitude acima de 90', () => {
    const result = createAssetSchema.safeParse({
      assetTypeId: '550e8400-e29b-41d4-a716-446655440000',
      latitude: 91,
      longitude: 0,
    });
    expect(result.success).toBe(false);
  });

  test('rejeita latitude abaixo de -90', () => {
    const result = createAssetSchema.safeParse({
      assetTypeId: '550e8400-e29b-41d4-a716-446655440000',
      latitude: -91,
      longitude: 0,
    });
    expect(result.success).toBe(false);
  });

  test('rejeita longitude fora do range -180..180', () => {
    const result = createAssetSchema.safeParse({
      assetTypeId: '550e8400-e29b-41d4-a716-446655440000',
      latitude: 0,
      longitude: 181,
    });
    expect(result.success).toBe(false);
  });

  test('rejeita assetTypeId sem formato UUID', () => {
    const result = createAssetSchema.safeParse({
      assetTypeId: 'nao-e-uuid',
      latitude: 0,
      longitude: 0,
    });
    expect(result.success).toBe(false);
  });

  test('notes e gpsAccuracyM são opcionais', () => {
    const result = createAssetSchema.safeParse({
      assetTypeId: '550e8400-e29b-41d4-a716-446655440000',
      latitude: 0,
      longitude: 0,
    });
    expect(result.success).toBe(true);
  });

  test('notas com mais de 2000 chars são rejeitadas', () => {
    const result = createAssetSchema.safeParse({
      assetTypeId: '550e8400-e29b-41d4-a716-446655440000',
      latitude: 0,
      longitude: 0,
      notes: 'a'.repeat(2001),
    });
    expect(result.success).toBe(false);
  });
});

describe('updateAssetSchema', () => {
  test('aceita payload vazio (todos opcionais)', () => {
    expect(updateAssetSchema.safeParse({}).success).toBe(true);
  });

  test('rejeita assetTypeId inválido', () => {
    expect(updateAssetSchema.safeParse({ assetTypeId: 'nao-uuid' }).success).toBe(false);
  });

  test('rejeita notes muito longas', () => {
    expect(
      updateAssetSchema.safeParse({ notes: 'a'.repeat(2001) }).success,
    ).toBe(false);
  });
});
