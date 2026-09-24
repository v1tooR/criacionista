# Modelo de dados do CMS

Os IDs abaixo devem ser usados como **Field IDs** definitivos. No Wix, alterar o rótulo é possível, mas o Field ID não pode ser alterado depois da criação.

## Researchers

Representa a criança por alias.

| Field ID | Tipo | Observação |
|---|---|---|
| `alias` | Texto | Ex.: Faraday 07; único |
| `avatar` | Imagem | Ilustração, não foto real |
| `memberId` | Texto | Opcional; identidade de login da criança |
| `status` | Texto | pending, active, suspended |
| `birthYear` | Número | Evitar data completa quando desnecessária |
| `joinedAt` | Data/hora | |

Permissão: leitura e escrita somente backend/admin.

## GuardianLinks

| Field ID | Tipo | Observação |
|---|---|---|
| `guardianMemberId` | Texto | Membro responsável |
| `researcherId` | Referência → Researchers | |
| `relationship` | Texto | |
| `isPrimary` | Booleano | |
| `status` | Texto | pending, active, revoked |

Permissão: somente backend/admin.

## Authorizations

| Field ID | Tipo |
|---|---|
| `researcherId` | Referência → Researchers |
| `guardianMemberId` | Texto |
| `authorizationType` | Texto |
| `status` | Texto |
| `acceptedAt` | Data/hora |
| `documentVersion` | Texto |
| `evidence` | Documento |

Permissão: somente backend/admin.

## Missions

| Field ID | Tipo |
|---|---|
| `title` | Texto |
| `slug` | Texto |
| `summary` | Texto |
| `instructions` | Rich text |
| `coverImage` | Imagem |
| `points` | Número |
| `difficulty` | Texto |
| `active` | Booleano |
| `startsAt` | Data/hora |
| `endsAt` | Data/hora |

Permissão: leitura pública; escrita admin.

## Submissions

| Field ID | Tipo |
|---|---|
| `researcherId` | Referência → Researchers |
| `missionId` | Referência → Missions |
| `submittedByMemberId` | Texto |
| `format` | Texto — photo, video, link, text |
| `media` | Documento/Imagem |
| `externalUrl` | URL |
| `textContent` | Texto/Rich text |
| `status` | Texto — draft, submitted, reviewing, approved, revision_requested, rejected |
| `reviewNotes` | Texto |
| `submittedAt` | Data/hora |
| `reviewedAt` | Data/hora |
| `reviewedByMemberId` | Texto |
| `pointsAwarded` | Número |

Permissão: leitura/escrita por backend; admin valida.

## PointsLedger

Livro imutável de pontos. Nunca use apenas um campo de saldo.

| Field ID | Tipo |
|---|---|
| `researcherId` | Referência → Researchers |
| `amount` | Número — positivo ou negativo |
| `transactionType` | Texto — submission, redemption, adjustment, reversal |
| `sourceCollection` | Texto |
| `sourceItemId` | Texto |
| `description` | Texto |
| `createdByMemberId` | Texto |
| `occurredAt` | Data/hora |

Permissão: somente backend/admin.

## Rewards

Itens resgatáveis por pontos. Produtos vendidos em reais permanecem no Wix Stores.

| Field ID | Tipo |
|---|---|
| `title` | Texto |
| `image` | Imagem |
| `pointsPrice` | Número |
| `storeProductId` | Texto — preenche para variante dinheiro OU pontos |
| `purchaseMode` | Texto — money, points, money_or_points |
| `stock` | Número |
| `active` | Booleano |

Permissão: leitura pública; escrita admin.

## Redemptions

| Field ID | Tipo |
|---|---|
| `researcherId` | Referência → Researchers |
| `rewardId` | Referência → Rewards |
| `pointsSpent` | Número |
| `status` | Texto — requested, confirmed, shipped, cancelled |
| `requestedByMemberId` | Texto |
| `requestedAt` | Data/hora |

Permissão: somente backend/admin.

## ScientificArticles

| Field ID | Tipo |
|---|---|
| `title` | Texto |
| `slug` | Texto |
| `category` | Texto |
| `authors` | Tags ou Multi-reference |
| `abstract` | Rich text |
| `publishedAt` | Data/hora |
| `keywords` | Tags |
| `pdf` | Documento |
| `references` | Rich text |
| `coverImage` | Imagem |
| `featured` | Booleano |

Permissão: leitura pública; escrita admin/editor.

## EducatorSubscribers

Inscrições da newsletter de pais, professores e coordenadores (seção **Para quem ensina** da Home).

| Field ID | Tipo | Observação |
|---|---|---|
| `email` | Texto; único | Chave da inscrição |
| `name` | Texto | Obrigatório; usado para cumprimentar nos e-mails |
| `subscriberType` | Texto | parent, bible_teacher, bible_coordinator, school_teacher, school_coordinator, other |
| `subscriberTypeOther` | Texto | Só quando `subscriberType = other` |
| `gender` | Texto | female, male, undisclosed |
| `consent` | Booleano | Aceite explícito de envio (LGPD) |
| `consentAt` | Data/hora | Momento do aceite |
| `source` | Texto | home_educators, ou a página de origem |
| `status` | Texto | pending, confirmed, unsubscribed |
| `unsubscribedAt` | Data/hora | Preenchido ao cancelar |
| `unsubscribeSource` | Texto | email_link, site_form |
| `createdAt` | Data/hora | |

Permissão: somente backend/admin. O formulário público grava por web module (não direto na
coleção), o que impede leitura ou alteração de inscrições alheias pelo navegador.
Confirmação por duplo opt-in via Wix Automations; o cancelamento grava `status = unsubscribed`
em vez de apagar o registro. Fluxos em `flows.md`.

## DonationProfiles

| Field ID | Tipo |
|---|---|
| `memberId` | Texto |
| `customerId` | Texto — ID do cliente no app/API escolhido |
| `recurrenceId` | Texto |
| `recurrenceStatus` | Texto |
| `amount` | Número |
| `nextChargeAt` | Data/hora |

Permissão: somente backend/admin.

## Donations

| Field ID | Tipo |
|---|---|
| `memberId` | Texto |
| `transactionId` | Texto; único |
| `amount` | Número |
| `status` | Texto |
| `paidAt` | Data/hora |
| `receiptUrl` | URL/Documento |
| `recurring` | Booleano |

Permissão: somente backend/admin.

## TransparencyReports

| Field ID | Tipo |
|---|---|
| `title` | Texto |
| `period` | Texto |
| `summary` | Rich text |
| `reportFile` | Documento |
| `publishedAt` | Data/hora |
| `active` | Booleano |

Permissão: leitura pública; escrita admin.
