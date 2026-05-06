export type Project = {
  slug: string
  title: string
  category: string
  image: string
  description: string
  summary: string
  location: string
  year: string
  highlights: string[]
  gallery?: string[]
}

export const projects: Project[] = [
  {
    slug: 'educacao-ambiental-com-criancas',
    title: 'Educação ambiental com crianças',
    category: 'Educação',
    image: '/images/joao-ricardo-1.png',
    description: 'Atividade prática com crianças para aproximar ciência, cuidado ambiental e pertencimento ao território.',
    summary:
      'O encontro apresentou temas de biodiversidade, preservação e responsabilidade coletiva em uma linguagem simples, sensível e participativa. As crianças observaram elementos da natureza, conversaram sobre o papel de cada pessoa no cuidado com o ambiente e participaram de uma vivência educativa guiada.',
    location: 'Ação comunitária',
    year: '2026',
    highlights: [
      'Roda de conversa sobre natureza e cuidado com o lugar onde vivem.',
      'Vivência educativa com linguagem acessível para crianças.',
      'Fortalecimento do vínculo entre escola, comunidade e meio ambiente.',
    ],
    gallery: [
      '/images/projetos/plantando_crianca.png',
      '/images/projetos/regando_crianca.png',
      '/images/projetos/abelha_crianca.png',
      '/images/projetos/manejo_crianca.png'
    ],
  },
  {
    slug: 'vivencia-de-campo-e-biodiversidade',
    title: 'Vivência de campo e biodiversidade',
    category: 'Campo',
    image: '/images/joao-ricardo-2.png',
    description: 'Registro de uma atividade de campo voltada à observação ambiental e leitura da paisagem.',
    summary:
      'A vivência aproximou os participantes do território por meio da observação direta da vegetação, do solo e das relações ecológicas presentes no espaço. A proposta foi transformar o campo em sala de aula aberta, valorizando perguntas, escuta e percepção ambiental.',
    location: 'Território monitorado',
    year: '2026',
    highlights: [
      'Observação orientada de elementos naturais do território.',
      'Discussão sobre biodiversidade, solo e restauração ecológica.',
      'Construção de repertório ambiental a partir da experiência prática.',
    ],
    gallery: [
      '/images/projetos/apreciando_natureza.png'
    ],
  },
  {
    slug: 'oficina-de-cuidado-com-a-natureza',
    title: 'Oficina de cuidado com a natureza',
    category: 'Oficina',
    image: '/images/joao-ricardo-3.png',
    description: 'Ação educativa com foco em práticas simples de cuidado ambiental e multiplicação de conhecimento.',
    summary:
      'A oficina trabalhou o cuidado com a natureza como prática cotidiana. A partir de exemplos concretos, os participantes refletiram sobre conservação, uso responsável dos recursos e pequenas ações que podem gerar impacto positivo quando multiplicadas pela comunidade.',
    location: 'Comunidade parceira',
    year: '2026',
    highlights: [
      'Atividade educativa com participação ativa da comunidade.',
      'Troca de saberes sobre conservação e sustentabilidade.',
      'Incentivo à multiplicação das práticas aprendidas.',
    ],
  },
  {
    slug: 'plantando-sementes-em-casa',
    title: 'Plantando sementes em casa',
    category: 'Plantio',
    image: '/images/plantado-joao.png',
    description: 'Iniciativa para incentivar o plantio doméstico e mostrar que a restauração também começa perto de casa.',
    summary:
      'O projeto estimulou o plantio de sementes em casa como gesto de educação ambiental e autonomia. A atividade mostrou como preparar, cuidar e acompanhar o desenvolvimento das plantas, conectando famílias ao ciclo da vida e à importância das espécies nativas.',
    location: 'Casa e comunidade',
    year: '2026',
    highlights: [
      'Orientação prática para plantio e cuidado inicial das sementes.',
      'Valorização do ambiente doméstico como espaço de aprendizagem.',
      'Convite para transformar pequenos gestos em cultura ambiental.',
    ],
  },
]

export function getProjectBySlug(slug: string) {
  return projects.find((project) => project.slug === slug)
}
