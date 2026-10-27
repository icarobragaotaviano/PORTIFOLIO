import { readFileSync } from 'node:fs';
import { validatePortfolio } from '../public/content-schema.js';
const portfolio = JSON.parse(readFileSync(new URL('./portfolio.json', import.meta.url), 'utf8'));

export const site = {
  name: 'Ícaro Braga Otaviano',
  shortName: 'Ícaro Braga',
  initials: 'IB',
  wordmark: { primary: 'icaro braga', secondary: 'DIREÇÃO DE ARTE // DESIGN // MOTION // IA' },
  role: 'Designer Gráfico, Visual & Produtor Audiovisual',
  github: 'https://github.com/icarobragaotaviano',
  email: 'icarobragaotaviano@gmail.com',
  phone: '(88) 99652-1395',
  phoneHref: 'tel:+5588996521395',
  whatsapp: 'https://wa.me/5588996521395',
  location: 'Fortaleza, Ceará, BR',
  availability: 'Integral',
  experienceYears: '+10 anos',
  description:
    'Portfólio de Ícaro Braga Otaviano — Designer gráfico e visual com mais de 10 anos de experiência em design, direção de arte, fotografia profissional, motion graphics, criações com IA e produção audiovisual.',
};

export const projects = validatePortfolio(portfolio).projects.map((project, index) => ({ ...project, number: String(index + 1).padStart(2, '0') }));

export const motionProjects = [
  {
    number: 'M.01',
    title: 'Tipografia Cinética & Identidade em Movimento',
    category: 'Motion Design // After Effects',
    duration: '60 FPS // SISTEMA DINÂMICO',
    image: '/images/motion-kinetic.svg',
    alt: 'Representação gráfica de curvas de animação Bezier, keyframes e tipografia cinética em movimento.',
    description:
      'Animação de marcas, assinaturas visuais, títulos cinéticos e transições modulares que expandem sistemas de branding para telas digitais e redes sociais.',
    tools: ['After Effects', 'Illustrator', 'Expressões & Keyframes'],
    deliverables: ['Logo Reveal', 'Stingers & Transições', 'Reels & Stories Animados'],
  },
  {
    number: 'M.02',
    title: 'Broadcast, Eventos & Direção ao Vivo',
    category: 'Mídia de Eventos // Transmissão',
    duration: 'FULL HD // AO VIVO & ON-LINE',
    image: '/images/motion-broadcast.svg',
    alt: 'Composição visual de pacote gráfico para transmissão ao vivo, lower thirds e vinhetas de eventos científicos.',
    description:
      'Criação e direção visual para congressos e encontros científicos (como JCRA e ENPRA): vinhetas de abertura, lower thirds, telas de espera, cenografia digital e direção ao vivo de transmissões.',
    tools: ['After Effects', 'Premiere Pro', 'Direção de Transmissão'],
    deliverables: ['Pacote Gráfico de Transmissão', 'Telas de Palco & Stand', 'Direção Estética Ao Vivo'],
  },
  {
    number: 'M.03',
    title: 'Produção Audiovisual & Conteúdo Educacional',
    category: 'Filmagem // Edição // YouTube',
    duration: '4K // WORKFLOW COMPLETO',
    image: '/images/motion-educacao.svg',
    alt: 'Painel de produção audiovisual com storyboard, ondas sonoras e edição multi-pista.',
    description:
      'Planejamento, captação em vídeo, direção de fotografia, edição rítmica e pós-produção para videoaulas, campanhas institucionais e gestão visual completa de canais no YouTube.',
    tools: ['Premiere Pro', 'CapCut', 'Direção de Fotografia'],
    deliverables: ['Videoaulas & Institucionais', 'Padronização de YouTube', 'Edição & Color Grading'],
  },
];

