# Portfólio — Ícaro Braga

Portfólio escuro e minimalista de design e direção de arte, com imagens em destaque e quatro áreas: **Trabalhos**, **Quem sou eu**, **Experiência profissional** e **Contato**. A seleção inicial mantém **Wine Gourmet, Amorévo e EndoAfetos**, suas imagens originais, descrições e créditos de autoria.

O Estúdio privado combina organização e edição inspiradas no fluxo do Behance com a identidade visual do portfólio: superfícies carvão, tipografia clara, bordas discretas e acentos amarelos.

## Rodar localmente

Requer Node.js 22 ou superior. Não há dependências para instalar.

```sh
npm run dev
```

Abra **http://127.0.0.1:4173/**. Depois de alterar arquivos-fonte, execute `npm run build` e recarregue a página. Validação completa:

```sh
npm test
npm run build
```

## Experiência pública

As capas têm busca e filtros por área criativa. Cada case abre em uma página com imagens em sua proporção original, textos com hierarquia, ampliação das imagens, créditos, ferramentas e projetos relacionados. Durante a leitura, uma navegação discreta permite voltar à seleção ou passar ao trabalho anterior e ao próximo. O contato fica acessível no cabeçalho do case e no encerramento.

O case Wine Gourmet reproduz as quatro pranchas da apresentação de identidade visual: experiência e mosaico de marca, embalagem, campanhas de vinhos e Dia do Pai. São 15 artes independentes, com ampliação, dimensões originais e versões responsivas. No celular, os mosaicos se reorganizam e os anúncios ganham uma coluna. As composições também podem ser selecionadas nas opções de grade do Estúdio.

As entradas de conteúdo usam movimentos breves de 12 px ao rolar; os estados de interação indicam abertura e ampliação. A navegação usa links nativos e não depende das animações para funcionar. A preferência por movimento reduzido é respeitada. Capas iniciais carregam imediatamente e imagens seguintes usam carregamento sob demanda.

## Estúdio privado

Abra **`/studio/`** ou o link **Área privada** no rodapé. O endereço anterior `/admin/` também conduz ao Estúdio.

- **Organizar:** capas, busca, filtros, publicados e rascunhos, grade/lista, ordem por arraste ou setas.
- **Criar:** blocos de imagem, texto (título, subtítulo ou parágrafo), grade de fotos, vídeo, incorporação e divisor; reordenação, duplicação, alinhamento, largura e legenda por bloco.
- **Apresentar:** capa enviada ou escolhida entre as imagens do projeto; descrição, área criativa, tags, ferramentas, cliente, ano, créditos e nota de contexto; fundo, espaçamento e largura do canvas.
- **Conferir:** a prévia usa o mesmo renderizador da página pública.
- **Publicar:** salvar rascunho, publicar, atualizar, duplicar, mover para rascunhos e excluir projetos.

O fundo do projeto é independente do tema da interface e pode ser alterado no editor. Imagens originais preservam suas cores. Novos projetos começam com canvas escuro.

Use **Salvar rascunho** para guardar um projeto privado e **Continuar → Publicar projeto** para torná-lo público. Em um projeto já publicado, **Salvar alterações** atualiza sua apresentação pública. O editor avisa antes de sair com alterações não salvas; não há salvamento automático.

Uploads aceitos: **PNG, JPG, GIF e WebP até 3 MB por arquivo**. Cada grade aceita até 12 fotos; projetos podem conter várias grades. Vídeos aceitam endereços HTTPS MP4, WebM ou OGG e incorporações do YouTube/Vimeo. Imagens sem referência em projetos permanecem armazenadas.

### Primeiro acesso local

Sem variáveis de acesso configuradas, `/studio/` oferece a criação da senha pelo proprietário, com pelo menos 12 caracteres. A senha é armazenada como hash com salt e a sessão usa cookie HttpOnly, com duração de oito horas.

Projetos, credenciais locais e imagens ficam em **`.data/portfolio/`**, ignorados pelo Git e excluídos do build. Preserve essa pasta ao transferir uma instalação local. O armazenamento local não é sincronizado automaticamente com a hospedagem.

### Configuração na Vercel

Configure em cada ambiente:

- `PORTFOLIO_ADMIN_PASSWORD`: senha do proprietário.
- `PORTFOLIO_SESSION_SECRET`: segredo aleatório de pelo menos 32 caracteres.
- `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN`: armazenamento durável de projetos e imagens.

O `.env.example` contém apenas os nomes, sem valores reais. Também são aceitas as variáveis `KV_REST_API_URL` e `KV_REST_API_TOKEN` de um armazenamento Redis existente. A criação inicial de senha só é oferecida no servidor local. Na Vercel, configure as variáveis antes de usar a área privada; salvamentos e uploads ficam bloqueados sem armazenamento durável.

Importe o repositório com saída `dist` e Node.js 22+. O `vercel.json` executa os testes antes do build e encaminha a homepage e as páginas de projetos para `api/portfolio.js`. Assim, a galeria e cada case refletem a publicação atual, inclusive sem JavaScript. Mover um projeto para rascunhos ou excluí-lo retira sua página do acesso público e protege imagens que só pertencem a projetos privados. As respostas usam `no-store`.

Publicar um projeto em um Estúdio já hospedado é diferente de publicar uma nova versão do código do site. A disponibilidade remota depende da configuração e conclusão da hospedagem; a verificação local não confirma um deploy.

## Conteúdo e código

- `src/portfolio.json`: seleção inicial dos trabalhos reais e suas galerias.
- `src/content.mjs`: dados pessoais, apresentação, contatos e experiência; carrega a seleção inicial.
- `src/templates.mjs`: homepage minimalista, navegação e estrutura pública.
- `public/portfolio.js` e `portfolio.css`: galeria, canvas, ampliação, navegação e movimentos públicos.
- `src/studio-template.mjs`, `public/studio.js` e `studio.css`: interface do Estúdio.
- `server/portfolio-access.js`, `portfolio-store.js` e `portfolio-page.js`: autenticação, persistência e renderização atual.
- `api/portfolio.js`: função da hospedagem.
- `public/images/work/`: imagens originais dos três trabalhos iniciais.
- `tests/`: validação de conteúdo, publicação, privacidade e persistência.
- `dist/`: saída gerada; não editar diretamente.

A seleção inicial é importada quando o armazenamento ainda está vazio. Depois do primeiro salvamento, o Estúdio passa a usar o armazenamento, sem modificar `src/portfolio.json`. O editor anterior baseado em token GitHub não é carregado no build e seus scripts de publicação não são usados pelo Estúdio.

## GitHub Pages

O workflow existente publica após pushes em `main` e permite execução manual. Ele gera os arquivos com caminho base `/PORTIFOLIO/`.

```sh
node scripts/build.mjs --base /PORTIFOLIO/
BASE_PATH=/PORTIFOLIO/ npm run preview
```

O GitHub Pages apresenta o conteúdo inicial estático. Ele **não executa a API privada**, portanto não oferece login, uploads, salvamento ou publicação pelo Estúdio. Use Vercel ou o servidor local para a experiência completa. Para voltar à raiz, execute o build sem caminho base.

Os jogos e seus dados permanecem separados do portfólio e não entram na saída pública deste build.
