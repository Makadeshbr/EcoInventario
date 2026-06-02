import { iconForAssetType, FALLBACK_ICONS } from '../asset-icon';

describe('iconForAssetType', () => {
  test('mapeia floríferas (Ipê, com acento e maiúscula) para flor', () => {
    expect(iconForAssetType('Ipê Amarelo')).toBe('local-florist');
    expect(iconForAssetType('jacaranda')).toBe('local-florist');
  });

  test('mapeia coníferas para floresta', () => {
    expect(iconForAssetType('Pinheiro')).toBe('forest');
    expect(iconForAssetType('Araucária')).toBe('forest');
  });

  test('mapeia gramíneas para grama', () => {
    expect(iconForAssetType('Capim-elefante')).toBe('grass');
    expect(iconForAssetType('Bambu')).toBe('grass');
  });

  test('mapeia frutíferas e palmeiras para agricultura', () => {
    expect(iconForAssetType('Mangueira')).toBe('agriculture');
    expect(iconForAssetType('Coqueiro')).toBe('agriculture');
  });

  test('nome desconhecido cai num ícone da paleta de fallback', () => {
    expect(FALLBACK_ICONS).toContain(iconForAssetType('Espécie Rara 9000'));
  });

  test('é determinístico: mesmo nome retorna sempre o mesmo ícone', () => {
    const a = iconForAssetType('Tipo Desconhecido X');
    const b = iconForAssetType('Tipo Desconhecido X');
    expect(a).toBe(b);
  });

  test('nomes desconhecidos diferentes não retornam todos o mesmo ícone', () => {
    const nomes = ['Alfa', 'Beta', 'Gama', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Teta'];
    const icones = new Set(nomes.map(iconForAssetType));
    expect(icones.size).toBeGreaterThan(1);
  });

  test('entrada vazia ou nula não quebra e retorna um ícone válido', () => {
    expect(FALLBACK_ICONS).toContain(iconForAssetType(''));
    expect(FALLBACK_ICONS).toContain(iconForAssetType(null));
    expect(FALLBACK_ICONS).toContain(iconForAssetType(undefined));
  });
});