export const aiCreations = [
  {
    number: 'IA.01',
    title: 'Síntese Conceitual & Universos Visuais',
    tag: 'DIREÇÃO DE ARTE GENERATIVA',
    image: '/images/ia-sintese.svg',
    alt: 'Geometria espacial e síntese conceitual representando direção de arte assistida por Inteligência Artificial.',
    promptSpec: 'CONCEITO → ENGENHARIA DE PROMPT → CURADORIA VISUAL → DIREÇÃO DE ARTE',
    description:
      'Exploração ágil de conceitos, iluminação dramática e construção de moodboards de alta fidelidade para validar atmosferas de campanhas e eventos antes da produção final.',
    highlights: ['Ideação acelerada', 'Estudo de luz e cor', 'Consistência estética'],
  },
  {
    number: 'IA.02',
    title: 'Fluxo Híbrido: Fotografia, IA & Retoque Pro',
    tag: 'COMPOSIÇÃO & PÓS-PRODUÇÃO',
    image: '/images/ia-arquitetura.svg',
    alt: 'Comparativo visual entre geração base e refinamento humano com direção de arte e tratamento de imagem.',
    promptSpec: 'FOTOGRAFIA REAL + PREENCHIMENTO GENERATIVO + COLOR GRADING AVANÇADO',
    description:
      'União entre o olhar clássico da fotografia profissional e ferramentas generativas para expansão de cenários, limpeza complexa, fusão de elementos e tratamento avançado no Photoshop e Affinity Photo.',
    highlights: ['Retoque não-destrutivo', 'Integração de luz e sombra', 'Acabamento para impressão e digital'],
  },
  {
    number: 'IA.03',
    title: 'Atmosferas Editoriais & Campanhas Digitais',
    tag: 'DESIGN & EXPERIMENTAÇÃO',
    image: '/images/ia-editorial.svg',
    alt: 'Layout editorial combinando tipografia expressiva e texturas geradas com supervisão criativa.',
    promptSpec: 'TEXTURAS SINTÉTICAS // TIPOGRAFIA // SISTEMA DE IDENTIDADE',
    description:
      'Criação de ativos visuais inéditos, texturas orgânicas ou futuristas e peças conceituais para redes sociais, capas e materiais de comunicação com direção de arte autoral.',
    highlights: ['Ativos visuais exclusivos', 'Integração tipográfica', 'Curadoria humana rigorosa'],
  },
];

export const profile = {
  headline: 'Mais de 10 anos transformando intenção em presença visual.',
  summary:
    'Designer gráfico e visual com mais de 10 anos de experiência em design, fotografia e produção de conteúdo. Especializado em criação de identidades visuais, materiais de marketing, direção de arte e produção audiovisual. Domínio avançado de ferramentas de design (Adobe, Affinity, Inkscape, Canva) e forte atuação em fotografia profissional. Visão criativa combinada com execução eficiente, voltada para projetos estratégicos em saúde, educação e eventos.',
  pillars: [
    {
      number: '01',
      title: 'Design & Identidade Visual',
      text: 'Desenvolvimento de marcas, sistemas gráficos, paletas cromáticas, tipografia e desdobramento completo para mídias digitais e materiais impressos de pequenas e grandes tiragens.',
    },
    {
      number: '02',
      title: 'Fotografia & Direção de Arte',
      text: 'Olhar apurado para composição, enquadramento e iluminação avançada em eventos, retratos e institucional, aliado a tratamento e retoque criativo de alto nível.',
    },
    {
      number: '03',
      title: 'Audiovisual, Motion & Novas Mídias',
      text: 'Do planejamento e filmagem à edição, animação gráfica, direção de transmissões ao vivo e integração de Inteligência Artificial ao fluxo criativo.',
    },
  ],
};

