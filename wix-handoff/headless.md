# Wix Headless — como colocar este protótipo no ar

Levantado em 23/09/2026 na documentação oficial do Wix. Os links de cada etapa estão no fim.

## A ideia

No modelo headless, **o site é o nosso código** e o Wix fica atrás, entregando blog, CMS,
membros, loja, formulários, pagamentos e programa de pontos por API. Ou seja: as 8 páginas que
já existem viram o site de verdade, sem remontar nada à mão no editor.

Duas variações:

| | Wix-managed | Self-managed |
|---|---|---|
| Hospedagem | do Wix, com CDN e SSL automáticos | sua (Vercel, Netlify, o que preferir) |
| Autenticação | automática **só** no caminho Astro | você configura |
| Frameworks | Astro (integração completa) ou outros (integração limitada) | qualquer um |
| Quem cuida de deploy e escala | Wix | você |

Para este projeto, o caminho **Wix-managed** é o mais adequado: menos infraestrutura para a
agência manter e o cliente continua com tudo dentro da conta Wix dele.

## Passo 1 — subir a prévia hoje, sem terminal

A pasta `dist/` já está pronta para isso. Gere ou atualize com:

```bash
node scripts/build-dist.js --limpo     # pacote do cliente, sem andaimes
node scripts/build-dist.js             # pacote interno, com a barra de prévia
powershell -ExecutionPolicy Bypass -File scripts\zip-dist.ps1
```

Ela contém as 8 páginas (com `home.html` renomeada para `index.html`, que é o arquivo de
entrada que o Wix procura), o CSS, o JS e só as imagens usadas — 3,56 MB no total.

> **Não use `Compress-Archive`.** No Windows PowerShell 5.1 ele grava os caminhos
> internos do zip com barra invertida (`assets\site.css`), fora da especificação. Quem
> extrai conforme a especificação fica com um arquivo chamado literalmente
> `assets\site.css` na raiz, e o site sobe sem CSS e sem imagem. O
> `scripts/zip-dist.ps1` escreve as entradas uma a uma e confere o resultado.

Depois:

