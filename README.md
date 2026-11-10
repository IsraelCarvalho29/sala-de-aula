# 🎓 Sala de Aula

Uma sala de aula web para estudar **Ciência da Computação, Engenharia de Software e desenvolvimento**, do básico ao avançado. Cada aula combina explicação em linguagem simples, diagramas, código comentado e perguntas para treinar o que você aprendeu. Funciona no computador e no celular, e o progresso fica salvo no próprio navegador.

## O que tem aqui

- **19 trilhas e mais de 120 módulos** planejados, de Fundamentos de programação até Sistemas distribuídos, Segurança e Carreira ([currículo completo](docs/curriculo/curriculo.md)).
- **Aulas em Markdown**: cada módulo é um arquivo `.md` com seções fixas (por que importa, intuição, visual, conceito, código, erros comuns, prática, resumo).
- **Perguntas dentro da aula**: múltipla escolha, verdadeiro ou falso, resposta curta, prever a saída e desafio de código, com explicação depois de responder.
- **IDE no navegador**: desafios de código com editor de verdade (números de linha, destaque de sintaxe, indentação automática, erros marcados na linha) e execução real, sem servidor, em **Python, JavaScript, TypeScript, C/C++, SQL e HTML/CSS**. A correção roda testes, confere a indentação e mostra o erro explicado em português. Todo exemplo de código da aula tem o botão **▶ Experimentar**.
- **Diagramas** em [Mermaid](https://mermaid.js.org/) escritos direto no texto da aula.
- **Progresso local**: aulas concluídas e perguntas acertadas ficam no `localStorage`, com exportação e importação em JSON para backup.
- **Explicações passo a passo**: blocos ` ```visual ` mostram algoritmos e estruturas (pilha, fila, lista ligada, ordenações, busca binária, BFS, DFS) um passo de cada vez, com pseudocódigo, variáveis, perguntas de previsão e dados que o aluno pode trocar.
- **Funciona offline (PWA)**: depois da primeira visita, as aulas abrem sem internet e o site pode ser instalado no celular. Python e SQL ficam offline depois de usados uma vez ou pelo botão "Baixar Python e SQL" da página inicial.
- **Responsivo**: layout próprio para telas pequenas, alvos de toque de 44 a 48 px, tema claro e escuro conforme o sistema.

## Como rodar

Pré-requisito: [Node.js](https://nodejs.org/) 20 ou mais novo.

```bash
npm install
npm run dev       # abre em http://localhost:5173
npm run build     # gera o site estático em dist/
npm run preview   # serve o dist/ para conferir o build
npm run validar   # confere as aulas e roda a solução de cada desafio contra os testes
```

Para estudar no celular com o servidor de desenvolvimento, rode `npm run dev -- --host` e abra no celular o endereço de rede que aparece no terminal (os dois aparelhos precisam estar na mesma rede Wi-Fi).

## Publicar

O modo offline só existe no build (`npm run build` gera `dist/sw.js` a partir de [`pwa/sw.js`](pwa/sw.js)); para testá-lo localmente use `npm run build && npm run preview`. Cada build muda a versão do cache, e o app mostra "Há uma versão nova" com o botão Atualizar.

O workflow [`deploy.yml`](.github/workflows/deploy.yml) publica o site no GitHub Pages a cada push na `main`. Para ativar, vá em **Settings → Pages** do repositório e escolha **Source: GitHub Actions**. O app usa rotas com `#` e caminhos relativos, então funciona em qualquer subpasta sem configuração extra.

## Estrutura

```
content/trilhas/            conteúdo que aparece no app
  02-estruturas-de-dados/
    _trilha.md              título, descrição e lista de módulos da trilha
    ED-01-complexidade-big-o.md   uma aula (um módulo)
docs/
  curriculo/                currículo, modelo de aula e mapeamento OSSU
  avaliacao/                especificação do sistema de perguntas, schema e banco inicial
  design/                   protótipo da identidade visual e dos componentes visuais
scripts/gerar-trilhas.mjs   gera os _trilha.md a partir de docs/curriculo/curriculo.md
scripts/validar-aulas.mjs   confere as aulas (npm run validar, também roda no CI)
src/
  lib/conteudo.ts           lê content/ em tempo de build e monta trilhas e módulos
  lib/progresso.ts          progresso no localStorage
  lib/execucao/             executores de código no navegador (um Web Worker por linguagem)
    corretor.py             roda o Python do aluno, simula input(), traduz erros, confere indentação
  components/               Markdown, Quiz, IdeCodigo, EditorCodigo, Diagrama, Flashcard, BarraProgresso, AvisoPwa
  components/visual/        VisualStep (motor passo a passo), Palco (desenhos) e BlocoVisual (bloco ```visual)
  lib/visual/passos.ts      geradores de passos de cada algoritmo (também usados pelo validador)
  lib/pwa.ts                registro do service worker, aviso de atualização, download dos runtimes
