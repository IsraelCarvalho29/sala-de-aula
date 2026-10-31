---
codigo: WB-01
titulo: "HTML semântico e CSS (Flexbox, Grid)"
trilha: Desenvolvimento web
nivel: basico
prerequisitos: []
duracao_min: 150
objetivos:
  - "Estruturar uma página com tags semânticas (header, nav, main, article, section, footer)"
  - "Criar formulários acessíveis com label, tipos de input e validação nativa"
  - "Aplicar CSS com seletores, especificidade e o modelo de caixa"
  - "Alinhar elementos em uma dimensão com Flexbox"
  - "Montar layouts em duas dimensões com Grid"
  - "Deixar a página responsiva com unidades relativas e media queries"
aprofundar:
  - nome: "MDN Web Docs: Aprendendo desenvolvimento web (em português)"
    url: "https://developer.mozilla.org/pt-BR/docs/Learn_web_development"
    trecho: "Estrutura com HTML e Estilização com CSS"
  - nome: "Full Stack Open (projeto final do OSSU)"
    url: "https://fullstackopen.com/en/"
    trecho: "Parte 0: fundamentos de aplicações web"
tags: [web, html, css, semantica, acessibilidade, flexbox, grid, responsivo]
---

# HTML semântico e CSS (Flexbox, Grid)

## Por que isso importa

Toda interface web, do site da padaria ao Gmail, é feita de **HTML** (o conteúdo e a estrutura), **CSS** (a aparência) e **JavaScript** (o comportamento). Escrever HTML **semântico** faz a página funcionar com leitores de tela (acessibilidade, que em muitos casos é exigência legal), aparecer melhor no Google e ser mais fácil de manter. **Flexbox** e **Grid** são as ferramentas modernas de layout: com elas você monta qualquer tela, e elas aparecem em praticamente toda entrevista de front-end. Esta sala de aula é, ela mesma, HTML e CSS.

## Intuição

Pense numa **casa**: o **HTML** é a **estrutura** (paredes, cômodos, portas, cada um com sua função: cozinha, quarto, banheiro). O **CSS** é a **decoração** (cor da parede, onde vão os móveis). O **JavaScript** é a **parte elétrica** (apertou o interruptor, a luz acende).

HTML **semântico** é chamar cada cômodo pelo nome certo. Uma casa onde todos os cômodos se chamam "sala" funciona, mas um visitante cego (o leitor de tela) e o carteiro (o Google) não sabem onde fica a cozinha. Uma página feita só de `<div>` é essa casa.

## Visual

Estrutura semântica de uma página típica:

```
┌──────────────────────────────────────────────────┐
│ <header>  logo, título                           │
│   <nav>  Início · Trilhas · Progresso            │
├──────────────────────────────────┬───────────────┤
│ <main>                           │ <aside>       │
│   <article>                      │  conteúdo     │
│     <h1> título da aula          │  relacionado  │
│     <section> Intuição           │               │
│     <section> Visual             │               │
│   </article>                     │               │
├──────────────────────────────────┴───────────────┤
│ <footer>  créditos, links                        │
└──────────────────────────────────────────────────┘
```

O **modelo de caixa**: todo elemento é um retângulo com quatro camadas.

```
┌───────────────────── margin (espaço fora, transparente) ──┐
│  ┌──────────────── border (a borda) ───────────────────┐  │
│  │  ┌───────────── padding (espaço dentro) ─────────┐  │  │
│  │  │                                               │  │  │
│  │  │            content (texto, imagem)            │  │  │
│  │  │                                               │  │  │
│  │  └───────────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────┘
```

Flexbox (uma dimensão) × Grid (duas dimensões):

```
FLEXBOX: display: flex; justify-content: space-between; align-items: center
┌──────────────────────────────────────────────┐
│ [Logo]              [Início] [Trilhas] [Sair]│   ← eixo principal →
└──────────────────────────────────────────────┘

GRID: display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px
┌──────────┐ ┌──────────┐ ┌──────────┐
│  card 1  │ │  card 2  │ │  card 3  │
└──────────┘ └──────────┘ └──────────┘
┌──────────┐ ┌──────────┐
│  card 4  │ │  card 5  │   ← linhas e colunas
└──────────┘ └──────────┘
```

