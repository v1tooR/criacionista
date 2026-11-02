# Subir pelo Velo: o que trava e por quê

> **Revisão de viabilidade em 18/10/2026:** leia primeiro
> [validacao-wix.md](validacao-wix.md). Foi encontrado um fluxo oficial de
> migração do site existente para um frontend próprio hospedado no Wix, mantendo
> o plano. Os resultados abaixo documentam as tentativas anteriores; não provam
> exclusividade das permissões ao proprietário nem que o novo fluxo esteja bloqueado.
> O diagnóstico citado abaixo também precisa de correção antes de servir como
> critério de liberação: contém `get-or-create` e considera somente erros 403.

> **Desfecho em 21/10/2026.**
>
> - **Destravou com a sessão do proprietário.** Com o CLI logado como
>   `eliezer.militao@gmail.com`, todas as chamadas que davam 403 passaram. Fica
>   confirmado na prática o que este documento inferia: a barreira era de
>   identidade, e a do proprietário atravessa.
> - **O attach foi executado** e criou: companion app `58db6ce3-6b14-4839-b6c5-ebc9a60cfbd1`
>   instalado no site, projeto de hospedagem com base em
>   `https://eliezermilitao.wixsite.com/clube-criacionista`, variáveis de
>   ambiente e `site/wix.config.json`. **Nada foi publicado** (`frontend.serving: false`).
> - **Mas o attach não é o fluxo oficial de migração**, e isso importa. O
>   *Go Headless* do painel trabalha com dois sites: o `wix release` vai para um
>   site filho, criado só para prévias, e a troca de domínio é um passo separado
>   (`finalize-migration`), com *Switch back*. O attach amarrou o projeto
>   **direto no site no ar**: um `wix release` a partir de `site/` publicaria no
>   domínio do cliente, sem o degrau da prévia. Ver
>   `.agents/skills/wix-headless-kit/guides/migration.md`.
> - **O diagnóstico foi corrigido**: não sonda mais `get-or-create` com token de
>   site (foi ele que criou o companion app na primeira rodada com a sessão do
>   proprietário, antes do attach), separa 404 de 401/5xx/rede, e lê o app do
>   `wix.config.json`.
> - O attach também copiou páginas de template (blog, login, conta) que usam
>   Tailwind e quebravam a build; foram movidas para `site/_modelo-wix/`.
>
> Próximo passo recomendado: seguir pelo fluxo oficial do painel, não por
> `wix release` desta pasta.
>
> **Atualização, mesmo dia:** a seção *Headless Migration* **não aparece** no painel
> deste site (a página termina em "Link de front-end" e "Tools and help"). O assistente
> do Wix confirmou duas coisas: a migração pode não estar liberada ou o site não atende a
> um critério interno não documentado; e **publicar um frontend headless fora da migração
> não garante "Switch back"**. Decisão: a virada fica condicionada à liberação da migração
> oficial. Prévias seguem pelo ZIP ou por `wix preview`, que segundo a documentação do CLI
> "doesn't … publish a headless project's site".

Investigado em 15, 16 e 18/10/2026. Tudo abaixo é saída real de chamada à API do
Wix, não suposição. Dá para refazer o diagnóstico inteiro com um comando:

```bash
node scripts/diag-velo.mjs
```

---

## A pergunta

O frontend que construímos em Astro pode ser **conectado ao site do cliente** e
publicado a partir dele, assumindo `clubecriacionista.com` — em vez de viver num
projeto headless separado, na nossa conta?

## A resposta curta

**A arquitetura funciona. A nossa conta não consegue executá-la.**

As permissões `VELO.*`, que governam os projetos de hospedagem headless, são
reservadas ao **proprietário** da conta Wix. Não existe papel que o cliente possa
atribuir para conceder — conferimos os 30 papéis que o Wix oferece. Coproprietário,
o mais alto atribuível, já está concedido e não alcança.

---

## O que "subir pelo Velo" quer dizer aqui

Velo é o nome do ambiente de desenvolvimento do Wix (antigo Wix Code; os endpoints
ainda se chamam `wix-code-*`). Um projeto headless hospedado pelo Wix é, por baixo,
um **app project do Velo** amarrado ao metasite.

O caminho completo tem três etapas:

