# site/ — implementação em Astro

Esta pasta é a **implementação**. O protótipo aprovado continua na raiz do repositório,
intacto, e é de lá que sai o pacote `dist/` para a prévia.

## Por que Astro

É o framework com integração completa no Wix Headless: além de hospedar, o Wix cuida de
autenticação, SEO, analytics e monitoramento. Com qualquer outro framework — ou com HTML
estático puro — essas peças ficam por nossa conta, e o SEO renderizado no cliente seria um
problema, já que o briefing coloca SEO como requisito que não pode ser perdido.

## Como rodar

```bash
cd site
npm install        # só na primeira vez
npm run dev        # desenvolvimento, com recarga automática
npm run build      # gera site/dist/client (páginas) e site/dist/server (Worker)
npm run preview    # serve site/dist/client em http://localhost:4321 — LOCAL, não envia nada
```

A build **precisa ser servida por HTTP** para ser vista corretamente: os caminhos são
absolutos (`/assets/...`, `/o-clube`) e não resolvem abrindo o arquivo direto no navegador.

> **`npm run preview` não é `wix preview`.** O primeiro é o nosso servidor local
> (`scripts/servir.mjs`) e nunca sai da máquina. O segundo sobe a build para os
> servidores do Wix. Não existe script `release` neste projeto de propósito — ver
> a regra no topo de `AGENTS.md`.

## Hospedagem no Wix (desde 21/10/2026)

O projeto foi conectado ao site do cliente pelo attach e passou a ter a
integração Astro do Wix, no formato do projeto de referência do kit:

| Peça | Para quê |
|---|---|
| `@wix/astro` | login automático: rotas `/api/auth/login` e `/api/auth/logout` |
| `@wix/astro-pages` | páginas hospedadas pelo Wix (login, checkout) |
| `@astrojs/react` | exigido pelos componentes do kit; nossas páginas não usam React |
| `@wix/astro-wix-hosting-adapter` | build para o servidor do Wix (Cloudflare Workers) |

`output: 'server'` liga o servidor, mas **toda página nossa declara
`export const prerender = true`** e continua saindo pronta na build. Só as rotas
da integração rodam por requisição. Isso também preserva a trava de
`interno/[doc].astro`: com o servidor ligado, rota dinâmica sem `prerender`
ignoraria o `getStaticPaths` e responderia a qualquer endereço — inclusive em
produção.

Três desvios do projeto de referência, todos de propósito:

- **`wrangler.jsonc` na raiz.** O adaptador 3.0.4 monta um caminho de Windows
  (`C:\…`) que o Cloudflare lê como URL e a build quebra. Com o arquivo na raiz o
  adaptador não gera o dele. A limpeza que ele faria no fim da build é refeita
  pela integração `limpaWranglerDoServidor` no `astro.config.mjs` — sem ela o
  deploy no Wix recusaria o Worker. Detalhes no comentário do próprio arquivo.
- **`wix({ robots: false })`.** A rota de robots da integração copia o robots do
  site no ar; a prévia herdaria o "pode indexar". O nosso segue `INDEXAVEL`.
- **Sem Tailwind, e `npm run preview` local.** A referência usa Tailwind e
  `"preview": "wix preview"`; aqui o design é o do protótipo e o preview é o
  servidor das verificações.

`astro preview` não funciona com esse adaptador (a prévia do Cloudflare exige o
`wrangler.json` que o deploy precisa que seja apagado). Para testar com servidor
— login, rotas de API — o caminho é `wix dev`.

As páginas de template que o attach copiou (blog, login, conta, com Tailwind)
estão em `_modelo-wix/`, fora da build, como referência.

## Estrutura

```
site/
  src/layouts/Base.astro    casca comum: head, barra de prévia, chave de modo, header, rodapé
  src/pages/*.astro         uma rota por página (index, o-clube, como-funciona, …)
  public/assets/            CSS, JS, imagens — servidos como estão
```

