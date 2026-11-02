# Validação da proposta Wix — 18/10/2026

## Parecer

**Há um caminho oficial compatível com a proposta de aproveitar o frontend Astro
e manter o negócio no Wix do cliente. A entrega completa ainda não foi validada
em produção.** Não é correto prometer ausência de problemas ou afirmar que basta
entrar com a conta do proprietário para terminar o projeto.

## O caminho oficial encontrado

O Wix documenta a substituição do frontend de um site existente por código
hospedado no próprio Wix, inclusive aproveitando um frontend já construído.
O processo começa em **Headless Settings → Headless Migration → Go Headless**.
Há prévia antes da troca, preservação do plano atual e possibilidade de retorno
ao frontend antigo. A disponibilidade precisa ser conferida no painel deste site.

Fonte: [Moving Your Site to a Custom Frontend](https://support.wix.com/en/article/wix-headless-moving-your-site-to-a-custom-frontend).

O changelog consultado anuncia essa migração em **18/10/2026**:
[Developer Changelog](https://dev.wix.com/docs/changelog).

O comando genérico `headless link` provisiona outro negócio/site; não deve ser
confundido com a migração do site existente. Para preservar a proposta, o próximo
passo é conferir o fluxo específico do painel e seu prompt com o contexto do site.

Fonte: [Connect an Existing Astro Project](https://dev.wix.com/docs/go-headless/wix-managed-headless/full-integration-astro/get-started/connect-an-existing-astro-project).

## O que foi verificado neste repositório

| Item | Evidência e limite |
|---|---|
| Build atual | `npm run build`, em `site/`, terminou com sucesso: 23 páginas. A saída continua **estática**. Isso não testa SSR nem publicação gerenciada. |
| Blog real | `node --env-file=.env scripts/testa-wix.mjs` retornou 12 posts e 5 categorias. Nenhum conteúdo foi alterado. |
| Integração gerenciada | `site/package.json` ainda não declara a integração Astro do Wix nem o adaptador de hospedagem. `astro.config.mjs` não configura SSR. |
| Login | `site/src/config.ts` mantém `PRODUCAO = false` e o login desligado. A integração autenticada não foi testada. |
| Cliente SDK | `site/src/wix.ts` cria um cliente OAuth para leitura. Sua existência não comprova sessão autenticada de membro. |
| Formulários | Contato e doação validam campos e exibem confirmação local. Não fazem envio real. |
| Loja | Botões de compra e resgate continuam marcados com `data-wip`. |
| Regras do clube | `flows.md` descreve os contratos; não há implementação desses fluxos nas rotas atuais. |

A integração Astro do Wix oferece autenticação automática e extensões de backend,
mas precisa ser instalada e conectada. O estado atual do projeto ainda não demonstra
essas capacidades funcionando.

Fonte: [About the Astro Integration](https://dev.wix.com/docs/go-headless/wix-managed-headless/full-integration-astro/about-the-astro-integration).

## Compatibilidade e trabalho restante

A lista oficial inclui Blog, CMS, Forms, Members Area, Stores e Pricing Plans
entre os apps compatíveis. **Loyalty Program consta como incompatível** nesse
frontend. Portanto, não tratar o programa de pontos como recurso pronto. Isso
também não prova que todas as suas APIs sejam inutilizáveis; qualquer integração
alternativa exigiria validação própria.

Fonte: [Supported and Unsupported Apps](https://support.wix.com/en/article/wix-headless-supported-and-unsupported-apps).

Para o escopo específico do clube, continuam pendentes:

- Implementar e testar vínculo responsável–criança, autorizações e painéis.
- Projetar crédito e débito de pontos com idempotência e proteção contra resgates simultâneos.
- Definir e testar doação pontual/recorrente, inclusive as ações prometidas de pausa e alteração de valor.
- Integrar formulários, catálogo, carrinho e checkout reais.
- Validar SEO na hospedagem final: URLs antigas, 301, canônicos, sitemap, robots e 404.

## Correções de interpretação do velo.md

Os 403 registrados demonstram a recusa das chamadas testadas com aquela identidade.
Não demonstram, isoladamente, que as permissões sejam exclusivas do proprietário
em todas as modalidades. O `400 missing metaSiteId` com token de conta também não
comprova autorização completa: a validação da requisição pode ocorrer antes dela.

As sondas usam o ID de um app OAuth comum onde o texto diz que ainda não existe
o companion app/projeto. Logo, não comprovam a capacidade de publicar em um futuro
projeto corretamente provisionado. Nem foi testado o login do proprietário para
comprovar a solução recomendada no texto original.

`scripts/diag-velo.mjs` tem dois problemas verificáveis no próprio código:

1. Faz POST em `get-or-create`: pode criar recurso. Sua descrição como somente
   leitura é incorreta. Não foi executado nesta revisão.
2. Declara `DESTRAVOU` quando não conta 403, mesmo que ocorram 401, 404, 500 ou
   falha de rede. Ausência de 403 não comprova sucesso de attach ou release.

Não houve novo teste das permissões administrativas nesta revisão. Os 403 citados
continuam sendo evidências das sessões anteriores, não um resultado novo.

## Histórico localizado

Foi encontrado no histórico local do Codex o chat **“Home.html feedback e melhorias”**,
na sessão de **10/09/2026** (horário de São Paulo), ID
`01a08e45-0393-7f00-8163-3b3b95e1421b`.

Pergunta recuperada: “Uma pergunta, para o Wix, você acha completamente possível implementar?”

A resposta discutia **Wix Editor/Studio com Velo**, trabalho manual no layout e
quatro ressalvas: pontos, recorrência, login infantil e upload de vídeos.
A afirmação de viabilidade daquela conversa não validava a publicação deste
frontend Astro por Headless.

Também foi localizado o histórico local do Claude do projeto, sessão
`cca0a7a2-44ce-47af-8344-12dfa216a27f`: discussão Headless em 23/09, tentativas de
attach e promoção a coproprietário em 15/10 e elaboração do `velo.md` em 18/10.
Esse histórico explica a mudança da estratégia original para Astro.

## Critério para confirmar a entrega

Conferir a migração oficial no painel do cliente, provisionar a integração por
esse fluxo e obter uma prévia ligada ao negócio correto. Nessa prévia, comprovar
login, gravação de formulário, leitura atualizada do blog, checkout e o ciclo
cadastro → autorização → envio → aprovação → pontos → resgate. Validar as rotas e
a operação de publicação com a identidade que fará a manutenção.

Somente após essa evidência é possível confirmar a entrega operacional no domínio
principal. Esta revisão não iniciou migração, não publicou e não alterou o site ativo.
