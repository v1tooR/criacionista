# O que falta para virar site

Levantado em 09/10/2026, antes de qualquer publicação. Tudo aqui foi conferido no
código e no site no ar, não é estimativa.

## O resumo honesto

As 8 páginas são fachada completa e funcionalidade zero. **Nenhum formulário envia
nada** — contato, doação e newsletter validam os campos e mostram "obrigado" sem que
um byte saia do navegador. Ninguém entra, ninguém compra, ninguém resgata ponto.

Isso é o esperado de um protótipo. A lista abaixo é exatamente o que separa o
protótipo do site.

---

## 1. Impede publicar como site definitivo

| | Situação |
|---|---|
| `noindex, nofollow` nas 8 páginas e no `Base.astro` | Correto enquanto é prévia. Se subir assim como definitivo, o Google não indexa nada — e o briefing põe SEO como requisito que não pode ser perdido. É uma linha, mas tem de ser lembrada. |
| Política de privacidade | **Não existe.** O site coleta e-mail (newsletter), dados do responsável e dados de criança. A LGPD art. 14 exige consentimento do responsável e finalidade declarada. Isso é jurídico, não técnico — alguém precisa escrever. |
| Aviso interno vazando | *Corrigido em 09/10.* Clicar em "Entrar" mostrava "Entra na implementação do Wix" — recado de agência, para o visitante. |

## 2. Funcionalidade que não existe

| O que | Quantas vezes é prometido | Onde | Quem resolve | Trava em |
|---|---|---|---|---|
| Entrar / Cadastrar | 25 | todas as 8 páginas | Wix Members + rota `/api/auth/login` | app Members ativo no site de apoio |
| Cadastro do membro pesquisador | 20 | 7 páginas | nosso: formulário + coleções do CMS + consentimento do responsável | modelagem de dados e LGPD |
| Envio dos formulários | contato (5 campos), doação (8), newsletter (9) | 3 páginas | Wix Forms ou endpoint nosso | — |
| Carrinho e checkout | 5 | loja | Wix Stores | meio de pagamento conectado na conta |
| Resgate por pontos | 6 | loja | Wix Loyalty **ou** ledger nosso | decidir se o Loyalty aceita as regras do clube |
| Página do artigo | 3 | estudos | rota dinâmica + Blog API + Ricos | Client ID |

O item mais pesado é o **cadastro do membro pesquisador**. Não é um formulário: é o
vínculo responsável↔criança, o consentimento, o saldo de pontos e o histórico — com
o cálculo obrigatoriamente no servidor, porque nada que venha do navegador pode ser
acreditado. Está desenhado em `flows.md` e continua valendo.

## 3. Conteúdo que falta do cliente

- **Relatório de transparência** — prometido 10 vezes, em todas as páginas, e a página não existe.
- **Regulamento do concurso em PDF** — 1 ocorrência.
- **Instagram e YouTube** — 8 + 8 ocorrências apontando para URLs nunca confirmadas.
  O Facebook (`facebook.com/clubecriacionista`) é o único endereço confirmado.

## 4. Infraestrutura que ninguém olhou ainda

- **E-mail.** O domínio não tem SPF e não tem DMARC (conferido em 09/10; o MX está na
  Hostinger). O `newsletter@clubecriacionista.com` que o cliente propôs, enviando em
  massa desse jeito, vai para spam. Precisa de SPF + DKIM + DMARC e de uma ferramenta
  de envio — não dá para mandar newsletter de uma caixa de e-mail comum.
- **Analytics:** nada. **Banner de cookies:** nada (a integração Astro tem guia pronto).
- **Página 404:** não existe.
- **Open Graph:** *resolvido em 09/10* — link colado no WhatsApp aparecia como texto cru.
  Agora tem cartão 1200×630 (`assets/og.jpg`, gerado por `scripts/og-card.html`) e
  canônico em todas as páginas.

## 5. O blog do site no ar

Três achados que mudam a conversa com o cliente:

1. **`/blog` exige login.** A página renderiza um modal "Login / Novo no site? Registre-se".
   Ou seja: o Google não indexa um post sequer.
2. **O feed é público.** `clubecriacionista.com/blog-feed.xml` devolve os mesmos 12 posts
   que a página esconde, com título, resumo, autor e data. A proteção é só da página.
3. **O último post é de 10/10/2023.** O blog está parado há três anos.

Vale decidir com o cliente: ou abre o blog e ele passa a trazer gente, ou assume-se que
ele não atrai ninguém e o espaço na home vira outra coisa.

## 6. Os 12 posts reais, confirmados pelo feed

Autor único: **Eliézer C. Militão**. Categorias: Momento Criacionista (6), Notícias (3),
sem categoria (3). Os 12 já estão no protótipo com link, data e categoria batendo com o
feed — a pesquisa manual estava certa, e agora existe a prova.

| # | Post | Data | Categoria |
|---|---|---|---|
| 1 | Critérios de classificação dos animais | 10/10/2023 | — |
| 2 | Conheça o carro eVTOL em forma de pelicano | 15/08/2023 | Notícias |
| 3 | Trapaceando com o acaso | 18/07/2023 | — |
| 4 | O universo é finamente ajustado para a vida | 18/07/2023 | — |
| 5 | Estudo sugere que a maioria das árvores evolutivas podem estar erradas | 04/07/2023 | Notícias |
| 6 | Astronauta da NASA crê no relato Bíblico da criação | 04/07/2023 | Notícias |
| 7 | Egoísmo só traz prejuízos | 04/07/2023 | Momento Criacionista |
| 8 | Árvore extinta está florescendo | 04/07/2023 | Momento Criacionista |
| 9 | Eras de Petrificação | 04/07/2023 | Momento Criacionista |
| 10 | A despensa do pica-pau | 04/07/2023 | Momento Criacionista |
| 11 | As aranhas sentem dor? | 04/07/2023 | Momento Criacionista |
| 12 | Doutora rã | 22/01/2023 | Momento Criacionista |

O feed não traz as imagens de capa, e a página que as tem está atrás do login. As capas
só vêm pela API, com o Client ID.

---

## Como conectar sem encostar no site no ar

O `siteId` informado — `947bef68-f229-4456-956e-087f824170fd` — é o do **site publicado**:
o próprio HTML de `clubecriacionista.com` declara esse `metaSiteId`. Então o caminho
normal (`attach` + `wix release`) está **vetado**: ele substituiria o frontend que está
no ar. Não foi executado.

O caminho seguro usa o site no ar só como **fonte de dados**:

1. No painel do site: **Configurações › Desenvolvimento e integrações › Headless Settings**.
2. **Create New Client** → copiar o **Client ID**.
3. O nosso frontend, que continua em outro endereço, lê blog, membros e loja por API
   com esse Client ID (`OAuthStrategy`). Nada é publicado no site do cliente.

Duas armadilhas desse caminho:

- **O campo "login URL" nas Headless Settings tem de ficar vazio.** Preenchê-lo aponta o
  login para uma página customizada — e isso mexe no login do site que está no ar.
- Com Client ID explícito não existe a rota automática `/api/auth/login`; o login passa a
  ser redirecionamento manual para a página do Wix. Funciona, dá um pouco mais de código.
