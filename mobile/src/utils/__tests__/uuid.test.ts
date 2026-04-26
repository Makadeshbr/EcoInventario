jest.mock('react-native-get-random-values', () => {});

import { generateUUID } from '../uuid';

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('generateUUID', () => {
  test('retorna string UUID v4 válida', () => {
    expect(generateUUID()).toMatch(UUID_V4_REGEX);
  });

  test('cada chamada retorna UUID único', () => {
    const ids = Array.from({ length: 20 }, () => generateUUID());
    expect(new Set(ids).size).toBe(20);
  });

  test('retorna string (não null/undefined)', () => {
    const id = generateUUID();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });
});
