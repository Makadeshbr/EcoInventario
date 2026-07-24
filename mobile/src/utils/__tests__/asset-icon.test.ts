import { iconForAssetType, FALLBACK_ICONS } from '../asset-icon';
import { ICONS } from '@/components/ui/icon';

describe('iconForAssetType', () => {
  test('mapeia floríferas (Ipê, com acento e maiúscula) para flor', () => {
    expect(iconForAssetType('Ipê Amarelo')).toBe('flowerTulip');
    expect(iconForAssetType('jacaranda')).toBe('flowerTulip');
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
    expect(iconForAssetType('Mangueira')).toBe('crop');
    expect(iconForAssetType('Coqueiro')).toBe('crop');
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

  test('todo ícone da paleta existe no registry do design system', () => {
    for (const icon of FALLBACK_ICONS) {
      expect(ICONS).toHaveProperty(icon);
    }
  });

  test('entrada vazia ou nula não quebra e retorna um ícone válido', () => {
    expect(FALLBACK_ICONS).toContain(iconForAssetType(''));
    expect(FALLBACK_ICONS).toContain(iconForAssetType(null));
    expect(FALLBACK_ICONS).toContain(iconForAssetType(undefined));
  });
});
