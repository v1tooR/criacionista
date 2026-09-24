# Páginas do protótipo

Estado em 23/09/2026. Cada arquivo HTML na raiz é uma página independente que usa
`assets/site.css` e `assets/site.js`. Mudança de cor, fonte ou componente é feita **uma vez**
no `site.css` e vale para todas.

| Arquivo | Página | Status no briefing | URL sugerida no Wix |
|---|---|---|---|
| `home.html` | Home | OTIMIZAR | `/` |
| `o-clube.html` | O Clube | OTIMIZAR (era Institucional) | `/institucional` (preservar a URL) |
| `como-funciona.html` | Como funciona | NOVA (absorve Programa de Recompensas) | `/como-funciona` |
| `estudos.html` | Artigos e Estudos Científicos | NOVA | `/estudos` |
| `loja.html` | Loja | NOVA | `/loja` |
| `doe.html` | Doe | NOVA | `/doe` |
| `concurso.html` | Concurso Criacionista | OTIMIZAR (era Eventos) | `/concurso` |
| `contato.html` | Contato | MANTER (copy atualizada) | `/contact-9` ou `/contato` |

Ainda não construídas: cadastro e login (3 fluxos), área do sócio pesquisador,
área do responsável e área do doador. São telas autenticadas e dependem das decisões
listadas em `flows.md`.

## Dois modos de visualização na mesma página

Toda página tem uma chave no topo: **Proposta completa** e **Piso Wix nativo**.

O piso nativo mostra o que o Wix Studio entrega usando **só elementos nativos**, sem custom
element e sem Velo — é o que dá para prometer ao cliente sem depender de código. Quando ligado,
um painel abre listando as 10 diferenças em relação à proposta completa.

O que muda no piso nativo:

1. **Faixa do hero** — cinco degradês radiais viram um linear.
2. **Animações contínuas** — foto flutuando, orbes e anel tracejado saem (o editor não faz loop).
3. **Contadores** — números entram prontos; contar de 0 exige Velo.
4. **Trilhos** — viram Slider nativo, andando por página pelas setas.
5. **Vídeos** — o embed carrega junto com a página, em vez de só ao clicar.
6. **Sublinhado do título** — entra desenhado, sem animar.
7. **Tipografia** — tamanho por breakpoint, em degraus, não fluido.
8. **Formulário** — padrão Wix Forms: opções empilhadas, cantos retos, botão de largura natural.
9. **Cantos e sombras** — mais discretos.
10. **Entrada ao rolar** — preset único, sem atraso card a card.

A escolha fica salva no navegador, então dá para navegar o site inteiro no piso nativo e mostrar
ao cliente a diferença página a página.

### Por que uma chave e não uma segunda cópia de cada página

Existia um `home-wix.html`, feito em 10/09/2026, que era a Home inteira duplicada na versão
nativa. Em 13 dias ele já tinha ficado para trás: paleta antiga (`#2E3192`), sem o campo Nome na
newsletter e sem o fluxo de cancelamento. Com 8 páginas, seriam 16 arquivos divergindo.

A chave resolve isso com um arquivo a mais (`assets/wix-nativo.css`) e um atributo no `body`:
uma fonte só de conteúdo, duas leituras. `home-wix.html` ficou obsoleto — vale apagar para
ninguém mostrar a versão velha ao cliente por engano (ele está no histórico do git, commit `8b1433d`).

### Onde isso é relevante

Só se o caminho escolhido for **montar à mão no editor do Wix Studio**. Pelo caminho headless
(ver `headless.md`), o site é o nosso próprio HTML e não existe degradação nenhuma — o piso
nativo vira só um argumento de comparação para o cliente entender o que estaria perdendo.

## Conteúdo real aplicado (23/09/2026)

As páginas novas deixaram de ser só layout com texto de exemplo:

- **estudos.html** — os três primeiros cards são os artigos reais do site atual, com título,
  resumo, imagem, autoria (Eliézer C. Militão) e data do próprio cliente, e o botão abre o post
  no site no ar. Os demais seguem marcados como EXEMPLO, para mostrar os temas ainda sem conteúdo.
- **o-clube.html** — seção "O que o clube já publica", com mosaico de 6 posts reais.
- **doe.html** — bloco "Sua doação mantém isto no ar", com 3 publicações reais.

Todos os 20 links para o site atual foram verificados e respondem HTTP 200.

