# Portfólio — Ícaro Braga

Portfólio minimalista de design e direção de arte, com imagens em destaque, cases individuais e quatro áreas: **Trabalhos**, **Quem sou eu**, **Experiência profissional** e **Contato**. Mantém a tipografia Space Grotesk, detalhes em Space Mono e um acento amarelo discreto sobre fundo claro.

A seleção inicial apresenta **Wine Gourmet, Amorévo e EndoAfetos**, com escopo de autoria confirmado pelo proprietário e imagens do acervo dos projetos. Não foram acrescentados resultados, clientes ou datas sem confirmação.

## Rodar localmente

Requer Node.js 22 ou superior. Não há dependências para instalar.

```sh
npm run dev
```

Abra http://127.0.0.1:4173. Depois de editar fontes, execute `npm run build` e recarregue o navegador.

```sh
npm test
npm run build
```

## Seu painel de trabalhos

Abra **`/admin/`** no domínio do portfólio (ou `/PORTIFOLIO/admin/` no GitHub Pages). O painel permite criar, editar, remover e reordenar trabalhos, enviar capa e galeria, escrever o case e conferir uma prévia antes de publicar.

O acesso usa a conta GitHub **icarobragaotaviano**, validada pela API do GitHub. Para entrar:

1. Em [GitHub → Fine-grained personal access tokens](https://github.com/settings/personal-access-tokens/new), crie um token com prazo de expiração.
2. Selecione somente o repositório **PORTIFOLIO** e a permissão **Contents: Read and write**. Metadata é incluída pelo GitHub.
3. Cole o token no campo de acesso do painel. Não envie o token por mensagem nem coloque-o nos arquivos do site.

O token é mantido apenas na memória da aba e apagado ao sair ou recarregar. O painel não tem senha embutida nem grava credenciais no navegador. A API do GitHub verifica as permissões de leitura e escrita; a tela de acesso é pública, mas a edição exige credencial válida do proprietário. Use o painel em HTTPS ou no localhost de desenvolvimento.

O botão **Publicar alterações** salva o conteúdo e as imagens no GitHub, na branch `main`. As alterações feitas no formulário ficam apenas na aba até essa confirmação. O repositório é público: textos e imagens publicados ficam visíveis também no histórico do GitHub. Não use o painel para armazenar materiais confidenciais.

A gravação no GitHub e a publicação da hospedagem são etapas distintas. O painel confirma o commit e mostra um link para ele. A Vercel ou o GitHub Pages precisa concluir seu build para a mudança aparecer no site. O fluxo não exige banco de dados ou serviço de CMS adicional.

Se houver alteração concorrente no repositório, o painel interrompe a gravação para evitar sobrescrever o trabalho de outra sessão. Copie suas alterações antes de recarregar. Imagens aceitas: JPEG, PNG e WebP, até 3 MB por arquivo, uma capa e até oito imagens de galeria.

## Conteúdo e código

- `src/portfolio.json`: lista e ordem dos trabalhos, usada pelo painel e pelo build.
- `src/content.mjs`: apresentação, experiência, contatos e dados pessoais já existentes.
- `src/templates.mjs`: página pública e cases.
- `src/admin-template.mjs`: painel separado, sem indexação e sem scripts externos.
- `public/styles.css` e `public/app.js`: apresentação e navegação pública.
- `public/admin.js`, `admin.css` e `github-cms.js`: editor e integração com o GitHub.
- `public/content-schema.js`: validação compartilhada pelo editor e pelo build.
- `public/images/work/`: imagens dos três trabalhos iniciais.
- `public/uploads/`: novas imagens enviadas pelo painel.
- `dist/`: saída gerada; não editar diretamente.

As imagens devem ter descrição acessível. O build verifica os caminhos e recusa referências ausentes. Caso use exemplos ou espaços reservados no futuro, marque `status` como `demo` ou `placeholder` e inclua uma nota de contexto; trabalhos reais usam `published`.

## Hospedagem

### Vercel

Importe o repositório usando `npm run build`, saída `dist` e Node.js 22+. O `vercel.json` executa os testes antes do build. Se a integração GitHub já estiver conectada, commits no painel acionam o fluxo configurado na Vercel.

### GitHub Pages

Em **Settings → Pages**, selecione **GitHub Actions**. O workflow existente publica após pushes em `main` e também permite execução manual. Ele gera o site com o caminho base `/PORTIFOLIO/`.

Para conferir essa versão localmente:

```sh
node scripts/build.mjs --base /PORTIFOLIO/
BASE_PATH=/PORTIFOLIO/ npm run preview
```

Abra http://127.0.0.1:4173/PORTIFOLIO/. Para voltar à raiz, execute `npm run build` sem caminho base.

A disponibilidade do endereço publicado depende da configuração e conclusão da hospedagem; o build local não confirma o deploy remoto.

Documentação: [permissões de tokens GitHub](https://docs.github.com/en/rest/authentication/permissions-required-for-fine-grained-personal-access-tokens), [API de conteúdo](https://docs.github.com/en/rest/repos/contents), [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site).
