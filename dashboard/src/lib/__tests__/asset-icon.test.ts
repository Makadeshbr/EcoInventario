import { describe, expect, test } from 'vitest';

import { emojiForAssetType, FALLBACK_EMOJIS } from '../asset-icon';

describe('emojiForAssetType', () => {
  test('mapeia palmeiras (com acento e maiúscula) para 🌴', () => {
    expect(emojiForAssetType('Coqueiro')).toBe('🌴');
    expect(emojiForAssetType('Açaí')).toBe('🌴');
  });

  test('mapeia coníferas para 🌲', () => {
    expect(emojiForAssetType('Pinheiro')).toBe('🌲');
    expect(emojiForAssetType('Araucária')).toBe('🌲');
  });

  test('mapeia floríferas (Ipê) para 🌸', () => {
    expect(emojiForAssetType('Ipê Roxo')).toBe('🌸');
  });

  test('mapeia gramíneas para 🌾', () => {
    expect(emojiForAssetType('Capim-elefante')).toBe('🌾');
  });

  test('nome desconhecido cai num emoji da paleta de fallback', () => {
    expect(FALLBACK_EMOJIS).toContain(emojiForAssetType('Espécie Rara 9000'));
  });

  test('é determinístico: mesmo nome retorna sempre o mesmo emoji', () => {
    expect(emojiForAssetType('Tipo Desconhecido X')).toBe(emojiForAssetType('Tipo Desconhecido X'));
  });

  test('nomes desconhecidos diferentes não retornam todos o mesmo emoji', () => {
    const nomes = ['Alfa', 'Beta', 'Gama', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Teta'];
    expect(new Set(nomes.map(emojiForAssetType)).size).toBeGreaterThan(1);
  });

  test('entrada vazia ou nula não quebra e retorna um emoji válido', () => {
    expect(FALLBACK_EMOJIS).toContain(emojiForAssetType(''));
    expect(FALLBACK_EMOJIS).toContain(emojiForAssetType(null));
    expect(FALLBACK_EMOJIS).toContain(emojiForAssetType(undefined));
  });
});