**Loja:** as fotos são de banco de imagens com licença livre, marcadas como exemplo na própria
página (ver abaixo). Nenhuma imagem de post do blog foi usada como foto de produto: isso faria o
cliente acreditar que aquele produto existe com aquela foto.

**Doe:** nenhum depoimento fictício foi escrito. Depoimento inventado em página de doação é
problema de confiança, não detalhe de layout.

## Fotos de exemplo da Loja

Os seis produtos da vitrine agora têm foto, em `assets/loja/`. São imagens de banco com
licença livre, escolhidas só para a vitrine não ficar vazia — **todas devem ser trocadas por
fotos reais dos produtos antes de publicar**. A nota no topo da página diz isso ao cliente.

| Arquivo | Licença | Origem |
|---|---|---|
| `livro-guia.jpg` | CC0 | "Spring daffodils and books" (Openverse) |
| `caderno.jpg` | CC0 | "Notebook Paper" (Openverse) |
| `microscopio.jpg` | Domínio público | "Free microscope science equipment image" (Openverse) |
| `livro-ceu.jpg` | CC0 | "Blue sky clouds" (Openverse) |
| `kit-agua.jpg` | CC BY 2.0 | "Red and blue liquids inside graduated tube" (Flickr, via Openverse) |
| `jaleco.jpg` | CC BY 2.0 | [Lab coats](https://commons.wikimedia.org/wiki/File:Lab_coats.jpg) (Wikimedia Commons) |

As duas CC BY exigem crédito, que está no rodapé da própria página da loja. As quatro CC0 não
exigem nada. Nenhuma foto escolhida mostra rosto de criança — o primeiro resultado de
"microscópio" mostrava, e foi descartado por causa da regra do projeto.

A foto do jaleco é a mais fraca do conjunto: é o registro de uma instalação artística, com fundo
escuro, e destoa do tom infantil. Serve para o cliente entender o lugar da imagem no card, mas é
a primeira que deve sair.

## Seções reforçadas (24/09/2026)

Três blocos estavam só com texto em caixas brancas e ganharam tratamento visual:

- **O Clube › Objetivos** — os 6 itens viraram cartões com faixa colorida no topo e ícone,
  usando o componente `.path` que já existia na Home, numa variante compacta (`.path--sm`).
- **Como funciona › O que pedimos / nunca pedimos** — as duas listas agora se opõem
  visualmente: verde com marca de confirmação, vermelho com "x". O contraste é o argumento
  de segurança da página, e ele estava invisível quando eram duas listas iguais.
- **Como funciona › Missões** — os 3 tipos ganharam ícone e cor; o bloco de envio deixou de ser
  parágrafo e passou a mostrar o botão "Enviar minha descoberta" como amostra de interface,
  os quatro formatos aceitos e o aviso de segurança destacado.

Componentes novos no `site.css`: `.path--sm`, `.chk`, `.box__hd`, `.box--sim`, `.box--nao`,
`.alerta`, `.mockui`, `.mockbtn`, `.formato`.

## Vídeos: os canais não são do cliente

Os 8 vídeos da home são de terceiros, confirmado pelo oEmbed do YouTube:

| Canal | Vídeos |
|---|---|
| Origens NT (@OrigensNT) | 5 |
| Igreja Presbiteriana Alvorada (@ip.alvorada) | 2 |
| Michelson Borges (@michelsonborges) | 1 |

O protótipo credita o canal em cada card, o que o site atual não faz. Antes de publicar, vale
confirmar com o cliente se existe autorização ou se a curadoria por embed é suficiente.

**Redes sociais:** o rodapé apontava para as home pages genéricas do YouTube, Instagram e
Facebook. Agora o Facebook aponta para [/clubecriacionista](https://www.facebook.com/clubecriacionista/),
encontrado na busca e corroborado por um post do próprio cliente, que cita "o Clube Criacionista
do Facebook". YouTube e Instagram ficaram marcados como perfil a confirmar — não há indício de
que o clube tenha canal próprio.

## Pasta dist/ para o Wix Headless

`node scripts/build-dist.js` monta a pasta `dist/`, pronta para arrastar em wix.com/headless/drop:
renomeia `home.html` para `index.html`, reescreve os links, copia só os arquivos usados e confere
os limites do Wix. O passo a passo completo está em `headless.md`.

## Redirecionamentos obrigatórios na publicação

| De | Para | Motivo |
|---|---|---|
| `/recompensas` | `/como-funciona` | Briefing, seção 5. Mantém o SEO da página antiga. |
| `/eventos` | `/concurso` | Briefing, seção 5. |

`/institucional` deve continuar existindo com esse endereço, mesmo com o nome "O Clube" no menu.
Todos os posts do blog precisam seguir acessíveis nas URLs atuais.

## Descoberta sobre o site atual

Verificado em 23/09/2026: as páginas internas do site no ar **não são públicas**.
`/institucional` e `/recompensas` pedem senha ("Área de convidados"); `/eventos` e `/contact-9`
exigem login de membro. Só a Home e o blog abrem para visitantes.

Duas consequências:

1. Não foi possível reaproveitar a redação que já existe nessas páginas. O texto do protótipo
   foi escrito a partir do briefing e está marcado como provisório dentro de cada página.
2. Essas URLs provavelmente não têm tráfego de busca hoje, já que o Google não consegue indexá-las.
   Vale conferir no Search Console antes de decidir quanto esforço investir em preservá-las.

## O que cada página espera do cliente

**o-clube.html** — textos definitivos de missão, visão, propósito, objetivos e diferenciais;
marcos reais da linha do tempo; nome, foto/ilustração e mini-bio do fundador; referência de
estilo dos vídeos animados (há um espaço reservado por bloco).

**como-funciona.html** — quantos pontos vale cada tipo de descoberta; prazo de análise dos
envios; se os pontos vencem; se a criança terá login próprio ou entrará pela conta do responsável.

**estudos.html** — a versão em PDF dos três artigos que já existem, mais os artigos ainda não
escritos para os temas que estão só com card de exemplo. Filtros e busca já funcionam no protótipo.

**loja.html** — catálogo real com fotos, preços e equivalência em pontos; regra de quem pode
pedir o resgate (criança, responsável ou os dois); gateway de pagamento.

**doe.html** — números de impacto verificados e depoimentos reais. Nenhum depoimento fictício foi
colocado: texto inventado em página de doação é problema de confiança. Falta também definir o
gateway com suporte a assinatura recorrente.

**concurso.html** — tema, prazos, premiação e o PDF do regulamento. A página já mostra os dois
estados previstos no briefing: sem concurso ativo e com concurso aberto.

**contato.html** — canal principal (WhatsApp, e-mail ou formulário), horário de atendimento e
prazo de resposta. Hoje os quatro assuntos estão com marcador "A DEFINIR".

## Identidade visual aplicada

Logo novo (23/09/2026) em `assets/logo.png` (horizontal, 1000×411) e `assets/logo-vertical.png`.
O arquivo original do logo anterior ficou em `assets/logo-anterior.png`. As margens brancas foram
recortadas e o fundo externo virou transparente, preservando o branco de dentro do balão; o peso
caiu de 1,2 MB para 125 KB.

### Favicon

O ícone apontava para `assets/logo.png`, o logo horizontal de 1000×411. Espremido no quadrado
de 16px da aba, virava um borrão ilegível.

`node scripts/favicon.js` resolve: ele encontra o símbolo (o balão com o globo) pela faixa
vertical vazia que separa o símbolo do lettering, recorta em quadrado com respiro mínimo e
exporta em 32, 64 e 180px. Rode de novo sempre que o logo mudar.

As páginas declaram `favicon-32` e `favicon-64` como ícone e `favicon-180` como apple-touch-icon.
O ícone fica legível a partir de 20px. Em 16px ainda é denso, o que é próprio de uma marca com
globo, três figuras e contorno — se o cliente quiser nitidez total nesse tamanho, o caminho é um
símbolo simplificado só para uso pequeno, o que é decisão de marca, não de implementação.

Paleta oficial aplicada em todo o CSS, substituindo os valores aproximados anteriores:

| Cor | Hex | Token |
|---|---|---|
| Azul institucional | `#323D90` | `--navy` |
| Azul médio | `#0385D6` | `--blue` |
| Ciano | `#00A7E0` | `--cyan` |
| Amarelo | `#FFD900` | `--yellow` |
| Vermelho | `#E30134` | `--red` |
| Verde | `#7EBA46` | `--green` |
| Roxo | `#6D3389` | `--purple` |

A referência em imagem está em `assets/paleta-oficial.png`.

## Como verificar depois de mexer

Os scripts de verificação ficam no diretório temporário da sessão, mas o essencial é:
abrir cada página em 320, 390, 768, 1024 e 1440px e confirmar que não há rolagem horizontal
(`document.documentElement.scrollWidth` igual a `clientWidth`), que o console não acusa erro e
que nenhuma imagem quebrou. As oito páginas passaram nessa verificação em 23/09/2026.
