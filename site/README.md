# site/ — implementação em Astro

Esta pasta é a **implementação**. O protótipo aprovado continua na raiz do repositório,
intacto, e é de lá que sai o pacote `dist/` para a prévia.

## Por que Astro

É o framework com integração completa no Wix Headless: além de hospedar, o Wix cuida de
autenticação, SEO, analytics e monitoramento. Com qualquer outro framework — ou com HTML
estático puro — essas peças ficam por nossa conta, e o SEO renderizado no cliente seria um
problema, já que o briefing coloca SEO como requisito que não pode ser perdido.

## Como rodar

```bash
cd site
npm install        # só na primeira vez
npm run dev        # desenvolvimento, com recarga automática
npm run build      # gera site/dist
npm run preview    # serve site/dist em http://localhost:4321
```

A build **precisa ser servida por HTTP** para ser vista corretamente: os caminhos são
absolutos (`/assets/...`, `/o-clube`) e não resolvem abrindo o arquivo direto no navegador.

## Estrutura

```
site/
  src/layouts/Base.astro    casca comum: head, barra de prévia, chave de modo, header, rodapé
  src/pages/*.astro         uma rota por página (index, o-clube, como-funciona, …)
  public/assets/            CSS, JS, imagens — servidos como estão
```

O item ativo do menu é calculado a partir da rota, em vez de escrito à mão em cada página.
Fora isso, o markup é o mesmo do protótipo.

## Andaimes da prévia

A barra "PRÉVIA · …" e a chave "Proposta completa / Piso Wix nativo" são ferramentas nossas,
não fazem parte do site. Ligam e desligam em `src/andaimes.ts`:

```ts
export const MOSTRAR_ANDAIMES = false;   // true = prévia interna, false = site limpo
```

Trocar e rodar `npm run build` de novo. Hoje está em `false`.

## Como esta pasta é gerada

```bash
node scripts/port-astro.js    # na raiz do repositório
```

O portador relê os 8 HTML da raiz e reescreve `src/`. **Enquanto a migração para dados do Wix
não começar**, o caminho seguro é editar o protótipo na raiz e rodar o portador de novo. Depois
que as páginas passarem a buscar dados do Wix, o portador deixa de servir e `site/` vira a fonte.

## Verificação

```bash
cd site && npm run preview          # em um terminal
node scripts/check.js http://localhost:4321 site/dist   # em outro
node scripts/diff-texto.js          # compara o texto com o protótipo
```

O `diff-texto.js` é o que garante fidelidade: ele compara o texto renderizado de cada página
do protótipo com o da build e acusa qualquer divergência. Hoje: 8/8 idênticas.

## Próximo passo: conectar ao Wix

Falta o projeto existir na conta do cliente. Com o Client ID em mãos:

1. `npm install @wix/sdk @wix/blog` (e os domínios que forem usados)
2. criar o cliente com `OAuthStrategy({ clientId })`
3. trocar os cards fixos do blog e dos artigos por dados do Wix

O passo a passo da criação do projeto está em `wix-handoff/headless.md`.