O item ativo do menu é calculado a partir da rota, em vez de escrito à mão em cada página.
Fora isso, o markup é o mesmo do protótipo.

## O interruptor da virada

`src/config.ts` tem uma constante só, `PRODUCAO`, e dela saem quatro coisas que
precisam mudar juntas no dia em que o site assumir o domínio:

| | `false` (prévia) | `true` (produção) |
|---|---|---|
| `robots` | `noindex, nofollow` | `index, follow` |
| endereço nas metatags e no canônico | `instant-…wix-site-host.com` | `www.clubecriacionista.com` |
| links internos | `/o-clube.html` | `/o-clube` |
| links de post | `/post/<slug>.html` | `/post/<slug>` |
| botão Entrar | aviso de "em construção" | `/api/auth/login` |
| `robots.txt` | `Disallow: /` | `Allow: /` + link do sitemap |

As duas formas de URL existem porque os dois modos servem o site de jeitos
diferentes: a prévia é uma pasta de arquivos estáticos (precisa do `.html`), e a
produção roda em SSR depois do `attach` (a rota não tem extensão). Por isso
nenhum link interno é escrito à mão — todos passam por `caminho()`, e o portador
gera as chamadas.

O `/post/<slug>` sem extensão não é estética: é **exatamente** o endereço que os
posts já têm hoje em clubecriacionista.com. Manter a forma é o que impede a
virada de jogar fora os links que já circulam.

Testado nos dois modos. Trocar a constante, rodar `node scripts/port-astro.js`
e `npm run build`.

## Páginas de post

`src/pages/post/[slug].astro` gera uma página por post do blog, a partir de
`listarPostsCompletos()`. **Não é gerada pelo portador** — rodar o portador não
a apaga.

O corpo vem como conteúdo rico do Wix (Ricos). Em vez de puxar React e o pacote
`@wix/ricos` para dentro de um site estático, `src/dados/ricos.ts` converte a
árvore em HTML. Ele cobre os seis tipos de nó que os 12 posts usam — levantei
antes de escrever — e **avisa na build** se aparecer um tipo desconhecido, em
vez de sumir com o conteúdo em silêncio.

A capa só aparece no topo quando não é a primeira imagem do corpo: o Wix adota
a primeira imagem como capa, e em 10 dos 12 posts as duas são a mesma.

## robots.txt, sitemap.xml e a página 404

Três arquivos que não vinham do protótipo e que existem por causa da virada de
domínio. Os três são gerados, não escritos à mão:

```
src/pages/robots.txt.ts     sai de INDEXAVEL — vira Allow sozinho na virada
src/pages/sitemap.xml.ts    as páginas + os 12 posts, com a URL do modo atual
src/pages/404.astro         o que responde a link antigo fora do REDIRECTS
```

O **sitemap** importa mais no dia da virada do que hoje: o Google precisa
reaprender o site inteiro de uma vez — as páginas, que mudam de endereço, e os
posts, que mantêm o `/post/<slug>` de propósito. A lista de páginas é
descoberta por `import.meta.glob`, então página nova entra sozinha; lista
escrita à mão envelheceria em silêncio.

O **404** existe porque o `REDIRECTS` cobre as URLs antigas que conhecemos, e
não as que não conhecemos: link salvo por um pai, endereço compartilhado em
grupo de WhatsApp, resultado velho de busca. Ela é a única página com
`naoIndexar`, porque em build estática o arquivo também responde em
`/404.html`, com status 200 — e aí o `noindex` não pode depender do host.

Nenhuma das três é gerada pelo portador: rodar `port-astro.js` não as apaga.

## Página de política de privacidade

`politica-de-privacidade.html`, na raiz, **é gerada** por
`node scripts/gera-privacidade.js`: a casca (head, barras, cabeçalho, rodapé,
scripts) é copiada de `contato.html` em vez de reescrita, para não divergir do
resto. Só o miolo é da página. Depois, `node scripts/liga-privacidade.js`
aponta os links de consentimento dos formulários para ela e põe o item no
rodapé de todas as páginas — os dois scripts são idempotentes.

