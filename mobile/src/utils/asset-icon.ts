// Mapeia o nome de um tipo de árvore para um ícone do MaterialIcons.
// Objetivo: marcadores no mapa não ficam todos iguais — o ícone reflete o nome
// do tipo quando reconhecível (espécie/categoria) e, para nomes desconhecidos,
// escolhe um ícone variado de forma DETERMINÍSTICA (mesmo nome → mesmo ícone).

// Paleta de fallback: ícones naturais válidos no MaterialIcons.
export const FALLBACK_ICONS = [
  'park',
  'forest',
  'nature',
  'eco',
  'grass',
  'spa',
  'local-florist',
  'filter-vintage',
  'yard',
  'agriculture',
] as const;

// Dicionário semântico: a primeira regra cujo padrão casar define o ícone.
// Os padrões assumem o nome já normalizado (sem acentos, minúsculo).
const KEYWORD_ICONS: ReadonlyArray<{ pattern: RegExp; icon: string }> = [
  // Floríferas ornamentais → flor
  {
    pattern: /(ipe|flamboyant|jacaranda|cerejeira|sakura|quaresmeira|manaca|sibipiruna|acacia|flor)/,
    icon: 'local-florist',
  },
  // Coníferas e árvores de grande copa → floresta
  { pattern: /(pinhe|pinus|araucaria|cipreste|cedro|abeto|eucalipto)/, icon: 'forest' },
  // Gramíneas, bambus e forrageiras → grama
  { pattern: /(capim|grama|cana|relva|bambu|taquara)/, icon: 'grass' },
  // Frutíferas, palmeiras e cultivos agrícolas → agricultura
  {
    pattern:
      /(mangueira|manga|jabuticaba|goiaba|abacate|laranj|limao|citric|caju|fruta|frutif|cafe|coco|coqueiro|palmeira|acai|buriti|cultivo|plantio)/,
    icon: 'agriculture',
  },
  // Jardinagem e ornamentais de porte menor → jardim
  { pattern: /(jardim|ornamental|arbusto|cerca viva|topiaria)/, icon: 'yard' },
  // Nativas de grande porte → árvore de parque
  {
    pattern:
      /(figueira|ficus|jatoba|jequitiba|peroba|aroeira|angico|pau-brasil|pau brasil|carvalho|nativa)/,
    icon: 'park',
  },
];

// Remove acentos e normaliza para casar nomes como "Ipê" e "ipe".
function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

// Hash determinístico simples (djb2-like) para distribuir nomes pela paleta.
function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

// iconForAssetType retorna o nome do ícone MaterialIcons para o tipo informado.
export function iconForAssetType(name: string | null | undefined): string {
  const normalized = normalize(name ?? '');

  for (const { pattern, icon } of KEYWORD_ICONS) {
    if (pattern.test(normalized)) {
      return icon;
    }
  }

  return FALLBACK_ICONS[hashString(normalized) % FALLBACK_ICONS.length];
}