1. Abra **[wix.com/headless/drop](https://www.wix.com/headless/drop)**.
2. Arraste a pasta `dist/` (ou um zip dela) para a área indicada.
3. O Wix hospeda os arquivos, configura SSL e CDN e publica num endereço `*.wix-site-host.com`.
4. Faça login na conta Wix para **salvar** o projeto — sem isso ele não fica guardado.

Limites do upload, conferidos na documentação: **arquivos estáticos apenas** (HTML, CSS, JS,
imagens, fontes, JSON/XML/TXT/MD), **3 MB por arquivo**, **20 MB no total**, e um HTML de
entrada no nível de cima. Vídeo é rejeitado — por isso os nossos vídeos são embeds do YouTube,
que continuam funcionando.

> **Atenção:** cada upload **cria um projeto novo**. Não dá para subir arquivos dentro de um
> projeto que já existe. Depois do primeiro upload, as atualizações passam a sair por
> `npx wix release` (passo 3).

Isso já resolve a entrega da prévia para o cliente: link real, no ar, com HTTPS.

## Passo 2 — usar o site atual do cliente como backend

Este é o ponto que preserva o que já existe. O blog, os posts e o conteúdo **não precisam ser
migrados**: a documentação diz que um site Wix existente pode virar o backend de um ou mais
frontends próprios.

No painel do site atual:

1. **Configurações › Desenvolvimento e integrações › Headless Settings**.
2. Em **Headless clients**, clique em **Create New Client**.
3. Dê um nome (ex.: "Site Clube Criacionista"), escolha o tipo de cliente e confirme.
4. Escolha a stack e clique em **Continue**.
5. Copie o **Client ID** que aparece na lista.

Esse Client ID é o que autoriza o nosso frontend a chamar as APIs do Wix. Em **URLs**, é
preciso liberar os endereços para onde o Wix pode redirecionar (login, checkout).

## Passo 3 — continuar desenvolvendo

- `npx wix dev` — ambiente local com recarga automática.
- `npx wix release` — publica. É o único comando que se repete a cada mudança.
- O cliente administra produto, post, formulário e membro pelo painel, sem código.

Agora que o projeto é Astro, o Wix cuida de **autenticação, SEO, analytics, monitoramento,
segredos e extensões** — não é mais trabalho nosso.

## Login de membro

Com a integração Astro, o Wix expõe duas rotas prontas no próprio site: `/api/auth/login` e
`/api/auth/logout`. Não há cliente OAuth para criar, token para guardar nem sessão para
gerenciar. Os botões que hoje são `data-wip` viram links de verdade:

```html
<a href="/api/auth/login?returnToUrl=/como-funciona">Entrar</a>
```

A mesma rota serve para **entrar e para cadastrar** — a documentação trata os dois no mesmo
fluxo. Depois do login, a identidade do membro entra sozinha em qualquer chamada do SDK:

```ts
import { members } from '@wix/members';
const eu = await members.getCurrentMember();
```

**O que isso custa:** a tela de login é a do Wix, hospedada pelo Wix, com a cara do Wix — não
é o nosso layout. Formulário de login próprio só existe no headless self-managed, e a
documentação é explícita: com a integração Astro quem entra por um fluxo nosso continua
classificado como visitante. Ou seja, a escolha é entre **autenticação automática com tela do
Wix** e **tela nossa com toda a autenticação por nossa conta**.

Dois detalhes de configuração que derrubam o login se passarem batido:

- cada `returnToUrl` precisa estar na lista de **allowed authorization redirect URIs**;
- o campo **login URL** nas Headless Settings precisa ficar **vazio** — preenchê-lo faz o Wix
  procurar uma página de login customizada que não existe.

**O que o Wix Members não resolve sozinho:** uma conta é uma pessoa. O vínculo
responsável↔criança, o saldo de pontos, a autorização assinada e o histórico continuam sendo
dados nossos, em coleções do CMS, com o cálculo rodando em HTTP endpoints no servidor (ver
`flows.md`). Esses endpoints de backend **só existem na integração Astro** — é mais um motivo
para o caminho escolhido.

## Postagem de blog

O cliente continua publicando pelo **painel do Wix**, no mesmo editor de blog de hoje, com os
mesmos papéis (editor, redator, redator convidado). Nada disso passa por código.

O que muda é só de onde sai o HTML: em vez de o Wix montar a página, a nossa página busca os
posts e os desenha dentro do nosso layout.

```ts
import { posts } from '@wix/blog';
const { posts: lista } = await posts.queryPosts({ fieldsets: ['RICH_CONTENT'] }).find();
```

O corpo do post vem como objeto de conteúdo rico, renderizado com `@wix/ricos`.

**Post novo aparece sem release.** O `headless link` troca o Astro para `output: 'server'` e
instala o `@wix/astro-wix-hosting-adapter`: a página passa a ser montada a cada visita. Hoje a
nossa build é estática, então um post novo só apareceria depois de um `wix release` — depois
de conectar, não. Os posts também entram sozinhos no sitemap que o Wix gera.

**O porém que decide tudo:** isso lê o blog **do site ao qual o projeto estiver conectado**. O
projeto que o drop criou é um negócio novo e vazio — zero posts, zero membros. Os posts reais
estão no site `clubecriacionista.com`. Daí a pergunta do passo 2 não ser detalhe:

| Conectar a | Ganha | Custa |
|---|---|---|
| Site atual do cliente | blog, membros, contatos e loja que já existem | o primeiro `wix release` **substitui o frontend que está no ar** naquele endereço |
| Projeto novo (o do drop) | nada é tocado, prévia segura | começa vazio; conteúdo precisa ser recriado ou migrado depois |

A documentação do kit é direta sobre o risco: se já existe um frontend servindo no endereço do
site, o `release` toma o lugar dele — avisar o cliente do endereço e da data **antes**.

> **Versão do Astro.** A página do `headless link` ainda diz "Astro 5, Astro 6 não suportado",
> mas está desatualizada: o `@wix/astro@3.0.1` declara `astro: ^7.2.0` como peer. O projeto
> está em 7.3.8 — compatível.

## O que o Wix entrega por API

Relevantes para este projeto: **Blog** (posts, categorias, tags), **CMS/Wix Data**, **Members**,
**Stores**, **Forms**, **Pricing Plans**, **Events**, **Contacts** e — o mais importante aqui —
**Loyalty**, que é programa de pontos, saldo e recompensas.

Vale examinar o Loyalty antes de escrever o ledger de pontos à mão em Velo (o que está previsto
em `flows.md`). Se ele cobrir crédito, débito e histórico, economiza a parte mais delicada do
backend. **Ainda não verificado** se ele aceita as regras específicas do clube (pontos vinculados
a uma criança que não tem login próprio, validação por um adulto antes do crédito).

## Pendências antes de decidir

- **Custo.** Não levantei preço de plano nem limites do headless. Conferir antes de propor ao cliente.
- **Domínio.** `clubecriacionista.com` hoje aponta para os servidores do Wix (ns10/ns11.wixdns.net)
  e serve o site atual. Apontar o domínio para o projeto headless é um passo a confirmar na
  documentação — e precisa ser combinado com o cliente, porque tira o site antigo do ar.
- **Editor visual.** No headless o cliente perde o editor de arrastar. Ele continua publicando
  conteúdo pelo painel, mas mudança de layout passa a ser tarefa de quem escreve o código.
  Isso precisa estar claro no contrato.
- **Quem mantém.** O site vira um projeto de código. Se a agência não tiver quem mantenha,
  o caminho honesto é montar no Wix Studio à mão mesmo, usando este protótipo como gabarito.

## Fontes

- [About Wix-Managed Headless](https://dev.wix.com/docs/go-headless/wix-managed-headless/about-wix-managed-headless.md)
- [Upload a Static Site](https://dev.wix.com/docs/go-headless/wix-managed-headless/other-frameworks/your-own-frontend/upload-a-static-site.md)
- [What You Can Upload](https://dev.wix.com/docs/go-headless/wix-managed-headless/other-frameworks/your-own-frontend/what-you-can-upload.md)
- [Deploy Your Own Frontend with the CLI](https://dev.wix.com/docs/go-headless/wix-managed-headless/other-frameworks/your-own-frontend/deploy-your-own-frontend-with-the-cli.md)
- [Set Up a Headless Client](https://dev.wix.com/docs/go-headless/authentication/setup/set-up-a-headless-client.md)
- [About Self-Managed Headless](https://dev.wix.com/docs/go-headless/self-managed-headless/about-self-managed-headless.md)
- [Featured Business Solutions](https://dev.wix.com/docs/go-headless/get-started/featured-business-solutions)
- [About the Astro Integration](https://dev.wix.com/docs/go-headless/wix-managed-headless/full-integration-astro/about-the-astro-integration.md)
- [Add Member Login with the Astro Integration](https://dev.wix.com/docs/go-headless/authentication/members/wix-login-page/add-member-login-with-the-astro-integration.md)
- [About Member Login](https://dev.wix.com/docs/go-headless/authentication/members/about-member-login)
- [Connect an Existing Astro Project](https://dev.wix.com/docs/go-headless/wix-managed-headless/full-integration-astro/get-started/connect-an-existing-astro-project.md)
- [create headless link](https://dev.wix.com/docs/wix-cli/command-reference/project-creation/create-headless-link.md)
- [Posts and Stats API](https://dev.wix.com/docs/api-reference/business-solutions/blog/posts-stats/introduction.md)
- [About Sitemaps in the Astro Integration](https://dev.wix.com/docs/go-headless/wix-managed-headless/full-integration-astro/feature-guides/seo/about-sitemaps-in-the-astro-integration.md)