O texto é **minuta**: cobre o que o site coleta hoje e o artigo 14 da LGPD
(dado de criança exige consentimento específico do responsável), e tem 12
campos marcados `A DEFINIR` que só o cliente preenche — CNPJ, encarregado,
prazos de retenção, meio de pagamento. A tarja de "minuta para revisão" no
topo sai junto com eles.

## Redirecionamentos

`REDIRECTS`, em `src/config.ts`, mapeia as URLs do site antigo (`/institucional`,
`/recompensas`, `/eventos`, `/contact-9`, `/blog`). Desde que o servidor foi
ligado, a build escreve `dist/client/_redirects` e os cinco viram **301 de
verdade**, com e sem barra no final. O `npm run preview` local aplica esse
arquivo, então os redirecionamentos são testáveis aqui.

> Na prévia o destino é `/como-funciona.html`; em produção, `/como-funciona`.
> A forma muda pelo mesmo `caminho()` de sempre.

## Andaimes da prévia

A barra "PRÉVIA · …" e a chave "Proposta completa / Piso Wix nativo" são ferramentas nossas,
não fazem parte do site. Ligam e desligam em `src/andaimes.ts`:

```ts
export const MOSTRAR_ANDAIMES = false;   // true = prévia interna, false = site limpo
```

Trocar e rodar `npm run build` de novo. Hoje está em `false`.

## Documentos internos

`src/pages/interno/[doc].astro` serve documentos de trabalho nossos, que não
fazem parte do site. Hoje há um: **`/interno/pendencias.html`**, o questionário
com as 34 informações que só o cliente pode dar — cada uma delas corresponde a
um `A DEFINIR` que está hoje no site.

A rota é dinâmica de propósito. `getStaticPaths()` devolve lista vazia quando
`PRODUCAO` é `true`, e aí nenhum arquivo é gerado: em produção a build cai de
23 para 22 páginas e a pasta `interno/` não existe. Um arquivo solto em
`public/` seria publicado junto com o site no dia da virada e ninguém notaria —
assim não há nada para lembrar de apagar.

Fica fora do `sitemap.xml` (ele só varre `src/pages/*.astro`, sem subpasta),
fora do menu e com `noindex`. Quem chega lá é porque recebeu o endereço.

O que a pessoa digita fica no `localStorage` do navegador dela — ninguém vê as
respostas de ninguém, e nada é enviado. O botão **Gerar respostas** monta um
texto agrupado por seção, com a lista do que ainda falta no fim, e copia para a
área de transferência. É o que volta para nós.

Verificação: `node scripts/check-pendencias.js http://localhost:4321` — 21
checagens, incluindo o rascunho sobreviver a um recarregamento.

## Login de membros

O login acontece no **nosso** formulário — `src/pages/entrar.astro`, no design
system do site — e não numa página do Wix. É o modelo do kit: o formulário manda
os dados para as rotas da integração (`POST /api/auth/login`, `/signup`,
`/verify-email`), que gravam a sessão no cookie `wixSession`.

| Arquivo | O que faz |
|---|---|
| `src/pages/entrar.astro` | entrar, criar conta, código de verificação de e-mail, aviso de aprovação do dono, "esqueci minha senha" |
| `src/sessao.ts` | o cabeçalho em todas as páginas: "Entrar" para visitante, "Olá, Ana" e "Sair" para membro |
| `src/captcha.ts` | a caixa "Não sou um robô" (reCAPTCHA Enterprise, chave do Wix) |
| `src/login-captcha.ts` | o POST de login/cadastro **com** o token do reCAPTCHA |
| `src/wix/members/*` | código do kit, **sem alteração** — sessão, leitura do membro, interpretação das respostas |

Três coisas que não estão na documentação do kit e foram descobertas testando:

