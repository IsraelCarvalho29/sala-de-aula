# 🎓 Sala de Aula

Uma sala de aula web para estudar **Ciência da Computação, Engenharia de Software e desenvolvimento**, do básico ao avançado. Cada aula combina explicação em linguagem simples, diagramas, código comentado e perguntas para treinar o que você aprendeu. Funciona no computador e no celular, e o progresso fica salvo no próprio navegador.

## O que tem aqui

- **19 trilhas e mais de 120 módulos** planejados, de Fundamentos de programação até Sistemas distribuídos, Segurança e Carreira ([currículo completo](docs/curriculo/curriculo.md)).
- **Aulas em Markdown**: cada módulo é um arquivo `.md` com seções fixas (por que importa, intuição, visual, conceito, código, erros comuns, prática, resumo).
- **Perguntas dentro da aula**: múltipla escolha, verdadeiro ou falso, resposta curta, prever a saída e desafio de código, com explicação depois de responder.
- **IDE no navegador**: desafios de código com editor de verdade (números de linha, destaque de sintaxe, indentação automática, erros marcados na linha) e execução real, sem servidor, em **Python, JavaScript, TypeScript, C/C++, SQL e HTML/CSS**. A correção roda testes, confere a indentação e mostra o erro explicado em português. Todo exemplo de código da aula tem o botão **▶ Experimentar**.
- **Diagramas** em [Mermaid](https://mermaid.js.org/) escritos direto no texto da aula.
- **Progresso local**: aulas concluídas e perguntas acertadas ficam no `localStorage`, com exportação e importação em JSON para backup.
- **Responsivo**: layout próprio para telas pequenas, alvos de toque de 44 a 48 px, tema claro e escuro conforme o sistema.

## Como rodar

Pré-requisito: [Node.js](https://nodejs.org/) 20 ou mais novo.

```bash
npm install
npm run dev       # abre em http://localhost:5173
npm run build     # gera o site estático em dist/
npm run preview   # serve o dist/ para conferir o build
```

Para estudar no celular com o servidor de desenvolvimento, rode `npm run dev -- --host` e abra no celular o endereço de rede que aparece no terminal (os dois aparelhos precisam estar na mesma rede Wi-Fi).

## Publicar

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
src/
  lib/conteudo.ts           lê content/ em tempo de build e monta trilhas e módulos
  lib/progresso.ts          progresso no localStorage
  lib/execucao/             executores de código no navegador (um Web Worker por linguagem)
    corretor.py             roda o Python do aluno, simula input(), traduz erros, confere indentação
  components/               Markdown, Quiz, IdeCodigo, EditorCodigo, Diagrama, Flashcard, BarraProgresso
  pages/                    Início, Trilha, Aula
```

## Como escrever uma aula

1. Crie `content/trilhas/<trilha>/<CÓDIGO>-<nome>.md`, por exemplo `content/trilhas/02-estruturas-de-dados/ED-03-listas-ligadas.md`.
2. Use o front matter e as seções do [modelo de aula](docs/curriculo/modelo-de-aula.md). O `codigo` precisa ser o mesmo do currículo: é ele que liga a aula ao módulo planejado e guarda o progresso.
3. Rode `npm run dev` e abra a trilha. O módulo deixa de aparecer como "em breve".

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

### Novas trilhas ou módulos no currículo

Edite `docs/curriculo/curriculo.md` e rode `node scripts/gerar-trilhas.mjs --forcar` para recriar os `_trilha.md`.

## Tecnologias

[Vite](https://vite.dev/), [React](https://react.dev/) e TypeScript; [react-markdown](https://github.com/remarkjs/react-markdown) com GFM; [yaml](https://eemeli.org/yaml/) para front matter e perguntas; [Mermaid](https://mermaid.js.org/) carregado só quando a aula tem diagrama; [CodeMirror 6](https://codemirror.net/) no editor; para executar código: [Pyodide](https://pyodide.org/) (Python), [Sucrase](https://github.com/alangpierce/sucrase) (TypeScript), [JSCPP](https://github.com/felixhao28/JSCPP) (C/C++) e [sql.js](https://sql.js.org/) (SQLite). Não há servidor nem banco de dados.

## Documentos do projeto

- [MEMORY.md](MEMORY.md): decisões, estado atual e próximos passos.
- [TEAM.md](TEAM.md): quem cuida de quê.
