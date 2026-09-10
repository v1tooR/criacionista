# Plano de implementação — Wix Studio

Este documento transforma o protótipo `index.html` em um plano de construção para Wix Studio. O HTML atual é referência visual; ele não deve ser colado integralmente no Wix porque contém componentes e diretivas próprias (`x-dc`, `sc-if` e `{{ ... }}`).

## Estratégia

1. Construir no Editor os layouts, breakpoints, stacks, repeaters e multi-state boxes.
2. Usar Wix CMS para conteúdo e dados operacionais.
3. Usar os apps nativos para membros, loja, pagamentos e blog sempre que cobrirem a regra.
4. Usar Velo somente para autorização, relacionamentos entre responsável e criança, validação de descobertas, pontos e painéis agregados.
5. Usar Custom Elements apenas para interfaces que não sejam viáveis com elementos nativos.

## Ordem recomendada

### Fase 1 — fundação

- Aplicar tokens de cores, tipografia, espaçamento e raios do Design System.
- Criar header, footer e componentes globais.
- Criar as páginas públicas e seus estados responsivos.
- Instalar/configurar Wix Members, Wix Stores e Wix Blog.
- Criar as coleções descritas em `wix-handoff/collections.md`.

### Fase 2 — conteúdo público

- Home
- O Clube
- Como Funciona
- Artigos e Estudos (CMS e página dinâmica)
- Para quem ensina — recursos + newsletter (Wix Forms/CMS `EducatorSubscribers` + Automations)
- Blog (Wix Blog)
- Vídeos
- Loja
- Doe

### Fase 3 — áreas autenticadas

- Cadastro e escolha de perfil
- Painel do pesquisador
- Enviar descoberta
- Painel do responsável
- Painel do doador

### Fase 4 — regras de negócio

- Relacionar responsável, criança e identidade Wix Member.
- Aprovação de autorizações.
- Envio e validação de descobertas.
- Ledger de pontos (crédito e débito), sem editar saldo diretamente.
- Resgate de produtos por pontos.
- Histórico de compras, doações e comprovantes.
- Recorrência: pausar, alterar e cancelar conforme a API/app escolhido.

## O que deve ser nativo e o que exige código

| Área | Solução preferida | Código |
|---|---|---|
| Layout e responsividade | Wix Studio | mínimo |
| Blog | Wix Blog | mínimo |
| Estudos científicos | Wix CMS + páginas dinâmicas | filtros opcionais |
| Loja em dinheiro | Wix Stores | integração nativa |
| Produtos por pontos | CMS + Velo | necessário |
| Doações | app/plano de pagamento Wix validado no projeto | integração e painel |
| Login e membros | Wix Members | papéis e redirecionamento |
| Newsletter de educadores | Wix Forms + CMS + Automations | duplo opt-in e campo condicional "Outro" |
| Descobertas | CMS + Upload Button | workflow em Velo |
| Pontos | CMS | backend Velo obrigatório |
| Painéis | repeaters/multi-state boxes | consultas via backend |

## Decisões de segurança

- O alias e avatar são a representação pública da criança; o nome real não aparece no ambiente infantil.
- Dados de criança, vínculo familiar, autorização, comprovantes e histórico não podem ser coleções públicas.
- Consultas dos painéis devem passar por web modules no backend e validar o membro atual.
- Pontos devem usar registros imutáveis (`PointsLedger`), e o saldo deve ser calculado ou atualizado apenas no backend.
- Aprovação de descoberta e concessão de pontos são ações administrativas e atômicas.
- Nunca confiar em `memberId`, `childId`, valor de pontos ou status enviados pelo navegador.

## Checklist de passagem do protótipo para o Editor

- [ ] Criar uma seção por bloco da Home.
- [ ] Transformar listas em Repeaters conectados a datasets/CMS.
- [ ] Transformar telas autenticadas em páginas separadas, não abas de demonstração.
- [ ] Aplicar os IDs de `wix-handoff/element-ids.md` antes de ligar o código.
- [ ] Configurar estados vazio, carregando, erro, sem permissão e sucesso.
- [ ] Adicionar o link "Voltar ao topo" ao final de cada seção da Home e o botão flutuante global.
- [ ] Configurar desktop, tablet e mobile no Editor.
- [ ] Criar papéis: `responsavel`, `pesquisador`, `doador`, `validador`.
- [ ] Validar permissões de cada coleção com contas de teste distintas.
- [ ] Testar o ciclo completo: cadastro → autorização → missão → envio → aprovação → pontos → resgate.

## Desenvolvimento local recomendado

Quando o site Wix estiver criado, conecte-o ao GitHub pelo painel de integração local do Wix Studio e clone o repositório gerado pelo Wix. A partir desse repositório será possível:

- implementar `src/backend/*.web.js`, hooks e código de páginas;
- rodar `wix dev` para testar no Local Editor;
- versionar e revisar mudanças;
- gerar preview e publicar pelo Wix CLI.

Não conecte este repositório de protótipo diretamente sem antes comparar a estrutura esperada pelo Wix. O caminho seguro é criar/conectar o site, clonar o repositório Wix e então copiar para ele apenas os artefatos preparados aqui.
