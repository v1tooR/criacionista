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
node scripts/build-dist.js
```

Ela contém as 8 páginas (com `home.html` renomeada para `index.html`, que é o arquivo de
entrada que o Wix procura), o CSS, o JS e só as imagens usadas — 3,08 MB no total.

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

- `npx wix preview` — testa localmente.
- `npx wix release` — publica. É o único comando que se repete a cada mudança.
- O cliente administra produto, post, formulário e membro pelo painel, sem código.

Se em algum momento o projeto virar Astro, o Wix passa a cuidar também de autenticação, SEO,
analytics e monitoramento automaticamente. Com o nosso HTML puro, a autenticação é nossa.

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