pwa/sw.js                   modelo do service worker (o build preenche a lista de arquivos)
public/                     manifest.webmanifest e ícones do app
  pages/                    Início, Trilha, Aula
```

## Como escrever uma aula

1. Crie `content/trilhas/<trilha>/<CÓDIGO>-<nome>.md`, por exemplo `content/trilhas/02-estruturas-de-dados/ED-03-listas-ligadas.md`.
2. Use o front matter e as seções do [modelo de aula](docs/curriculo/modelo-de-aula.md). O `codigo` precisa ser o mesmo do currículo: é ele que liga a aula ao módulo planejado e guarda o progresso.
3. Rode `npm run dev` e abra a trilha. O módulo deixa de aparecer como "em breve".
4. Rode `npm run validar`. Ele confere o front matter e as perguntas e executa a `solucao` de cada desafio contra os `testes` (com o limite de 5 s do app), além de exigir um teste oculto e garantir que o `codigo_inicial` não passa sozinho. Precisa de `python3`; desafios em HTML só são conferidos com o Playwright instalado.

Exemplos de código na aula com cerca de linguagem executável (` ```python `, ` ```javascript `...) ganham o botão "Experimentar". Para trechos que não rodam sozinhos (moldes com `...`, métodos soltos), use ` ```text `.

O C do navegador (JSCPP) ainda não aceita `scanf("%d", &v[i])` direto num elemento de vetor: leia numa variável auxiliar e copie.

Front matter mínimo:

```yaml
---
codigo: ED-03
titulo: Listas ligadas
nivel: basico            # basico | intermediario | avancado
prerequisitos: [ED-01]
duracao_min: 45
objetivos:
  - "Implementar inserção e remoção em uma lista ligada"
---
```

### Perguntas

Cada pergunta é um bloco de código com a linguagem `quiz`, em YAML:

````markdown
```quiz
id: ED-03-q1
tipo: multipla_escolha   # multipla_escolha | verdadeiro_falso | resposta_curta | prever_saida | codigo
pergunta: "Qual o custo de inserir no início de uma lista ligada?"
opcoes: ["O(1)", "O(log n)", "O(n)", "O(n²)"]
resposta: 0              # índice começando em 0; true/false; ou texto da resposta modelo
explicacao: "Basta criar o nó e apontar a cabeça para ele."
dificuldade: 1
```
````

Nos tipos abertos (`resposta_curta`, `prever_saida`) o aluno escreve a resposta, vê a resposta modelo e os termos esperados (`palavras_chave`) e marca se acertou. O enunciado aceita Markdown, inclusive blocos de código.

### Desafios de código (corrigidos automaticamente)

Uma pergunta `tipo: codigo` com `testes` abre a IDE da aula. O aluno escreve, executa e clica em **Verificar resposta**; ela só é aceita quando todos os testes passam, a indentação está certa e o código usa o que foi pedido em `usa`.