## Conceito técnico

### Anatomia do HTML

```html
<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Minha página</title>
    <link rel="stylesheet" href="estilo.css">
  </head>
  <body>
    <h1>Olá!</h1>
    <p>Um parágrafo com um <a href="https://exemplo.com">link</a>.</p>
  </body>
</html>
```

- **Elemento** = tag de abertura + conteúdo + tag de fechamento: `<p>texto</p>`. Alguns não têm conteúdo: `<img>`, `<input>`, `<br>`.
- **Atributos** dão informações extras: `href`, `src`, `alt`, `id`, `class`.
- `<head>` guarda metadados (título da aba, CSS, a `viewport` que faz a página funcionar no celular); `<body>` guarda o que aparece.

### Tags semânticas

| Tag | Use para |
|---|---|
| `<header>` | cabeçalho da página ou de uma seção |
| `<nav>` | bloco de links de navegação |
| `<main>` | o conteúdo principal (só um por página) |
| `<article>` | conteúdo que faz sentido sozinho (post, aula, produto) |
| `<section>` | um bloco temático com título |
| `<aside>` | conteúdo complementar (barra lateral) |
| `<footer>` | rodapé |
| `<h1>` a `<h6>` | títulos, **em ordem** (um `h1`, depois `h2`...), sem pular níveis |
| `<button>` | ações (não use `<div onclick>`: não recebe foco do teclado) |
| `<ul>`/`<ol>` + `<li>` | listas sem ordem / numeradas |

`<div>` e `<span>` são caixas **sem significado**: use só para agrupar para o CSS, quando nenhuma tag semântica serve.

### Acessibilidade básica

- Toda `<img>` precisa de `alt` descrevendo a imagem (ou `alt=""` se for só decorativa).
- Todo campo de formulário precisa de um `<label>` ligado a ele (`for` do label = `id` do input). Clicar no texto passa a focar o campo, e o leitor de tela lê o rótulo.
- A página deve funcionar **só com o teclado** (Tab, Enter, Espaço).
- Contraste suficiente entre texto e fundo.

### Formulários

```html
<form action="/cadastro" method="post">
  <label for="email">E-mail</label>
  <input id="email" name="email" type="email" required>

  <label for="idade">Idade</label>
  <input id="idade" name="idade" type="number" min="0" max="120">

  <button type="submit">Cadastrar</button>
</form>
```

Os **tipos** (`email`, `number`, `date`, `password`, `tel`) mudam o teclado no celular e validam sozinhos; `required`, `min`, `max`, `pattern` fazem validação nativa sem JavaScript. (A validação do servidor continua obrigatória: o navegador é do usuário.)

### CSS: seletores, cascata e especificidade

```css
seletor {
  propriedade: valor;
}
```

| Seletor | Pega | Especificidade |
|---|---|---|
| `p` | toda tag `<p>` | baixa (0,0,1) |
| `.destaque` | elementos com `class="destaque"` | média (0,1,0) |
| `#topo` | o elemento com `id="topo"` | alta (1,0,0) |
| `nav a` | `<a>` **dentro** de `<nav>` | soma das partes |
| `a:hover` | link com o mouse em cima | pseudo-classe conta como classe |

Quando duas regras brigam pela mesma propriedade, vence a de maior **especificidade**; empatou, vence a que vem **depois** (a "cascata"). Estilo inline (`style="..."`) e `!important` ganham de quase tudo: evite, porque dificultam a manutenção. Prefira estilizar por **classes**.

**Modelo de caixa**: por padrão, `width` é só o conteúdo, e padding e borda somam por fora. Quase todo projeto começa com `* { box-sizing: border-box; }`, que faz `width` incluir padding e borda (muito mais intuitivo).

**Unidades**: `px` (fixa), `%` (relativa ao pai), `rem` (relativa ao tamanho da fonte da raiz, ótima para textos e espaçamentos acessíveis), `vw`/`vh` (porcentagem da tela), `fr` (fração do espaço livre, no Grid).

### Flexbox: uma dimensão

No **pai** (o contêiner):

