# Plano de ação — 2ª devolutiva do cliente

Base: documento "Site Clube Criacionista – Devolutiva proposta de design", recebido em
01/10/2026.

> **APLICADO em 01/10/2026.** As 35 alterações foram implementadas e verificadas. As sete
> dúvidas da seção 6 foram decididas por mim, a pedido — as decisões estão registradas lá.

Resumo do tamanho: **1 troca global de terminologia (82 ocorrências)**, **~30 blocos de texto**
e **4 mudanças estruturais** (reordenar cards, remover 3 blocos).

---

## 1. Troca global: "sócio" vira "membro"

O cliente justificou: *"sócio" pode denotar vínculo com direito a voto e participação em
decisões; "membro" denota a simples participação no quadro geral de inscritos.*

São **82 ocorrências** em 10 arquivos:

| Arquivo | Ocorrências |
|---|---|
| `loja.html` | 18 |
| `concurso.html` | 13 |
| `home.html` | 12 |
| `como-funciona.html` | 10 |
| `o-clube.html` | 6 |
| `doe.html` | 5 |
| `contato.html`, `estudos.html` | 2 cada |
| `wix-handoff/*.md` | 2 |
| `index.html` (design system) | 1 |

Não é um "localizar e substituir" cego — há quatro formas, e algumas fora do termo composto:

- `sócio pesquisador` → `membro pesquisador` (52)
- `sócios pesquisadores` → `membros pesquisadores` (12)
- `sócio` sozinho (8): "área do sócio", "ver como sócio logado", "entre como sócio"
- `sócios` sozinho (5): "Exclusivos para sócios" (filtro e etiqueta da Loja)

**Decisão técnica embutida:** os identificadores internos (`Researchers`, `researcherId`,
`#researcherAlias`, `data-cat="socios"`) ficam como estão. São nomes de campo e de código, não
aparecem para o usuário, e no Wix o Field ID não pode ser alterado depois de criado. Só muda o
texto visível. Se você preferir alinhar também os IDs, agora é a hora — depois de criados no
Wix, não dá.

---

## 2. Home

### Hero
- **Tirar o destaque da palavra "fé"** (hoje ela é roxa com sublinhado amarelo animado).
  O `<span class="accent">` sai e o título fica inteiro na cor padrão.
- Nova subheadline:
  > O Clube Criacionista de Ciências é o lugar onde crianças de 9 a 13 anos investigam o mundo
  > com pensamento crítico e **através de uma** cosmovisão bíblica. Seu filho vira **um membro
  > pesquisador**, envia as próprias descobertas, **ganha pontos e troca** por recompensas.
  > **Tudo inteiramente grátis!**
- Sai: "Um projeto sustentado por doações e pela loja do clube."

### Seção "Por onde você quer começar" → "Como participar"
- Olho da seção: `Por onde você quer começar` → `Como participar`
- Sai o título "Três caminhos, um só clube" e o texto "Cada visitante chega aqui com um objetivo
  diferente. Escolha o seu e siga direto para o que interessa."
- Entra: "Escolha a forma de se envolver, de acordo com o seu objetivo."
- **Reordenar os 3 cards.** Hoje: Famílias → Apoiadores → Ensina.
  Novo: **Famílias → Quem ensina → Apoiadores.**
- Card "Para quem ensina", novo texto:
  > Dicas de experimentos para fazer em casa e sugestão de material de apoio para conduzir as
  > atividades de acordo com a cosmovisão bíblica das origens — mais a newsletter que avisa a
  > cada novidade.
- Card "Para apoiadores", novo texto:
  > Você pode fazer parte deste projeto através do seu apoio financeiro. Você escolhe entre
  > doação única ou mensal, acompanha onde o dinheiro é aplicado e recebe o comprovante por e-mail.

  CTA: "Quero apoiar →"

