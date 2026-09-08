# Contrato de IDs dos elementos Wix

Use estes IDs ao criar os elementos no Editor. O código Velo será escrito contra este contrato.

## Enviar descoberta

| ID | Elemento |
|---|---|
| `#missionDropdown` | Dropdown de missão |
| `#formatSelection` | Selection Tags ou Radio Button Group |
| `#discoveryUpload` | Upload Button |
| `#externalUrlInput` | Text Input |
| `#discoveryTextInput` | Text Box |
| `#submitDiscoveryButton` | Button |
| `#submissionFeedback` | Text |
| `#submissionStateBox` | Multi-State Box |

## Painel do pesquisador

| ID | Elemento |
|---|---|
| `#researcherAlias` | Text |
| `#researcherAvatar` | Image |
| `#pointsBalance` | Text |
| `#approvedActivitiesCount` | Text |
| `#activeMissionRepeater` | Repeater |
| `#submissionHistoryRepeater` | Repeater |
| `#openSubmissionButton` | Button |

## Painel do responsável

| ID | Elemento |
|---|---|
| `#guardianGreeting` | Text |
| `#childSelector` | Dropdown/Selection Tags |
| `#childrenRepeater` | Repeater |
| `#childAlias` | Text dentro do Repeater |
| `#childAvatar` | Image dentro do Repeater |
| `#childPoints` | Text dentro do Repeater |
| `#childApprovedCount` | Text dentro do Repeater |
| `#followChildButton` | Button dentro do Repeater |
| `#authorizationRepeater` | Repeater |
| `#pointsHistoryRepeater` | Repeater |
| `#purchaseHistoryRepeater` | Repeater |

## Painel do doador

| ID | Elemento |
|---|---|
| `#donorGreeting` | Text |
| `#totalDonated` | Text |
| `#recurringAmount` | Text |
| `#nextChargeDate` | Text |
| `#pauseDonationButton` | Button |
| `#changeDonationButton` | Button |
| `#cancelDonationButton` | Button |
| `#donationHistoryRepeater` | Repeater |
| `#receiptDownloadButton` | Button dentro do Repeater |
| `#transparencyRepeater` | Repeater |

## Loja por pontos

| ID | Elemento |
|---|---|
| `#rewardsRepeater` | Repeater |
| `#rewardTitle` | Text dentro do Repeater |
| `#rewardImage` | Image dentro do Repeater |
| `#moneyPrice` | Text dentro do Repeater |
| `#pointsPrice` | Text dentro do Repeater |
| `#buyButton` | Button dentro do Repeater |
| `#redeemButton` | Button dentro do Repeater |
| `#redemptionFeedback` | Text |

## Estados obrigatórios

Cada painel deve prever no Multi-State Box ou em containers separados:

- `loading`
- `ready`
- `empty`
- `error`
- `unauthorized`