| Etapa | Comando | O que cria |
|---|---|---|
| 1. Attach | `attach.mjs` | um *companion app* OAuth no site + o app project de hospedagem + as variáveis de ambiente |
| 2. Deploy | `wix build` | o pacote do frontend |
| 3. Release | `wix release` | um *deployment* dentro do app project, e aponta o slot `prod` para ele |

A etapa 1 é a que falha. E a 3 falha pelo mesmo motivo — ver mais abaixo.

---

## O que foi tentado

| Quando | O quê | Resultado |
|---|---|---|
| 14/10 | App OAuth criado à mão no painel (*Headless Settings*) | Criado: `ba17808f-…`, nome "Site Clube Criacionista". É um app OAuth comum, **não** um companion app |
| 15/10 | `attach` com o acesso inicial | 403 |
| 15/10 | Cliente criou papel personalizado "General Manager" com permissões máximas | 403 |
| 15/10 | Logout + login no CLI | 403 |
| 15/10 | Cliente promoveu a conta a **Administrador (coproprietário)** | 403 |
| 16/10 | `attach` de novo, já com o papel propagado | 403, agora com a permissão nomeada |
| 18/10 | Reteste, dois dias depois, sem mexer em nada | **Idêntico** |

---

## As evidências

### 1. Não é permissão de site

As duas sondas de controle passam, inclusive a que exige permissão elevada:

```
200  /site-properties/v4/properties
200  /roles-management/v2/contributors/query     ← no dia 15 isto dava PERMISSION_DENIED
```

O papel de coproprietário chegou e funciona. O que é negado é outra coisa.

### 2. Não é token velho

O `attach.mjs` pega o token com `npx wix token --site` **a cada execução**. Nunca
foi cache: todo 403 foi dado a um token emitido segundos antes.

### 3. Não é atraso de propagação

O dia 16 e o dia 18 devolvem exatamente a mesma coisa. Dois dias não mudaram nada,
então não é fila do lado do Wix.

### 4. Não é papel faltando

A lista completa de papéis da conta (`/roles-management/roles`, 30 papéis
predefinidos) **não tem nenhum papel de desenvolvedor ou Velo**. A hierarquia
termina assim:

| Papel | `restrictFromLevel` |
|---|---|
| `Owner` | `NoRestriction` |
| `Admin (Co-Owner)` ← nós | `Account` |
| os outros 28 | mais restritos ainda |

Não há o que pedir ao cliente. Ele já deu o máximo que o painel permite dar.

### 5. A identidade de conta é aceita; a de site é recusada

Este é o detalhe que fecha o diagnóstico:

```
403  get-or-create  com token de SITE      (negado)
400  get-or-create  com token de CONTA     "missing metaSiteId in request context"
```

Com token de conta o endpoint **responde** — reclama que falta o site, não que falta
permissão. Ou seja: a chamada não é inválida nem desconhecida. É uma decisão de
autorização sobre a identidade de site do coproprietário.

### 6. Não é só o attach — o release cai igual

Chegamos a cogitar que o proprietário pudesse rodar o attach uma vez e nós
seguirmos sozinhos. Não dá:

```
403  /_api/wix-code-app-projects/.../app-projects/{app}        [VELO.APP_PROJECT_READ]
403  /_api/wix-code-app-releases/.../app-releases/query        [VELO.APP_PROJECT_READ]
403  /_api/wix-code-app-deployments/.../app-deployments/query  [VELO.APP_DEPLOYMENT_READ]
```

O segundo é exatamente o que o `wix release` usa. Até a **leitura** é negada, então
escrita está fora de questão. Toda publicação precisaria do proprietário, não só a
primeira.

### 7. O companion app ainda não existe

```
404  /_api/companion-apps/v1/companion-apps/{app}
```

O `ba17808f-…` que pegamos no painel é um app OAuth comum, com
`allowedDomains: []` e `allowSecretGeneration: false`. Serve para **ler** o blog do
cliente (e é o que usamos hoje), mas não é o companion app que o attach criaria.

---

## Os caminhos

### A. O proprietário autentica o CLI uma vez — recomendado

