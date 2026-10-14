# PORTIFOLIO

Portfólio de direção de arte e design de **Icaro Braga**, com composição editorial, tipografia expressiva, projetos em destaque e páginas individuais de cases. O código gera um site estático, responsivo e pronto para personalização.

[Repositório no GitHub](https://github.com/icarobragaotaviano/PORTIFOLIO)

## Conteúdo demonstrativo

**VÉRTICE**, **Casa Sol** e **Entrelinhas** são estudos conceituais fictícios criados para demonstrar a interface. Não representam clientes, campanhas veiculadas, trabalhos comerciais, prêmios ou resultados reais. As páginas mantêm essa identificação visível.

**WineGourmet** é apenas um espaço reservado. Conteúdo, escopo e créditos ainda não foram fornecidos; sua presença não afirma autoria ou vínculo profissional. Adicione materiais e informações verificáveis antes de apresentar qualquer projeto como trabalho realizado.

## Preview local

Requer **Node.js 22 ou superior**, com npm. O projeto não tem dependências externas de execução ou de build: não é necessário rodar `npm install`.

```sh
git clone https://github.com/icarobragaotaviano/PORTIFOLIO.git
cd PORTIFOLIO
npm run dev
```

Abra **http://localhost:4173**. O comando gera o site e inicia o servidor local.

O servidor não acompanha alterações automaticamente. Após editar um arquivo, execute `npm run build` em outro terminal e recarregue a página no navegador. Para encerrar o servidor, use `Ctrl+C`.

| Comando | Função |
| --- | --- |
| `npm run dev` | Faz o build inicial e serve o site em `localhost:4173`. |
| `npm run build` | Gera os arquivos estáticos na pasta `dist/`. |
| `npm run preview` | Serve o conteúdo já gerado em `dist/`. |
| `npm test` | Executa os testes automatizados do projeto. |

## Personalização

Edite `src/content.mjs` para atualizar os dados do portfólio:

- `site.name`, `site.initials` e `site.role`: nome, iniciais e área de atuação.
- `site.description`: apresentação usada pelo site.
- `site.github`: perfil ou endereço de contato no GitHub.
- `site.email`: e-mail para contato. Quando está vazio, o contato usa o GitHub.
- A marca tipográfica da abertura também pode ser ajustada na configuração do site.
- `projects`: títulos, categorias, textos, imagens, serviços e entregas de cada case.

Os projetos usam `status: 'demo'` para estudos demonstrativos e `status: 'placeholder'` para espaços reservados. Preserve as notas de contexto enquanto o conteúdo for fictício. Evite preencher ano, cliente, créditos ou resultados com informações que não foram confirmadas.

Adicione imagens a `public/images/` e aponte o campo `image` do case para um caminho como `/images/meu-projeto.svg`. Escreva um `alt` que descreva o conteúdo relevante da imagem. Para mudar a direção visual, edite `public/styles.css`; as interações ficam em `public/app.js`.

```text
PORTIFOLIO/
├── .github/workflows/pages.yml  # Publicação manual no GitHub Pages
├── public/
│   ├── app.js                   # Interações da interface
│   ├── styles.css               # Estilos e responsividade
│   └── images/                  # Artes SVG e outras imagens
├── scripts/
│   ├── build.mjs                # Gerador do site estático
│   └── serve.mjs                # Servidor local para preview
├── src/
│   ├── content.mjs              # Dados do site e dos projetos
│   └── templates.mjs            # Templates HTML
├── tests/                      # Testes automatizados
└── dist/                       # Saída gerada pelo build
```

Edite os arquivos de origem; alterações feitas diretamente em `dist/` serão substituídas no próximo build.

## Build e deploy

Para hospedar na raiz de um domínio, use:

```sh
npm run build
```

Publique o **conteúdo de `dist/`** em uma hospedagem estática. Quando o serviço pedir configurações de build, informe `npm run build` como comando e `dist` como diretório de saída. Use Node.js 22 ou superior no ambiente de build.

### GitHub Pages

Um site de projeto no GitHub Pages fica em um subdiretório. Para este repositório, o caminho base é **`/PORTIFOLIO/`**, com a mesma capitalização do nome do repositório.

O workflow `.github/workflows/pages.yml` permite iniciar a publicação manualmente:

1. No repositório, abra **Settings → Pages**.
2. Em **Build and deployment → Source**, selecione **GitHub Actions**.
3. Abra **Actions** e selecione o workflow de publicação do Pages.
4. Clique em **Run workflow** e acompanhe a execução.
5. Após uma execução bem-sucedida, consulte o endereço publicado em **Settings → Pages** ou no resultado do workflow.

O workflow é acionado manualmente; um commit, por si só, não inicia a publicação. Estas instruções não indicam que um deploy já foi realizado.

Se preferir gerar os arquivos para publicação manual no Pages, use uma das opções:

```sh
BASE_PATH=/PORTIFOLIO/ npm run build
```

Ou, sem depender da sintaxe de variável de ambiente do terminal:

```sh
node scripts/build.mjs --base /PORTIFOLIO/
```

Publique a pasta `dist/` gerada com esse caminho base. Para voltar ao preview local na raiz, execute novamente `npm run build` sem `BASE_PATH`.

## Verificação antes de publicar

Execute `npm test` e `npm run build`, abra o preview e confira a navegação, os cases e a apresentação em telas pequenas. Revise os dados pessoais e o destino do contato antes de compartilhar o site. O projeto é estático: não inclui painel administrativo, envio de formulário ou armazenamento de mensagens.

Documentação oficial: [Como criar um site no GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site).