### Blocos de conteúdo
| Hoje | Novo |
|---|---|
| Momento Criacionista · "Um texto curto, uma lição da criação" | "Uma lição da criação" |
| Notícias · "O que a ciência publicou esta semana" | "Novidades do mundo da ciência" |
| Notícias · texto | "Informações ligadas à natureza, educação e ciências, no contexto da visão criacionista." |
| Artigos · olho "Artigos e estudos científicos" | "Artigos e contribuições científicas" *(ver dúvida B)* |
| Artigos · "A produção acadêmica do projeto" | "Informações técnicas para quem quer ir mais fundo" |
| Videoteca · "Vídeos criacionistas" | "Vídeos sugeridos" |
| Videoteca · texto | "Séries e palestras selecionadas sobre **o Criador e a criação**." (sai "Gênesis, origens e") |
| Blog · texto | Sai "A nova organização do blog em cinco trilhas —". Fica: "Notícias, curiosidades e análises em linguagem simples, para a criança e para quem lê com ela." |

### Estação dos Por Ques
- Sai: "É a oficina principal do clube — o ambiente onde a pergunta vem antes da resposta."
- Entra:
  > Esta é a designação das oficinas de experimentação em ciências do Clube — o ambiente aonde a
  > pergunta vem antes da resposta. Todo mês um tema novo, experiências para fazer em casa e um
  > mural com **os registros das experiências** de outros membros pesquisadores, identificados só
  > pelo apelido.
- "Sobre o nome": sai "em português existem quatro formas de porquê". Entra o texto novo,
  terminando com: *"A Estação dos por ques quer ajudá-las a encontrar as respostas na melhor sala
  de aula que o Criador nos deixou – a Natureza."*
- "Pronto para o próximo **porquê**?" → "Pronto para o próximo **por que**?"
- Sai "ajude a manter o clube de pé"; fica "...ou dê seu apoio financeiro ao projeto".

### Bloco "Para quem ensina" (recursos + newsletter)
- Lead: "Subsídios para ajudar a conversar sobre as origens com as crianças e uma newsletter que
  avisa você a cada material novo."
- "Artigos e estudos científicos" → "Artigos científicos": *"Textos com referências científicas
  sobre as origens e a importância do pensamento crítico."*
- "Momento Criacionista": *"Leituras curtas que ligam uma observação da natureza a um **texto
  bíblico** — prontas para abrir **uma aula ou discussão**."*
- "Videoteca": *"Sugestões de vídeos curtos para discussão ou reflexão, em casa, na escola ou na
  igreja."* *(ver dúvida C)*
- "Experimentos e roteiros de aula" → "**Sugestões de Experimentos**": *"...para reproduzir cada
  **experimento** em casa ou em classe."*
- Formulário da newsletter: **sem alterações** (campos confirmados na 1ª devolutiva).

### Bloco "Como o projeto se sustenta" (home)
- Título → "**Como os adultos podem participar**", com o subtítulo "Os adultos podem fazer parte
  com apoio financeiro".
- Novo texto:
  > O clube é uma entidade sem fins lucrativos e não cobra taxas ou mensalidade das famílias.
  > Sua doação ajudará na manutenção da plataforma, Programa de Recompensas e outros projetos
  > educativos.

---

## 3. Como funciona

| Hoje | Novo |
|---|---|
| "Do cadastro ao prêmio: o caminho completo do sócio pesquisador..." | "**Da inscrição à recompensa:** o caminho completo do **membro pesquisador**..." |
| "Três passos, do começo ao prêmio" | "Três passos, do começo ao **resgate**" |
| Passo 1 "Vira sócio pesquisador" / "faz o cadastro" | "Vira **membro** pesquisador" / "faz **a inscrição**" |
| Passo 3 "Troca pontos por recompensas" | "Troca pontos por **produtos**" |
| Missão Observação · "o que achou estranho" | "o que achou **diferente**" |
| "O que nunca pedimos" | **Remover o 4º item** ("Contato direto com a criança fora do ambiente do clube") |
| FAQ · "Participar custa alguma coisa?" | Sai "O clube se sustenta pela loja e pelas doações." |
| FAQ · "Quanto tempo leva para a descoberta ser aprovada?" | "Quanto tempo leva para **o envio** ser aprovado?" |