O Eliézer (`eliezer.militao@gmail.com`) roda `npx wix login` **na nossa máquina**.
O navegador abre, ele digita a senha dele, ninguém mais vê. A sessão fica gravada
em `~/.wix/auth/` e vale pelos dias seguintes — comprovado: a sessão de 15/10 às
16:21 ainda respondia no dia seguinte.

A partir daí attach e releases rodam sem ele presente.

**O custo, dito claramente:** é uma sessão persistente com o alcance do
proprietário. Não é um acesso pontual. O cliente precisa autorizar sabendo disso, e
revoga saindo da conta ou trocando a senha. Se preferir não deixar sessão na nossa
máquina, ele roda na dele — funciona igual, mas precisa estar disponível em toda
publicação, e vamos ter várias rodadas.

### B. Transferência de propriedade

Resolve tudo e é definitivo. Mas entrega o controle da conta — cobrança inclusive —
à agência. Difícil de justificar para o cliente, e desconfortável para nós.

### C. Manter o frontend na nossa conta

O projeto headless que já roda em
`instant-fernowjrmjwg-vtorsilvasantos-140f.wix-site-host.com` é nosso, e nele
publicamos à vontade. Os posts do blog já vêm do site do cliente pelo Client ID
público, sem depender de nada disto.

Os dois buracos: o login de membros precisaria dos domínios liberados no app OAuth
do cliente (hoje `allowedDomains: []`), e o domínio exigiria **um Premium novo**, no
nosso projeto — sem reaproveitar o do cliente. Custo recorrente a mais para um clube
pequeno.

---

## O que não depende disso

Vale repetir, porque é fácil confundir o bloqueio com paralisia:

- **os 12 posts do blog** já são lidos do site do cliente, pelo Client ID público;
- as 9 páginas, as páginas de post, redirecionamentos, sitemap, robots e 404 estão
  prontos e testados nos dois modos;
- as rodadas de revisão correm normalmente na prévia.

O attach só é necessário para **login de membros**, **envio real dos formulários** e
**o domínio**. Nada além disso está esperando por ele.

---

## Para levar ao suporte do Wix

Se alguém abrir chamado, estas são as perguntas, já com o contexto:

1. `VELO.APP_PROJECT_READ` e `VELO.APP_DEPLOYMENT_READ` podem ser concedidas a um
   colaborador `Admin (Co-Owner)`, ou são mesmo exclusivas do `Owner`?
2. Existe papel, sinalizador ou convite específico de desenvolvedor que conceda
   acesso a app projects sem transferir a propriedade?
3. O Premium atual do site cobre um domínio servido por um projeto headless
   amarrado a ele, ou seria uma assinatura separada?

Dados do site para o chamado:

| | |
|---|---|
| metaSiteId | `947bef68-f229-4456-956e-087f824170fd` |
| app OAuth | `ba17808f-8c79-4119-bbe3-4e2e2e7d9184` (criado 14/10/2026) |
| conta negada | `259ddfb0-dde4-49f6-9912-be6f153f29c8` · vtorsilvasantos@gmail.com |
| papel | Administrador (coproprietário) + General Manager, ativo desde 07/08/2026 |

---

## O que já está confirmado na documentação

Para que não se perca: a arquitetura **é** suportada. Projeto headless gerenciado
pelo Wix aceita domínio próprio, com certificado SSL emitido e renovado
automaticamente, mediante plano Premium. Num projeto gerenciado o visitante
permanece no mesmo domínio tanto no frontend quanto nas páginas hospedadas pelo
Wix. O impedimento é só de permissão.

- [Build and Deploy com o CLI](https://dev.wix.com/docs/go-headless/wix-managed-headless/full-integration-astro/development/build-and-deploy-with-the-cli)
- [Sobre o Wix CLI para Headless](https://dev.wix.com/docs/go-headless/develop-your-project/wix-managed-headless/about-the-wix-cli-for-headless)

---

## Como saber que destravou

No dia em que alguém mexer nas permissões, ou em que o proprietário fizer login:

```bash
node scripts/diag-velo.mjs
```

Ele responde `DESTRAVOU` ou `AINDA TRAVADO`, em meio minuto, antes de valer a pena
tentar o attach. Hoje (18/10/2026) responde:

```
AINDA TRAVADO: 5 chamada(s) de attach/release negadas com 403.
```