| Propriedade | Faz |
|---|---|
| `display: flex` | os filhos ficam lado a lado (em linha) |
| `flex-direction: column` | empilha os filhos (o eixo principal vira vertical) |
| `justify-content` | distribui no **eixo principal**: `flex-start`, `center`, `space-between`, `space-around` |
| `align-items` | alinha no **eixo cruzado**: `stretch`, `center`, `flex-start` |
| `gap: 1rem` | espaço entre os filhos |
| `flex-wrap: wrap` | deixa os filhos quebrarem linha quando não cabem |

No **filho**: `flex: 1` faz ele ocupar o espaço que sobra. Centralizar qualquer coisa, o problema clássico do CSS: `display: flex; justify-content: center; align-items: center;` no pai.

### Grid: duas dimensões

```css
.galeria {
  display: grid;
  grid-template-columns: repeat(3, 1fr);   /* 3 colunas de tamanhos iguais */
  gap: 16px;
}
.destaque {
  grid-column: span 2;                     /* este item ocupa 2 colunas */
}
```

`repeat(auto-fit, minmax(200px, 1fr))` cria **quantas colunas couberem** com no mínimo 200px cada: uma galeria responsiva sem nenhuma media query.

**Quando usar cada um**: Flexbox para alinhar itens numa linha ou coluna (menu, barra de botões, centralizar). Grid para o layout da página ou para grades (galerias, dashboards). É comum usar os dois juntos.

### Responsividade

**Mobile first**: escreva o CSS para telas pequenas e acrescente regras para telas maiores com **media queries**:

```css
.layout { display: grid; grid-template-columns: 1fr; }        /* celular: 1 coluna */

@media (min-width: 640px) {
  .layout { grid-template-columns: 2fr 1fr; }                 /* tela maior: 2 colunas */
}
```

Sem a tag `<meta name="viewport" ...>` no `<head>`, o celular finge ser uma tela de computador e encolhe tudo.

## Código