export const resume = {
  experiences: [
    {
      role: 'Designer Gráfico e Visual – Prestação de Serviços',
      company: 'Bolero Comunicação',
      location: 'Fortaleza — 2026',
      focus: 'Prestação de Serviços em Design, Direção de Arte e Comunicação Visual',
      bullets: [
        'Prestação de serviços especializados em design gráfico, direção de arte e peças de comunicação para campanhas e clientes da agência.',
        'Desenvolvimento e adaptação de layouts, materiais digitais, mídias sociais e peças gráficas.',
        'Finalização e entrega técnica de materiais criativos com foco em agilidade e padrão visual.',
      ],
    },
    {
      role: 'Designer Gráfico e Visual',
      company: 'Colégio Paiva Andrade',
      location: 'Fortaleza (Messejana)',
      focus: 'Foco: Design, Direção de Arte e Conteúdo Audiovisual',
      bullets: [
        'Direção de arte e design para materiais institucionais e campanhas de comunicação.',
        'Criação de peças gráficas para impressão (pequenas e grandes tiragens) e mídias digitais.',
        'Arte final e tratamento avançado de imagens para publicação e divulgação.',
        'Articulação com agências de publicidade e fornecedores de materiais de comunicação visual.',
        'Produção audiovisual: planejamento, filmagem e edição de videoaulas durante o período da pandemia.',
        'Gestão visual do canal do YouTube do colégio (padrão visual, thumbnails, organização de playlists).',
      ],
    },
    {
      role: 'Designer e Produtor de Conteúdo Visual',
      company: 'Colégio Pequeno Príncipe',
      location: 'Crato',
      focus: 'Design Gráfico, Arte Final e Fotografia Institucional',
      bullets: [
        'Criação e finalização de materiais gráficos (design, arte final e layouts).',
        'Fotografia profissional: registro de eventos, ações institucionais e materiais de divulgação.',
        'Apoio às necessidades visuais e de comunicação da escola.',
      ],
    },
    {
      role: 'Designer e Produtor Audiovisual – Projetos de Eventos',
      company: 'JCRA – Jornada Cearense de Reprodução Assistida',
      location: 'Fortaleza — 2022 e 2024',
      focus: 'Identidade Visual, Sistema de Design e Direção de Mídia',
      bullets: [
        'Criação da identidade visual completa do evento, alinhada ao posicionamento científico e multidisciplinar.',
        'Desenvolvimento de sistema de design: paleta de cores, tipografia, elementos gráficos e aplicação em diferentes peças.',
        'Design de materiais de marketing: peças digitais, banners, cartazes, apresentações e materiais impressos.',
        'Produção para pequenas e grandes tiragens (crachás, folders, materiais de stand etc.).',
        'Direção de mídia: fotografia, vídeo e tratamento avançado de imagens.',
        'Coordenação visual das mídias do evento com foco em consistência e impacto visual.',
      ],
    },
    {
      role: 'Designer e Produtor Audiovisual – Projetos de Eventos',
      company: 'ENPRA – Encontro Nordestino de Psicologia em Reprodução Assistida',
      location: 'On-line — 2023',
      focus: 'Identidade Visual Digital e Direção de Transmissão Ao Vivo',
      bullets: [
        'Criação de identidade visual completa para evento on-line.',
        'Design de peças digitais, apresentações e materiais de divulgação para diferentes canais.',
        'Produção e direção das mídias digitais do evento, garantindo padronização visual e boa experiência para palestrantes e participantes.',
        'Direção ao vivo do evento, com cuidado na estética visual das transmissões.',
      ],
    },
    {
      role: 'Designer de Estampas e Arte-Finalista',
      company: 'MS Confecções',
      location: 'Ceará — 2017',
      focus: 'Criação de Estampas de Camisas e Preparação para Impressão',
      bullets: [
        'Criação e desenvolvimento de estampas exclusivas e ilustrações gráficas para camisas e vestuário.',
        'Preparação técnica e fechamento de arquivos para impressão têxtil (serigrafia, sublimação e estamparia).',
        'Separação de cores, revisão de padrões cromáticos e arte final garantindo fidelidade na produção.',
      ],
    },
    {
      role: 'Designer Gráfico e Comunicador',
      company: 'Rádio Educadora do Cariri',
      location: 'Cariri, CE',
      focus: 'Design Gráfico, Audiovisual e Fotografia Institucional',
      bullets: [
        'Criação e adaptação de materiais audiovisuais e peças de divulgação.',
        'Design gráfico e arte final para peças de comunicação impressas e digitais.',
        'Organização de mídias e arquivos digitais.',
        'Atuação em fotografia para comunicação institucional e campanhas.',
      ],
    },
    {
      role: 'Designer de Comunicação Clínica',
      company: 'Humani Clin – Clínica de Saúde',
      location: 'Ceará',
      focus: 'Planejamento Visual, Social Media e Materiais Educativos',
      bullets: [
        'Planejamento visual e design de materiais de comunicação e redes sociais.',
        'Criação de peças para Instagram, Facebook e outros canais digitais.',
        'Design gráfico de materiais informativos, institucionais e educativos.',
        'Apoio às ações de comunicação integrada da clínica.',
      ],
    },
    {
      role: 'Suporte em TI',
      company: 'Hemoce – Setor de Tecnologia da Informação',
      location: 'Ceará',
      focus: 'Infraestrutura, Sistemas e Suporte Técnico',
      bullets: [
        'Suporte técnico em informática para usuários internos.',
        'Apoio a sistemas, computadores e infraestrutura de TI.',
        'Organização de demandas, registros e acompanhamento de chamados.',
      ],
    },
    {
      role: 'Apoio Administrativo / Projetos',
      company: 'Instituto Elo Amigo – Terceiro Setor',
      location: 'Ceará',
      focus: 'Projetos Sociais e Gestão Documental',
      bullets: [
        'Apoio a atividades administrativas em projetos sociais.',
        'Organização de documentos, arquivos e informações institucionais.',
      ],
    },
  ],
  technicalSkills: [
    {
      category: 'Software de Design e Edição',
      items: [
        'Adobe Creative Suite: Photoshop, Illustrator, InDesign, After Effects, Premiere Pro',
        'Affinity: Designer, Photo',
        'Outros: Figma, Inkscape, Canva, CapCut',
      ],
    },
    {
      category: 'Fotografia Profissional',
      items: [
        'Composição, enquadramento e iluminação avançada',
        'Retoque e tratamento de imagens (cor, contraste, nitidez e edição criativa)',
        'Fotografia de eventos, retratos, institucional e produtos',
      ],
    },
    {
      category: 'Design e Direção de Arte',
      items: [
        'Identidade visual e branding (logos, paleta de cores, tipografia, guias de uso)',
        'Design gráfico para materiais digitais e impressos',
        'Direção de arte para campanhas, eventos e produções audiovisuais',
        'Adequação de layouts para diferentes formatos e plataformas',
      ],
    },
    {
      category: 'Produção Audiovisual',
      items: [
        'Filmagem e edição de vídeos institucionais e educacionais',
        'Direção de fotografia e de arte em produções audiovisuais',
        'Gestão de canais de vídeo (YouTube e redes sociais)',
      ],
    },
    {
      category: 'Tecnologia e Ferramentas',
      items: [
        'Sistemas operacionais: Windows e Linux',
        'Noções de programação (HTML/CSS, JSON)',
        'Facilidade para aprender novos sistemas internos, plataformas e ferramentas',
      ],
    },
  ],
  behavioralSkills: [
    'Organização, responsabilidade e atenção a detalhes.',
    'Boa comunicação e trabalho em equipe multidisciplinar.',
    'Proatividade, flexibilidade e foco em solução.',
    'Capacidade de traduzir demandas em soluções visuais claras e eficientes.',
  ],
  education: [
    {
      title: 'Ensino Médio Completo',
      institution: 'Centro Educacional Cenecista Rui Barbosa',
      year: '2006',
    },
  ],
  courses: [
    {
      title: 'Arte Final',
      institution: 'Opa! Escola de Design – Fortaleza',
      year: '2015',
      description: 'Finalização de peças gráficas, preparação de arquivos para impressão, padrões de cor e acabamento.',
    },
    {
      title: 'Curso de Fotografia',
      institution: 'Alan Bastos – Crato',
      year: '2017',
      description: 'Fundamentos de fotografia, enquadramento, iluminação e tratamento de imagens.',
    },
    {
      title: 'Formação Complementar (Autodidata / Prática Profissional)',
      institution: 'Desenvolvimento Contínuo',
      year: '+10 anos',
      description: 'Ampla experiência em design gráfico, redes sociais e marketing digital. Criação de peças, layouts e conteúdos visuais para diferentes públicos e canais.',
    },
  ],
  languages: [
    { name: 'Português', level: 'Nativo' },
    { name: 'Inglês', level: 'Fluente' },
  ],
  additionalInfo: [
    'Disponibilidade: Integral.',
    'Interesse em desenvolvimento contínuo em design, branding, motion graphics e projetos audiovisuais.',
  ],
};

