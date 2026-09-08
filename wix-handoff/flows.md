# Contratos dos fluxos Velo

Este arquivo define comportamento e validações antes da implementação no repositório Wix.

## `submitDiscovery(input)`

Entrada: `researcherId`, `missionId`, `format`, e exatamente um conteúdo compatível (`media`, `externalUrl` ou `textContent`).

Backend:

1. Obtém o membro autenticado no servidor.
2. Confirma que ele é o pesquisador ou responsável ativo vinculado.
3. Confirma missão ativa e autorização válida.
4. Valida formato, tamanho e URL.
5. Cria `Submissions` com status `submitted`.
6. Não concede pontos neste momento.

## `approveSubmission(submissionId, reviewNotes)`

Somente papel `validador`/admin:

1. Busca o envio ainda não aprovado.
2. Busca os pontos atuais da missão.
3. Atualiza o envio para `approved`.
4. Insere uma única transação em `PointsLedger`, usando o envio como origem idempotente.
5. Se houver falha parcial, não pode haver crédito duplicado numa nova tentativa.

## `getGuardianDashboard()`

Sem receber `guardianMemberId` do frontend:

1. Obtém o membro autenticado.
2. Busca vínculos ativos em `GuardianLinks`.
3. Retorna apenas alias/avatar, saldo, contagens e históricos permitidos das crianças vinculadas.
4. Nunca retorna nome real ou dados de outra família.

## `redeemReward(researcherId, rewardId)`

1. Valida o vínculo/autorização do membro.
2. Confirma produto ativo e estoque.
3. Calcula saldo pelo ledger no backend.
4. Cria `Redemptions` e débito no ledger como uma operação idempotente.
5. Retorna novo saldo e status do pedido.

## `getDonorDashboard()`

1. Obtém o membro autenticado.
2. Consulta apenas doações ligadas a esse membro/cliente.
3. Calcula total de transações confirmadas.
4. Retorna recorrência, próxima cobrança, histórico, comprovantes e relatórios públicos.

## Pendências que precisam de decisão no Wix

- Qual app/API processará doação pontual e recorrente.
- Se a criança terá login próprio ou operará sempre dentro da conta do responsável.
- Quem pode solicitar resgate: criança, responsável ou ambos com aprovação.
- Política de moderação e retenção de fotos/vídeos de menores.
- Regras finais de níveis, selos e medalhas.