```yaml
id: FP-01-q10
tipo: codigo
linguagem: python          # python | javascript | typescript | c | cpp | sql | html
pergunta: "Leia a idade e imprima ..."
codigo_inicial: |          # opcional: o que já aparece no editor
  # escreva aqui
usa: [input, int]          # funções, palavras-chave (if, for, while, def, return, break, continue, class,
                           # lambda, try, raise, with, import, f-string, list-comprehension) ou cláusulas SQL
testes:
  - entrada: "26"          # uma linha por input()/prompt()/scanf; várias: entradas: ["Ana", "2000"]
    saida: |               # o que o programa imprime (o texto da pergunta do input não conta)
      Você tem 26 anos.
  - entrada: "61"
    visivel: false         # teste oculto: o aluno só vê se passou
    saida: "..."
  # para funções: chamada: "dobro(3)" e saida: "6" (valor no formato da linguagem, repr no Python)
  # em SQL: preparo (no nível da pergunta) cria as tabelas; a saida é "coluna | coluna" e uma linha por registro
  # em HTML: verifica: "document.querySelector('h1') !== null" e descricao: "tem um título"
dica: "..."
solucao: |                 # liberada depois de 2 tentativas ou do acerto
  ...
explicacao: "..."
```

Indentação exigida: 4 espaços em Python e C/C++, 2 em JavaScript/TypeScript, nunca TAB (desligue com `indentacao: false`). O programa é interrompido depois de 5 segundos (laço sem fim). Os runtimes (Pyodide ~12 MB, SQLite ~1 MB, C ~0,4 MB) são publicados junto com o site e só são baixados quando uma aula precisa deles.

### Diagramas

````markdown
```mermaid
flowchart LR
  A[Entrada] --> B{Ordenada?}
  B -->|sim| C[Busca binária]
  B -->|não| D[Busca linear]
```
````

### Explicações passo a passo

Um bloco ` ```visual ` em YAML vira uma animação controlada pelo aluno (⏮ ◀ ▶ ▶| ⏭, setas do teclado, deslizar no celular), com o pseudocódigo da linha atual, as variáveis e perguntas "Antes de avançar" que travam o avanço até o aluno acertar. O aluno pode mudar os dados no cabeçalho e clicar em **Ver de novo** (desligue com `editavel: false`).

````markdown
```visual
tipo: ordenacao              # veja a tabela abaixo
algoritmo: insercao
valores: 5, 2, 4, 1, 3
titulo: "Opcional: troca o título"
```
````

| `tipo` | Campos | Exemplo |
|---|---|---|
| `pilha` | `operacoes`: push, pop, peek, vazia | `push 1, push 2, pop` |
| `fila` | `operacoes`: enqueue, dequeue, frente, vazia | `enqueue A, enqueue B, dequeue` |
| `lista-ligada` | `valores` (lista inicial) e `operacoes`: inserir_inicio, inserir_fim, buscar, remover | `inserir_inicio 5, remover 20` |
| `ordenacao` | `algoritmo`: bolha, selecao, insercao, merge, quick; `valores` (2 a 10 números) | `valores: 5, 2, 4, 1, 3` |
| `busca-binaria` | `valores` (em ordem crescente) e `alvo` | `alvo: 23` |
| `bfs`, `dfs` | `arestas` (`A-B` não dirigida, `A->B` dirigida) e `inicio` | `arestas: A-B, A-C, B-D` |

Para um algoritmo novo, escreva uma função geradora em `src/lib/visual/passos.ts` (roda o algoritmo uma vez e devolve a lista de passos) e, se precisar de um desenho novo, um palco em `src/components/visual/Palco.tsx`. `npm run validar` gera todos os blocos ` ```visual ` das aulas e acusa erro de dados.

### Novas trilhas ou módulos no currículo

Edite `docs/curriculo/curriculo.md` e rode `node scripts/gerar-trilhas.mjs --forcar` para recriar os `_trilha.md`.

## Tecnologias

[Vite](https://vite.dev/), [React](https://react.dev/) e TypeScript; [react-markdown](https://github.com/remarkjs/react-markdown) com GFM; [yaml](https://eemeli.org/yaml/) para front matter e perguntas; [Mermaid](https://mermaid.js.org/) carregado só quando a aula tem diagrama; [CodeMirror 6](https://codemirror.net/) no editor; para executar código: [Pyodide](https://pyodide.org/) (Python), [Sucrase](https://github.com/alangpierce/sucrase) (TypeScript), [JSCPP](https://github.com/felixhao28/JSCPP) (C/C++) e [sql.js](https://sql.js.org/) (SQLite). Não há servidor nem banco de dados.

## Documentos do projeto

- [MEMORY.md](MEMORY.md): decisões, estado atual e próximos passos.
- [TEAM.md](TEAM.md): quem cuida de quê.
