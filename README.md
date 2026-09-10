# criacionista

Protótipos e handoff da reformulação do site do **Clube Criacionista de Ciências**
(clubecriacionista.com), para construção no Wix Studio.

## Arquivos

| Arquivo | O que é |
|---|---|
| [home.html](home.html) | **Protótipo da Home.** Sem restrição de plataforma — é a referência de design a atingir. |
| [home-wix.html](home-wix.html) | **Simulação Wix.** A mesma Home rebaixada para o que o Wix Studio entrega com elementos nativos, sem custom element e sem Velo. O botão *"O que muda no Wix"* marca os 10 pontos de diferença. |
| [index.html](index.html) | Design System: cores, tipografia, espaçamento, componentes e notas de implementação. |

Abra qualquer um direto no navegador — não há build.

## Handoff para o Wix

- [WIX_IMPLEMENTATION.md](WIX_IMPLEMENTATION.md) — plano de fases, o que é nativo e o que exige código.
- [wix-handoff/collections.md](wix-handoff/collections.md) — modelo de dados do CMS (Field IDs definitivos).
- [wix-handoff/element-ids.md](wix-handoff/element-ids.md) — contrato de IDs dos elementos do Editor.
- [wix-handoff/flows.md](wix-handoff/flows.md) — contratos dos fluxos Velo e pendências de decisão.
- [wix-handoff/conteudo-home.md](wix-handoff/conteudo-home.md) — inventário do conteúdo real e o que depende do cliente.

## Scripts

```bash
bash scripts/fetch-media.sh                          # rebaixa imagens do Wix e thumbs do YouTube
node scripts/shot.js home.html 1440 900 out.png full # screenshot via Chrome (CDP)
```
