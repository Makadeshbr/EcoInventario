// Mapeia o nome de um tipo de árvore para um emoji usado nos marcadores do mapa.
// Marcadores não ficam todos iguais: o emoji reflete o nome do tipo quando
// reconhecível e, para nomes desconhecidos, escolhe um emoji variado de forma
// DETERMINÍSTICA (mesmo nome → mesmo emoji).

// Paleta de fallback: emojis de árvore/folhagem variados.
export const FALLBACK_EMOJIS = ['🌳', '🌴', '🌲', '🌵', '🌿', '🍃', '🌾', '🪴', '☘️', '🌱'] as const;

// Dicionário semântico: primeira regra cujo padrão casar define o emoji.
// Os padrões assumem o nome já normalizado (sem acentos, minúsculo).
const KEYWORD_EMOJIS: ReadonlyArray<{ pattern: RegExp; emoji: string }> = [
  { pattern: /(palmeira|coqueiro|coco|acai|buriti|tucuma|jeriva)/, emoji: '🌴' },
  { pattern: /(pinhe|pinus|araucaria|cipreste|cedro|abeto|eucalipto)/, emoji: '🌲' },
  {
    pattern: /(ipe|cerejeira|sakura|quaresmeira|manaca|flamboyant|jacaranda|sibipiruna|flor)/,
    emoji: '🌸',
  },
  { pattern: /(cacto|mandacaru|xiquexique|palma forrageira)/, emoji: '🌵' },
  { pattern: /(capim|grama|cana|relva)/, emoji: '🌾' },
  { pattern: /(bambu|taquara)/, emoji: '🎋' },
  {
    pattern: /(mangueira|manga|jabuticaba|goiaba|abacate|laranj|limao|citric|caju|fruta|frutif)/,
    emoji: '🍊',
  },
  { pattern: /(figueira|ficus|jatoba|jequitiba|peroba|aroeira|angico|pau-brasil|pau brasil|carvalho|nativa)/, emoji: '🌳' },
  { pattern: /(arbusto|erva|capoeira|ornamental|jardim)/, emoji: '🌿' },
];

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

// emojiForAssetType retorna um emoji para o tipo informado.
export function emojiForAssetType(name: string | null | undefined): string {
  const normalized = normalize(name ?? '');

  for (const { pattern, emoji } of KEYWORD_EMOJIS) {
    if (pattern.test(normalized)) {
      return emoji;
    }
  }

  return FALLBACK_EMOJIS[hashString(normalized) % FALLBACK_EMOJIS.length];
}