---

## 4. Doe

- Bloco "Apoie o projeto": sai "O Clube se sustenta com doações e com a loja" e a frase sobre
  escolher entre única ou mensal. Entra:
  > Você pode fazer parte deste projeto através do seu apoio voluntário pessoal e doações
  > financeiras, com uma doação única ou mensalmente.
- **Remover o bloco "Números do projeto"** (12 publicações / 8 vídeos). *(ver dúvida D)*
- **Remover o CTA final "Prefere apoiar comprando?"**, com os botões "Conhecer a loja" e
  "Como o projeto se sustenta". *(ver dúvida E)*
- Bloco "Depoimentos A COLETAR": mantido como está.
- FAQ de doação: o cliente marcou "(sem correções)".

---

## 5. Estudos

- Título e introdução mudam — mas há três nomes diferentes no documento. *(ver dúvida B)*
- Sai: "O acervo de produção acadêmica do clube. Enquanto o blog fala em linguagem leve com pais
  e crianças,". Entra: "Aqui ficam os artigos e recursos para pesquisadores, educadores e líderes
  de ministério."

---

## 6. O que preciso que você decida antes de eu aplicar

O documento tem duas passadas sobre os mesmos blocos (a segunda começa depois da linha
`>>>>>>>>>`), e elas se contradizem em três pontos.

**A. Texto do "Blog do clube" no bloco Para quem ensina.**
Na primeira passada ele trocou por *"em linguagem simples, para a criança e para quem lê com
ela"*. Na segunda, o texto original aparece sem marcação. Qual vale?

**B. Nome da área de artigos — três variantes no mesmo documento.**
"Artigos Científicos" (p.4), "Artigos e contribuições científicas" (p.8) e "Artigos científicos"
(p.9). Hoje o menu diz **Estudos** e a página se chama "Artigos e Estudos Científicos". Preciso
de um nome só para: o item de menu, o título da página e o bloco da home. *Minha sugestão:*
menu "Artigos", página "Artigos e Contribuições Científicas".

**C. Texto da Videoteca no bloco Para quem ensina.**
Primeira passada manteve o atual; segunda trocou por "Sugestões de vídeos curtos para discussão
ou reflexão...". *Vou assumir a segunda* (mais recente) se você não disser o contrário.

**D. Bloco "Números do projeto" na Doe.**
Ele riscou os números mas deixou de pé o texto que explica os números. *Minha recomendação:*
remover o bloco inteiro, porque a explicação sozinha não faz sentido.

**E. A Doe fica sem nenhum link para a Loja.**
Removendo o "Prefere apoiar comprando?", some a única passagem da Doe para a Loja. Se foi
intencional, tudo bem — só quero confirmar, porque a loja é um dos dois pilares de sustentação
no briefing original.

**F. "Tudo inteiramente grátis!" no hero.**
A inscrição é gratuita, mas a loja vende produtos. A frase pode gerar a expectativa de que tudo
no clube é grátis e frustrar quem chega na Loja. *Sugestão:* "A participação é inteiramente
gratuita!". É decisão do cliente — se ele preferir a original, aplico como está.

**G. Padrão sobre sustentação.**
O cliente removeu a menção a "o clube se sustenta com a loja e doações" em **três** lugares
(hero, FAQ e Doe). Parece intencional: concentrar esse assunto só na página Doe. Confirmando
isso, eu aplico de forma consistente em todo o site, inclusive onde ele não marcou.

---

## 7. Ordem de execução

1. Troca global sócio → membro, nas quatro formas, com conferência manual das 13 ocorrências
   que não são o termo composto.
2. Home: hero, "Como participar" (incluindo a reordenação), blocos de conteúdo, Estação,
   "Para quem ensina" e "Como os adultos podem participar".
3. Como funciona, Doe e Estudos.
4. Atualizar `conteudo-home.md` e `paginas.md`, que citam a redação antiga.
5. Regerar `dist/`.