Uma página completa e semântica com Flexbox no cabeçalho e Grid nos cards. Clique em **▶ Experimentar** para editar e ver o resultado ao lado:

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Trilhas</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: system-ui, sans-serif; }
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem;
      background: #1e3a5f;
      color: white;
    }
    nav a { color: white; margin-left: 1rem; text-decoration: none; }
    nav a:hover { text-decoration: underline; }
    main { padding: 1rem; }
    .cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 1rem;
    }
    .card { border: 1px solid #ccc; border-radius: 8px; padding: 1rem; }
    footer { text-align: center; padding: 1rem; color: #666; }
  </style>
</head>
<body>
  <header>
    <strong>Sala de Aula</strong>
    <nav>
      <a href="#">Início</a>
      <a href="#">Trilhas</a>
    </nav>
  </header>
  <main>
    <h1>Trilhas</h1>
    <section class="cards">
      <article class="card"><h2>Fundamentos</h2><p>FP-01 a FP-10</p></article>
      <article class="card"><h2>Estruturas</h2><p>ED-01 a ED-09</p></article>
      <article class="card"><h2>Algoritmos</h2><p>AL-01 a AL-11</p></article>
    </section>
  </main>
  <footer>Feito estudando</footer>
</body>
</html>
```

Diminua a largura do painel de resultado e veja os cards se reorganizarem sozinhos (é o `auto-fit` + `minmax`).

## Erros comuns

- **Página só de `<div>`**: funciona visualmente, mas é invisível para leitores de tela e buscadores.
- **Pular níveis de título** ou usar `<h3>` só porque a letra é menor. Título é estrutura; tamanho é CSS.
- **`<img>` sem `alt`** e **input sem `<label>`**.
- **Usar `id` para estilizar tudo** e depois precisar de `!important` para ganhar a briga de especificidade. Prefira classes.
- **Esquecer o `box-sizing: border-box`** e ver a caixa de `width: 100%` com padding vazar da tela.
- **Usar Flexbox no filho** em vez do pai: `display: flex` vai no **contêiner**, e afeta os filhos diretos.
- **Esquecer a meta viewport** e a página aparecer minúscula no celular.

## Pratique

```quiz
id: WB-01-q1
tipo: multipla_escolha
pergunta: "Qual tag é a mais adequada para o bloco de links principais do site?"
opcoes: ["<div class=\"menu\">", "<nav>", "<section>", "<aside>"]
resposta: 1
explicacao: "<nav> diz a navegadores, leitores de tela e buscadores que aquele bloco é navegação. Um leitor de tela permite pular direto para ele. <div> não tem significado; <section> e <aside> têm outros papéis."
dificuldade: 1
```

```quiz
id: WB-01-q2
tipo: multipla_escolha
pergunta: "Um parágrafo tem `class=\"aviso\"` e `id=\"topo\"`. As regras `.aviso { color: red; }` e `#topo { color: blue; }` estão no CSS, nessa ordem. Qual a cor do texto?"
opcoes: ["Vermelho, porque a classe vem primeiro", "Azul, porque o id tem maior especificidade", "Roxo", "Preto, porque há conflito"]
resposta: 1
explicacao: "Seletor de id (1,0,0) é mais específico que de classe (0,1,0), então vence, independentemente da ordem. A ordem só desempata regras com a mesma especificidade."
dificuldade: 2
```

```quiz
id: WB-01-q3
tipo: multipla_escolha
pergunta: "Com `box-sizing: content-box` (o padrão), uma caixa com `width: 200px`, `padding: 10px` e `border: 2px` ocupa quanto de largura?"
opcoes: ["200px", "212px", "224px", "220px"]
resposta: 2
explicacao: "No content-box, width é só o conteúdo: 200 + 10 + 10 (padding dos dois lados) + 2 + 2 (borda dos dois lados) = 224px. Com border-box, seriam exatamente 200px."
dificuldade: 2
```

```quiz
id: WB-01-q4
tipo: multipla_escolha
pergunta: "Qual combinação centraliza um elemento horizontal e verticalmente dentro do pai?"
opcoes: ["No filho: margin: center", "No pai: display: flex; justify-content: center; align-items: center", "No pai: text-align: center", "No filho: display: flex"]
resposta: 1
explicacao: "Com o pai flex, justify-content centraliza no eixo principal (horizontal) e align-items no eixo cruzado (vertical). O pai também precisa ter altura para a centralização vertical aparecer."
dificuldade: 1
```

```quiz
id: WB-01-q5
tipo: verdadeiro_falso
pergunta: "Se o formulário usa `required` e `type=\"email\"`, o servidor não precisa validar os dados."
resposta: false
explicacao: "A validação do navegador melhora a experiência, mas pode ser burlada (DevTools, curl, outro cliente). O servidor sempre deve validar: tudo que vem do cliente é entrada não confiável (você vai ver em Segurança)."
dificuldade: 1
```

```quiz
id: WB-01-q6
tipo: resposta_curta
pergunta: "Quando usar Flexbox e quando usar Grid?"
resposta: "Flexbox para layout em uma dimensão: alinhar e distribuir itens numa linha ou numa coluna, como menus, barras de botões e centralização. Grid para duas dimensões ao mesmo tempo, linhas e colunas, como o layout geral da página, galerias e dashboards. Os dois podem ser combinados."
palavras_chave: ["uma dimensão", "duas dimensões", "linhas", "colunas"]
dificuldade: 1
```

```quiz
id: WB-01-q7
tipo: codigo
linguagem: html
pergunta: |
  **Estrutura semântica.** Transforme a página feita só de `div` em HTML semântico: use `header` (com um `nav` dentro), `main` (com um `article` que tem um `h1`) e `footer`. Mantenha os textos.
codigo_inicial: |
  <div class="topo">
    <div class="menu">
      <a href="#">Início</a>
      <a href="#">Aulas</a>
    </div>
  </div>
  <div class="conteudo">
    <div class="post">
      <div class="titulo">Minha primeira aula</div>
      <p>Hoje aprendi HTML semântico.</p>
    </div>
  </div>
  <div class="rodape">Israel, 2026</div>
usa: [header, nav, main, article, h1, footer]
testes:
  - verifica: "document.querySelector('header nav a') !== null"
    descricao: "o menu está num nav dentro do header"
  - verifica: "document.querySelector('main article h1')?.textContent.trim() === 'Minha primeira aula'"
    descricao: "o título está num h1 dentro de article, dentro de main"
  - verifica: "document.querySelector('footer')?.textContent.includes('Israel')"
    descricao: "o rodapé usa footer"
  - verifica: "document.querySelectorAll('main').length === 1 && document.querySelectorAll('h1').length === 1"
    descricao: "um único main e um único h1"
    visivel: false
dica: "Troque cada div pela tag que diz o papel dela: topo → header, menu → nav, conteudo → main, post → article, titulo → h1, rodape → footer. As classes podem sair."
solucao: |
  <header>
    <nav>
      <a href="#">Início</a>
      <a href="#">Aulas</a>
    </nav>
  </header>
  <main>
    <article>
      <h1>Minha primeira aula</h1>
      <p>Hoje aprendi HTML semântico.</p>
    </article>
  </main>
  <footer>Israel, 2026</footer>
explicacao: "Visualmente quase nada muda, mas agora um leitor de tela anuncia 'navegação', 'principal' e 'artigo', permite pular entre eles, e o buscador sabe qual é o título da página."
dificuldade: 1
```

```quiz
id: WB-01-q8
tipo: codigo
linguagem: html
pergunta: |
  **Formulário acessível.** Crie um formulário de inscrição com: um campo de **nome** (obrigatório), um de **e-mail** (tipo `email`, obrigatório) e um botão de envio. Cada campo deve ter um `label` ligado a ele pelo `for`/`id`.
codigo_inicial: |
  <form>
    <!-- seus campos aqui -->
  </form>
usa: [form, label, input, button]
testes:
  - verifica: "!!document.querySelector('input[type=email][required]')"
    descricao: "campo de e-mail com type=email e required"
  - verifica: "[...document.querySelectorAll('input')].length >= 2 && [...document.querySelectorAll('input')].every(i => i.id && document.querySelector(`label[for='${i.id}']`))"
    descricao: "todo input tem um label com for igual ao id dele"
  - verifica: "!!document.querySelector('form button, form input[type=submit]')"
    descricao: "há um botão de envio dentro do form"
  - verifica: "[...document.querySelectorAll('input')].filter(i => i.required).length >= 2"
    descricao: "nome e e-mail são obrigatórios"
    visivel: false
dica: "Para cada campo: <label for=\"nome\">Nome</label> seguido de <input id=\"nome\" name=\"nome\" required>. O e-mail usa type=\"email\". No fim, <button type=\"submit\">Inscrever</button>."
solucao: |
  <form>
    <label for="nome">Nome</label>
    <input id="nome" name="nome" required>

    <label for="email">E-mail</label>
    <input id="email" name="email" type="email" required>

    <button type="submit">Inscrever</button>
  </form>
explicacao: "O for do label aponta para o id do input: clicar no texto foca o campo e o leitor de tela anuncia 'Nome, campo de edição, obrigatório'. type=email valida o formato e abre o teclado com @ no celular."
dificuldade: 1
```

```quiz
id: WB-01-q9
tipo: codigo
linguagem: html
pergunta: |
  **Flexbox no cabeçalho.** Estilize o `header` para que o logo fique à esquerda e os links à direita, todos centralizados na vertical, e os links do `nav` fiquem lado a lado com espaço entre eles (use `gap`). Escreva o CSS na tag `style`.
codigo_inicial: |
  <style>
    header {
      height: 80px;
    }
  </style>
  <header>
    <strong class="logo">Sala de Aula</strong>
    <nav>
      <a href="#">Início</a>
      <a href="#">Trilhas</a>
      <a href="#">Perfil</a>
    </nav>
  </header>
usa: [display, justify-content, align-items, gap]
testes:
  - verifica: "getComputedStyle(document.querySelector('header')).display === 'flex'"
    descricao: "o header é um contêiner flex"
  - verifica: "getComputedStyle(document.querySelector('header')).justifyContent === 'space-between'"
    descricao: "logo e nav nas pontas (space-between)"
  - verifica: "getComputedStyle(document.querySelector('header')).alignItems === 'center'"
    descricao: "itens centralizados na vertical"
  - verifica: "getComputedStyle(document.querySelector('nav')).display === 'flex' && parseFloat(getComputedStyle(document.querySelector('nav')).columnGap) > 0"
    descricao: "links do nav lado a lado com gap"
    visivel: false
dica: "O header tem dois filhos (o logo e o nav): display: flex; justify-content: space-between; align-items: center. O nav também vira flex para os links, com gap: 1rem."
solucao: |
  <style>
    header {
      height: 80px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    nav {
      display: flex;
      gap: 1rem;
    }
  </style>
  <header>
    <strong class="logo">Sala de Aula</strong>
    <nav>
      <a href="#">Início</a>
      <a href="#">Trilhas</a>
      <a href="#">Perfil</a>
    </nav>
  </header>
explicacao: "Flex aninhado é muito comum: o header distribui seus dois filhos nas pontas, e o nav, que também é flex, organiza os links. space-between empurra o primeiro filho para o começo e o último para o fim."
dificuldade: 2
```

```quiz
id: WB-01-q10
tipo: codigo
linguagem: html
pergunta: |
  **Galeria com Grid.** Faça a `.galeria` virar uma grade de **3 colunas iguais** com `gap` de 12px. O item `.destaque` deve ocupar **2 colunas**.
codigo_inicial: |
  <style>
    .galeria {
    }
    .item {
      background: #ddd;
      padding: 2rem;
      text-align: center;
    }
  </style>
  <div class="galeria">
    <div class="item destaque">1 (destaque)</div>
    <div class="item">2</div>
    <div class="item">3</div>
    <div class="item">4</div>
    <div class="item">5</div>
  </div>
usa: [grid, grid-template-columns, gap]
testes:
  - verifica: "getComputedStyle(document.querySelector('.galeria')).display === 'grid'"
    descricao: "a galeria é um grid"
  - verifica: "getComputedStyle(document.querySelector('.galeria')).gridTemplateColumns.split(' ').length === 3"
    descricao: "três colunas"
  - verifica: "(c => Math.max(...c) - Math.min(...c) < 1)(getComputedStyle(document.querySelector('.galeria')).gridTemplateColumns.split(' ').map(parseFloat))"
    descricao: "as colunas têm a mesma largura"
  - verifica: "getComputedStyle(document.querySelector('.galeria')).columnGap === '12px'"
    descricao: "gap de 12px"
  - verifica: "Math.abs(document.querySelector('.destaque').offsetWidth - (2 * document.querySelectorAll('.item')[1].offsetWidth + 12)) <= 1"
    descricao: "o destaque ocupa 2 colunas"
    visivel: false
dica: "display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px na .galeria. No .destaque: grid-column: span 2."
solucao: |
  <style>
    .galeria {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
    }
    .item {
      background: #ddd;
      padding: 2rem;
      text-align: center;
    }
    .destaque {
      grid-column: span 2;
    }
  </style>
  <div class="galeria">
    <div class="item destaque">1 (destaque)</div>
    <div class="item">2</div>
    <div class="item">3</div>
    <div class="item">4</div>
    <div class="item">5</div>
  </div>
explicacao: "1fr é uma fração do espaço livre: três 1fr dão três colunas iguais. span 2 faz o destaque ocupar duas células; os itens seguintes se encaixam sozinhos nas células livres (o 2 ao lado do destaque, depois 3, 4 e 5 na linha de baixo)."
dificuldade: 2
```

## Resumo

- HTML é **estrutura e significado**: use `header`, `nav`, `main`, `article`, `section`, `footer`, títulos em ordem e `button` para ações.
- Acessibilidade mínima: `alt` nas imagens, `label` ligado a cada campo, página usável pelo teclado.
- CSS: **especificidade** (id > classe > tag) e **cascata** decidem quem vence; prefira classes. Use `box-sizing: border-box`.
- **Flexbox** alinha em uma dimensão (`justify-content` no eixo principal, `align-items` no cruzado); **Grid** monta linhas e colunas (`grid-template-columns`, `fr`, `gap`).
- Responsivo: meta viewport, **mobile first** e `@media (min-width: ...)`, ou `auto-fit` + `minmax`.

## Para ir além

- Jogue o **Flexbox Froggy** (flexboxfroggy.com) e o **Grid Garden** (cssgridgarden.com), ambos em português.
- **Próximo módulo** na trilha web: WB-02 JavaScript e o DOM. No seu caminho: ET-01 Ética em tecnologia.