export const blogPosts = [
  {
    slug: 'identidade-visual-eventos-cientificos',
    date: 'OUT 2026',
    readTime: '4 MIN DE LEITURA',
    category: 'BRANDING & EVENTOS',
    title: 'Como construir sistemas visuais consistentes para grandes eventos científicos e educacionais',
    excerpt:
      'Da criação da marca ao crachá, do palco principal à transmissão ao vivo: aprendizados práticos na direção de arte da JCRA e do ENPRA.',
    content:
      'Projetar a identidade visual de um evento científico ou educacional exige equilibrar rigor institucional e impacto estético. Quando desenvolvemos o sistema gráfico da Jornada Cearense de Reprodução Assistida (JCRA) e do ENPRA, o ponto de partida foi criar uma linguagem modular: tipografia com excelente legibilidade à distância, paleta cromática marcante e elementos geométricos que funcionassem tão bem em grandes lonas impressas quanto em lower thirds de uma transmissão on-line.',
  },
  {
    slug: 'motion-design-narrativa-visual',
    date: 'SET 2026',
    readTime: '3 MIN DE LEITURA',
    category: 'MOTION & AUDIOVISUAL',
    title: 'O movimento como extensão da tipografia: ritmo, corte e retenção no audiovisual',
    excerpt:
      'Por que pensar em animação e sonorização desde o primeiro rascunho da identidade visual transforma a percepção de uma marca no ambiente digital.',
    content:
      'Uma identidade contemporânea raramente permanece estática. No After Effects e no Premiere Pro, a transição entre duas telas ou a velocidade com que um título entra em cena comunica tanto quanto a própria fonte escolhida. Na produção de videoaulas e gestão de canais no YouTube, padronizar vinhetas, thumbnails e ritmo de corte cria reconhecimento imediato e eleva a autoridade visual do conteúdo.',
  },
  {
    slug: 'ia-direcao-de-arte-fotografia',
    date: 'AGO 2026',
    readTime: '5 MIN DE LEITURA',
    category: 'CRIAÇÕES COM IA & FOTOGRAFIA',
    title: 'Inteligência Artificial e olhar fotográfico: onde a tecnologia encontra a direção de arte humana',
    excerpt:
      'A IA não substitui o repertório visual — ela amplifica quem sabe dirigir luz, composição, cor e intenção comunicativa.',
    content:
      'Ter base sólida em fotografia profissional — compreendendo iluminação, lente, enquadramento e tratamento de cor — muda completamente a forma de criar com Inteligência Artificial. Em vez de aceitar resultados genéricos, utilizamos a geração sintética como ponto de partida dentro de um fluxo híbrido com Photoshop e Affinity Photo, refinando texturas, corrigindo perspectivas e garantindo que cada peça tenha acabamento editorial e intencionalidade.',
  },
];