- **O site exige reCAPTCHA visível.** Testado contra a rota, com tokens falsos:
  o Wix ignora `invisibleRecaptchaToken` ("missingCaptchaToken") e lê
  `recaptchaToken` ("invalidCaptchaToken"). Por isso a caixa visível, e não o
  invisível que a documentação recomenda em geral. Se o dono mudar a
  configuração de membros no Wix, a troca está descrita em `src/captcha.ts`.
- **O cookie `wixSession` não é HttpOnly**, ao contrário do que diz um
  comentário do kit (a integração grava só `path` e `secure`). É o que permite
  o cabeçalho ler o papel do token sem ir à rede e não piscar "Entrar" para
  quem já está logado.
- **"Esqueci minha senha" não existe nas rotas da integração.** Usa
  `recovery.sendRecoveryEmail` de `@wix/identity`, que manda um link para a
  página de nova senha do próprio Wix. A resposta é a mesma exista ou não a
  conta, para não revelar quem é cadastrado.

O cadastro exige marcar que quem cria a conta é maior de idade e responsável
pela criança — é a regra da seção 4 da política de privacidade.

**Para testar com conta de verdade**, o `wix dev` precisa rodar na porta
**4321**: é a única que o attach liberou para o login voltar
(`allowedRedirectUris`). Em outra porta o Wix recusa a volta depois de entrar.
Pare o `npm run preview` antes, que ocupa a mesma porta.

Verificação sem conta real: `node scripts/check-login.js` — 41 checagens.

## Formulários (Wix Forms, desde 21/10/2026)

Contato e newsletter enviam de verdade, para o **Wix Forms** do cliente:

| formulário | no Wix | o que acontece no envio |
|---|---|---|
| Contato (`/contato`) | "Contato do site" | o envio fica no painel e cria/atualiza o contato no CRM |
| Newsletter (home, `#educadores`) | "Newsletter para educadores" | idem, e o e-mail entra **inscrito** no e-mail marketing do Wix (campo `CONTACTS_SUBSCRIBE`) |

Painel: <https://manage.wix.com/dashboard/947bef68-f229-4456-956e-087f824170fd/wix-forms>
— lá o dono edita campos, textos, agradecimento e **notificações** (quem recebe
o aviso de envio novo).

- **Os campos são do painel, não do código.** `src/formulario-wix.ts` desenha o
  que vier em `form.fields`, com as classes do protótipo; renomear, reordenar,
  acrescentar ou tornar obrigatório no painel reflete no site **na próxima build**
  (o esquema é lido na build e embutido na página). O envio é sempre ao vivo.
- Validação, regras ("Outro" mostra "Qual é a sua função?") e envio são do kit
  (`src/wix/forms/`, não editar). As mensagens do kit vêm em inglês;
  `formulario-wix.ts` traduz.
- No protótipo (raiz) os formulários continuam com o envio de mentira. O portador
  troca os campos escritos à mão pelo `<div data-campos>` e tira os blocos
  `/* prévia:inicio */ … /* prévia:fim */` dos scripts (ver `FORM_WIX` em
  `scripts/port-astro.js`).
- "Cancelar inscrição" não tem formulário: todo e-mail do e-mail marketing do Wix
  traz o link de descadastro. Um campo "digite seu e-mail para sair" deixaria
  qualquer pessoa tirar o e-mail de outra.
- Doação continua prévia: depende do pagamento (CNPJ).

Como foram criados: `node scripts/seed-formularios.mjs scripts/formularios.plan.json`
(cópia do seed do kit com o tipo `subscribe`; é aditivo — rodar de novo não duplica
nem altera). IDs em `src/formularios.ts`. Conferir envios e inscrições (só leitura):
`node scripts/confere-envios.mjs`.

> **Cuidado com o `deploy.mjs` do kit:** ao instalar a vertical forms ele reinseriu
> `vite: { plugins: [tailwindcss()] }` no `astro.config.mjs` (mesma quebra do
> attach). Depois de qualquer `deploy.mjs`, confira e apague — o site não usa Tailwind.
> E instalar pacote, rodar `astro build` ou o portador com o `wix dev` rodando deixa
> o cache do Vite velho ("file does not exist … deps_ssr/…"): pare, apague
> `node_modules/.vite`, suba de novo e **abra cada página e rota `/api/clube/*` uma
> vez** antes de testar — a primeira passada reorganiza o cache (pode dar um 500),
> a segunda já responde certo.

