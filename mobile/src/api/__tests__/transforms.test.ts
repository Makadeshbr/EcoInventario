import { toCamelCase, toSnakeCase } from '../transforms';

describe('toCamelCase', () => {
  test('converte snake_case simples para camelCase', () => {
    const result = toCamelCase<{ assetTypeId: string; isSynced: boolean }>({
      asset_type_id: '1',
      is_synced: true,
    });
    expect(result).toEqual({ assetTypeId: '1', isSynced: true });
  });

  test('converte objetos aninhados recursivamente', () => {
    const result = toCamelCase<{ createdBy: { userId: string; userName: string } }>({
      created_by: { user_id: 'u-1', user_name: 'João' },
    });
    expect(result).toEqual({ createdBy: { userId: 'u-1', userName: 'João' } });
  });

  test('não modifica arrays (passados como valor)', () => {
    const result = toCamelCase<{ tagList: string[] }>({ tag_list: ['a', 'b', 'c'] });
    expect(result).toEqual({ tagList: ['a', 'b', 'c'] });
  });

  test('mantém null sem modificar', () => {
    const result = toCamelCase<{ rejectionReason: null }>({ rejection_reason: null });
    expect(result).toEqual({ rejectionReason: null });
  });

  test('chaves sem underscore permanecem iguais', () => {
    const result = toCamelCase<{ id: string; name: string }>({ id: '1', name: 'Árvore' });
    expect(result).toEqual({ id: '1', name: 'Árvore' });
  });

  test('converte múltiplos underscores', () => {
    const result = toCamelCase<{ gpsAccuracyM: number }>({ gps_accuracy_m: 4.5 });
    expect(result).toEqual({ gpsAccuracyM: 4.5 });
  });
});

describe('toSnakeCase', () => {
  test('converte camelCase simples para snake_case', () => {
    const result = toSnakeCase({ assetTypeId: '1', isSynced: true });
    expect(result).toEqual({ asset_type_id: '1', is_synced: true });
  });

  test('converte objetos aninhados recursivamente', () => {
    const result = toSnakeCase({ createdBy: { userId: 'u-1', userName: 'João' } });
    expect(result).toEqual({ created_by: { user_id: 'u-1', user_name: 'João' } });
  });

  test('não modifica arrays (passados como valor)', () => {
    const result = toSnakeCase({ tagList: ['a', 'b', 'c'] });
    expect(result).toEqual({ tag_list: ['a', 'b', 'c'] });
  });

  test('chaves já em snake_case permanecem iguais', () => {
    const result = toSnakeCase({ id: '1', name: 'Nascente' });
    expect(result).toEqual({ id: '1', name: 'Nascente' });
  });

  test('round-trip: toSnakeCase → toCamelCase retorna original', () => {
    const original = { assetTypeId: 'at-1', gpsAccuracyM: 4.5, isSynced: false };
    const snake = toSnakeCase(original as Record<string, unknown>);
    const back = toCamelCase<typeof original>(snake);
    expect(back).toEqual(original);
  });
});