export const socials = [
  {
    name: 'WhatsApp',
    handle: '(88) 99652-1395',
    label: 'CONVERSA DIRETA // DISPONIBILIDADE INTEGRAL',
    url: 'https://wa.me/5588996521395',
  },
  {
    name: 'E-mail',
    handle: 'icarobragaotaviano@gmail.com',
    label: 'ORÇAMENTOS, PROJETOS & PARCERIAS',
    url: 'mailto:icarobragaotaviano@gmail.com',
  },
  {
    name: 'GitHub',
    handle: '@icarobragaotaviano',
    label: 'REPOSITÓRIOS & CÓDIGO DO PORTFÓLIO',
    url: 'https://github.com/icarobragaotaviano',
  },
  {
    name: 'Instagram',
    handle: '@icarobragaotaviano',
    label: 'FOTOGRAFIA, BASTIDORES & DIREÇÃO VISUAL',
    url: 'https://instagram.com/icarobragaotaviano',
  },
  {
    name: 'Behance',
    handle: 'Ícaro Braga Otaviano',
    label: 'CASES DE DESIGN, BRANDING & EDITORIAL',
    url: 'https://behance.net/icarobragaotaviano',
  },
  {
    name: 'LinkedIn',
    handle: 'Ícaro Braga Otaviano',
    label: 'TRAJETÓRIA PROFISSIONAL & CONEXÕES',
    url: 'https://linkedin.com/in/icarobragaotaviano',
  },
];