## Inscrição do membro pesquisador (passo 4a, desde 22/10/2026)

`/cadastro` (todos os "Inscrever meu filho" apontam para lá). Página escrita à mão,
o portador não a gera nem apaga.

- **Dados:** 4 coleções no CMS do cliente — `Guardians` (responsável: nome, CPF,
  telefone), `Researchers` (criança: primeiro nome, ano de nascimento, apelido
  único, avatar), `GuardianLinks` e `Authorizations` (texto aceito, versão, data).
  **Todas ADMIN nas 4 permissões**: o navegador não lê nem grava nada nelas.
  Criação: `node scripts/cria-colecoes.mjs` (aditivo; confere permissões no fim).
- **Servidor:** `src/pages/api/clube/{painel,cadastro,revogar}.ts` (prerender false).
  Cada um lê o membro **da sessão** (`fetchCurrentMember`), valida tudo de novo
  (`src/clube/regras.ts`, as mesmas regras do navegador) e só então grava com
  `auth.elevate` (`src/clube/servidor.ts`). Nunca aceitam memberId do navegador.
  Só JSON e da mesma origem (`src/clube/http.ts`) — o Wix exige `checkOrigin:false`.
- **Regras:** CPF com dígito verificador e único por conta; apelido de 3–20, único
  e sem o nome da criança; ano de nascimento para 9–13 anos (±1); até 6 crianças;
  autorização de participação obrigatória, a de fotos/vídeos opcional; o
  responsável retira qualquer uma pelo painel (sem participação a criança fica
  `suspended`). Textos dos termos em `TERMOS` — mudou o texto, mude `VERSAO_TERMOS`.
- **Avatares:** 8 ilustrações em SVG (`src/clube/avatares.ts`), sem foto.
- Na prévia estática (ZIP) a página avisa que a inscrição não funciona ali.

Verificação: `node scripts/check-cadastro.js` — 28 checagens com o servidor simulado.
Permissões: `node scripts/check-permissoes.mjs` — visitante anônimo tenta ler/gravar (espera 403).
Conferir o gravado (só leitura, CPF mascarado): `node scripts/confere-cadastro.mjs`.

## Lançamento: o que muda no modo produção (22/10/2026)

Domínio principal: **www.clubecriacionista.org** (`SITE` em `src/config.ts`).

- **Marcações no protótipo:** `data-previa` = aparece só na prévia, some no modo
  produção (o portador escreve `hidden={PRODUCAO}`); `data-producao hidden` = só no
  modo produção (vira `hidden={!PRODUCAO}`). Hoje marcados: linha do tempo e "Quem
  está por trás" (O Clube — esperam datas, nome, bio e foto), temas propostos
  (Estudos), experimentos (Home), depoimentos e formulário de doação (Doe — no lugar,
  "doações em breve"), vitrine de exemplo (Loja — no lugar, os prêmios reais via
  `/api/loja/premios`), regulamento do concurso, botões e link de Transparência, a
  linha "Prévia de reformulação" do rodapé e a tarja de minuta da política.
  Chegou o conteúdo? Tire o `data-previa` do bloco e rode o portador.
- **Links do site antigo** (`https://www.clubecriacionista.com/post/…`, `/blog`,
  categorias) viram links internos no portador.
- **Redirecionamentos** do site antigo: `REDIRECTS` em `src/config.ts` (conferidos
  contra o sitemap do site antigo). Rota dinâmica não funciona com `build.format:
  'file'` — liste um por um.
- **Verificação do modo produção:** troque `PRODUCAO` para `true`, rode o portador e a
  build, sirva e rode `node scripts/check-producao.js` (72 checagens: nada de "A
  DEFINIR/EXEMPLO/PRÉVIA" visível, nenhum `.html`, nenhum link para o .com, nenhum
  "em construção", Google liberado, canônico no .org). **Volte `PRODUCAO` para
  `false`** — a prévia e o ZIP da agência dependem disso.