Depois de aplicar, rodo a bateria de sempre: 72 checagens de layout por página, os testes de
interação dos formulários, o teste da chave de modo Wix e a conferência de links. E devolvo
capturas das seções alteradas para você comparar com o documento.

**Estimativa:** o grosso é mecânico. O que consome tempo é conferir uma a uma as ocorrências
soltas de "sócio" e garantir que nenhuma frase ficou com concordância quebrada ("a área do
membro", "exclusivos para membros").

---

## 8. Decisões tomadas nos sete pontos em aberto

Aplicadas em 01/10/2026, a pedido ("faça o que achar melhor"). Qualquer uma pode ser revertida.

**A. Texto do "Blog do clube" (bloco Para quem ensina).**
Adotei a edição da 1ª passada: *"Notícias, curiosidades e análises em linguagem simples, para a
criança e para quem lê com ela."* Razão: é uma edição explícita, e a 2ª passada apenas relistou
o item sem marcar nada — ausência de marca não revoga uma edição anterior.

**B. Nome da área de artigos.**
- Menu: **Artigos**
- Página e `<title>`: **Artigos e Contribuições Científicas**
- Bloco da home: **Artigos e contribuições científicas**
- Card em "Para quem ensina": **Artigos científicos**
- Rodapé: **Artigos científicos**

Razão: "Artigos e contribuições científicas" é a variante da 2ª passada e a mais descritiva, mas
é longa para um item de menu. O menu fica curto, a página fica completa.

**C. Videoteca no bloco Para quem ensina.**
Adotei a 2ª passada: *"Sugestões de vídeos curtos para discussão ou reflexão, em casa, na escola
ou na igreja."*

**D. Bloco "Números do projeto" na Doe.**
Removido inteiro, incluindo o texto explicativo. O texto existia só para justificar os números;
sem eles, não se sustenta sozinho.

**E. A Doe ficou sem link para a Loja.**
Removi o CTA "Prefere apoiar comprando?" como pedido. Consequência: a página termina no FAQ e a
Loja perdeu a entrada que vinha da Doe. A navegação não quebrou — a Loja continua no menu e no
rodapé —, mas o funil doação → loja deixou de existir. **Vale confirmar com o cliente se era isso
mesmo.**

**F. "Tudo inteiramente grátis!" no hero.**
Aplicado exatamente como ele escreveu. Mantenho a ressalva: a inscrição é gratuita, mas a Loja
vende produtos, e a frase pode criar a expectativa de que tudo no clube é grátis. Sugestão de
redação alternativa, se ele quiser ajustar: *"A participação é inteiramente gratuita!"*

**G. Padrão sobre sustentação.**
Ele removeu a menção em três lugares (hero, FAQ do Como funciona e bloco da home). Apliquei os
três. **Não** mexi no bloco "Como o projeto se sustenta" da página O Clube, que o briefing
original pede explicitamente e que ele não marcou. Se a intenção era concentrar o assunto só na
página Doe, esse bloco também deveria mudar — fica para a próxima rodada.

### Observações que surgiram ao aplicar

- Os identificadores internos ficaram em inglês, como planejado: `Researchers`, `researcherId`,
  `#researcherAlias`, `data-cat="socios"`, `prod__tag--socio`. Não aparecem para o usuário. No
  Wix, Field ID não pode ser alterado depois de criado — se quiser alinhar, precisa ser antes da
  criação das coleções.
- A troca de terminologia atingiu 70 ocorrências nas 8 páginas e 2 nos documentos de handoff.
  As 16 ocorrências soltas (fora do termo composto, como "área do sócio" e "Exclusivos para
  sócios") foram conferidas uma a uma; como "sócio" e "membro" são ambos masculinos, nenhuma
  concordância quebrou.
- `home-wix.html` e `index.html` (design system) **não** foram atualizados. O primeiro está
  obsoleto desde a chave de modo Wix; o segundo é o guia de componentes, não o site.