## Pontos (passo 4b, desde 22/10/2026)

- **Catálogo:** `src/clube/atividades.ts` — as 14 atividades do programa de recompensas,
  com os pontos. O servidor tira os pontos DAQUI; o navegador só manda a chave.
  Mudou um valor? Mude aqui e em `como-funciona.html` (protótipo).
  Produção científica está com `liberada: false` até decidirem como comprovar.
- **Coleções (ADMIN):** `Submissions` (registro de atividade), `PointsLedger` (extrato,
  só acréscimo), `TeamMembers` (quem aprova).
- **Fluxos:**
  - responsável registra pelo painel em `/cadastro` (participação: evento + data;
    desempenho: média ≥ 8,0 + período) → fica "em análise";
  - equipe confere em `/equipe` → aprova (credita) ou recusa (motivo obrigatório,
    o responsável lê no painel);
  - equipe lança presença direto em `/equipe` (palestra presencial e outras).
- **Trava contra crédito em dobro:** o lançamento no extrato usa o `_id` do registro;
  o Wix recusa inserir `_id` repetido. Aprovar duas vezes ou repetir depois de falha
  não credita de novo. Saldo = soma do extrato (não existe campo de saldo).
- **Equipe:** `node scripts/equipe-adicionar.mjs <email> ["Nome"]` (a pessoa precisa
  ter conta de membro); `--listar` mostra quem está. Para tirar: no CMS, "Equipe do
  clube", Situação = inactive. A equipe vê só o apelido da criança.
- **Resgate (só por pontos, Correios):** o clube cadastra os prêmios no CMS do Wix,
  coleção "Prêmios" (`Rewards`: nome, descrição, foto, custa em pontos, estoque — vazio
  = sem limite —, disponível). O responsável resgata pelo painel e informa o endereço;
  os pontos saem na hora (débito com `_id` = resgate, mesma trava). Depois de debitar o
  saldo é conferido de novo: se dois pedidos simultâneos deixaram negativo, o resgate é
  desfeito. A equipe, em `/equipe`, marca enviado (com rastreio) → entregue, ou cancela
  (motivo obrigatório; devolve pontos e estoque, uma vez só).
- Verificação: `node scripts/check-equipe.js` — 38 checagens com o servidor simulado.

## Como esta pasta é gerada

```bash
node scripts/build-dist.js    # na raiz: copia assets/ para dist/assets/
node scripts/port-astro.js    # na raiz: relê o protótipo e reescreve src/
```

> **A ordem importa.** O portador copia os assets de `dist/assets/`, não de
> `assets/`. Editar `assets/site.css` e rodar só o portador leva a versão
> **antiga** do CSS para o site — sem erro nenhum. Foi assim que a regra
> `[hidden]` chegou ao protótipo e não à build, em 21/10/2026; quem pegou foi o
> `diff-texto.js`.

O portador relê os 8 HTML da raiz e reescreve `src/`. **Enquanto a migração para dados do Wix
não começar**, o caminho seguro é editar o protótipo na raiz e rodar o portador de novo. Depois
que as páginas passarem a buscar dados do Wix, o portador deixa de servir e `site/` vira a fonte.

## Verificação

```bash
cd site && npm run preview                               # em um terminal
node scripts/check.js http://localhost:4321 site/dist/client    # em outro
node scripts/diff-texto.js                               # texto vs. protótipo
node scripts/check-forms.js http://localhost:4321        # formulários (Wix bloqueado)
node scripts/check-pendencias.js http://localhost:4321   # questionário interno
node scripts/check-login.js http://localhost:4321        # login sem conta real
# com o `npx wix dev` no lugar do preview:
node scripts/check-forms-ao-vivo.js                      # formulários contra o Wix, sem enviar
ENVIAR=1 node scripts/check-forms-ao-vivo.js             # + 1 envio de teste em cada (cria registro no painel)
```

O `diff-texto.js` é o que garante fidelidade: compara o texto renderizado de cada página
do protótipo com o da build e acusa qualquer divergência. Hoje: **9/9 idênticas**.
O `check.js` cobre layout e links: **88 verificações**.

O `check-forms.js` cobre um buraco que os outros dois não enxergam.
Os formulários têm `novalidate` — a checagem do navegador está desligada e a
validação em JS é a única que existe. Se ela quebrar, o formulário passa a
aceitar qualquer coisa em silêncio, e tanto o `check.js` quanto o
`diff-texto.js` continuam passando, porque ambos olham a página parada. São
**37 verificações** num Chrome de verdade, com o Wix bloqueado: campos
desenhados do esquema, erros em português, foco no primeiro pendente, a regra
do "Outro", a falha de envio sem rede (avisa e não finge que enviou), valor
mínimo da doação e a regra de que doação mensal só aceita cartão.

## Conexão com o Wix

O SDK já está instalado e a camada de dados escrita:

```
src/wix.ts          cria o cliente a partir de WIX_CLIENT_ID (null se não houver)
src/dados/blog.ts   listarPosts(limite, categoria?) -> PostDoBlog[] | null
scripts/testa-wix.mjs   confere um Client ID antes de mexer em página
```

**Sem Client ID nada quebra.** `listarPosts` devolve `null` e as páginas ficam com
o conteúdo fixo. Isso é de propósito: dá para trabalhar no layout sem acesso ao Wix.

Para ligar:

```bash
cp .env.example .env          # e preencher WIX_CLIENT_ID
node scripts/testa-wix.mjs    # confere antes de mexer em página
```

O Client ID sai de *Configurações › Desenvolvimento e integrações › Headless Settings*
no painel de `clubecriacionista.com`. O site do cliente é só **fonte de dados** — nada
é publicado nele. O porquê e os riscos estão em `wix-handoff/falta-funcionalidade.md`.

> `@wix/blog` está fixo na 1.0.673, sem `^`: a 1.0.682 exige um pacote interno que
> nunca foi publicado e faz `npm install` falhar. Detalhe em `package.json`.

### Seções que vêm do Wix

Hoje: **Momento Criacionista** e **Notícias** na home, e o **acervo inteiro** da
página de artigos (cards e abas de filtro).

O portador **continua valendo** — não foi aposentado. No protótipo, os blocos de cards
estão cercados por comentários:

```html
<!-- wix:posts categoria="Notícias" limite="3" cor="tag--news" chamada="Ler notícia" revelar -->
   …cards fixos…
<!-- /wix:posts -->
```

O `port-astro.js` troca isso por `<CardsDePost …>` e deixa os cards fixos **dentro**,
como conteúdo do slot. Quando o Wix responde, aparecem os posts reais; quando não
responde, aparecem os cards fixos. Então o protótipo segue sendo a fonte do layout, e
os cards fixos ganharam uma segunda função: são o plano B.

Para marcar um bloco novo: `node scripts/marcar-posts.js` (as âncoras ficam lá dentro),
depois `node scripts/port-astro.js`.

O que o componente renderiza está em `src/components/CardsDePost.astro`, e ele copia o
markup do card do protótipo. **Mudou o visual do card lá, tem de mudar aqui também** —
é o preço de a seção ter virado dinâmica.

As abas de filtro saem das categorias **que têm post** (`listarCategorias`). O blog do
cliente tem três criadas e nunca usadas — aba que não devolve nada é pior do que aba
nenhuma. No dia em que ele publicar numa delas, a aba aparece sozinha.

As categorias que estavam no protótipo (Origens, STEM, Educação cristã…) foram inventadas
por nós e não existem no blog. Elas continuam no protótipo como plano B, mas não aparecem
quando o Wix responde — adotá-las de verdade exigiria criar categorias e reetiquetar os
12 posts **no site que está no ar**, o que está fora de questão.
