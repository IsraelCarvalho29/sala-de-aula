---
codigo: ED-02
titulo: Pilhas e filas
trilha: Estruturas de dados
nivel: basico
prerequisitos: [ED-01]
duracao_min: 45
objetivos:
  - "Definir pilha (LIFO) e fila (FIFO) e suas operações"
  - "Implementar pilha e fila em Python com operações O(1)"
  - "Reconhecer problemas que se resolvem com pilha ou com fila"
  - "Explicar a relação entre pilha e a pilha de chamadas (call stack)"
aprofundar:
  - nome: "MIT 6.0001 Introduction to CS and Programming using Python (via OSSU)"
    url: "https://github.com/ossu/computer-science/blob/master/coursepages/intro-cs/README.md"
    trecho: "Aulas de recursão e estruturas básicas"
tags: [estruturas-de-dados, pilha, fila, lifo, fifo, deque]
---

# Pilhas e filas

## Por que isso importa

O botão "desfazer" do editor, o "voltar" do navegador e a forma como o computador executa funções recursivas usam **pilhas**. A fila de impressão, as mensagens entre microsserviços e a busca em largura em grafos usam **filas**. São as duas estruturas mais simples e mais usadas da computação.

## Intuição

- **Pilha = pilha de pratos.** Você coloca o prato em cima e tira de cima. O último a entrar é o primeiro a sair: **LIFO** (*Last In, First Out*).
- **Fila = fila do banco.** Quem chega entra no fim; quem é atendido sai da frente. O primeiro a entrar é o primeiro a sair: **FIFO** (*First In, First Out*).

## Visual

**Pilha** (push 1, push 2, push 3, pop):

```
 push 1     push 2     push 3      pop → 3
            
                       │ 3 │ ← topo
            │ 2 │      │ 2 │      │ 2 │ ← topo
 │ 1 │      │ 1 │      │ 1 │      │ 1 │
 └───┘      └───┘      └───┘      └───┘
```

**Fila** (enqueue A, enqueue B, enqueue C, dequeue):

```
 enqueue A:   frente → [A] ← fim
 enqueue B:   frente → [A][B] ← fim
 enqueue C:   frente → [A][B][C] ← fim
 dequeue → A: frente → [B][C] ← fim
```

> **Para o app**: animação com botões push/pop e enqueue/dequeue, onde o aluno digita valores e vê a estrutura mudar.

## Conceito técnico

| Operação | Pilha | Fila | Complexidade |
|---|---|---|---|
| Inserir | `push(x)`: no topo | `enqueue(x)`: no fim | O(1) |
| Remover | `pop()`: do topo | `dequeue()`: da frente | O(1) |
| Consultar | `peek()`/`top()`: vê o topo | `front()`: vê a frente | O(1) |
| Vazia? | `is_empty()` | `is_empty()` | O(1) |

As duas são **tipos abstratos de dados** (TAD): definem *o que* as operações fazem, não *como*. Podem ser implementadas com array dinâmico ou lista ligada.

**Implementação em Python:**
- **Pilha**: `list` resolve. `append` e `pop()` no final são O(1) amortizado.
- **Fila**: **não** use `list.pop(0)`, que é O(n) porque desloca todos os elementos. Use `collections.deque`, que tem `append` e `popleft` em O(1).

**Variações que aparecem bastante:**
- **Deque** (*double-ended queue*): insere e remove nas duas pontas.
- **Fila de prioridade**: sai o de maior prioridade, não o mais antigo (vista em ED-07, com heaps).
- **Fila circular**: array de tamanho fixo em que o fim "dá a volta" para o início; comum em buffers de rede e áudio.

**A pilha de chamadas.** Quando uma função chama outra, o computador empilha um *frame* (variáveis locais e ponto de retorno). Quando a função retorna, o frame é desempilhado. Recursão infinita estoura essa pilha: é o famoso **stack overflow**.

## Código

```python
from collections import deque

class Pilha:
    def __init__(self):
        self._itens = []

    def push(self, x):
        self._itens.append(x)        # O(1) amortizado

    def pop(self):
        if not self._itens:
            raise IndexError("pop em pilha vazia")
        return self._itens.pop()     # O(1): remove do final

    def peek(self):
        if not self._itens:
            raise IndexError("peek em pilha vazia")
        return self._itens[-1]

    def is_empty(self):
        return not self._itens

    def __len__(self):
        return len(self._itens)


class Fila:
    def __init__(self):
        self._itens = deque()

    def enqueue(self, x):
        self._itens.append(x)        # O(1)

    def dequeue(self):
        if not self._itens:
            raise IndexError("dequeue em fila vazia")
        return self._itens.popleft() # O(1); list.pop(0) seria O(n)

    def front(self):
        if not self._itens:
            raise IndexError("front em fila vazia")
        return self._itens[0]

    def is_empty(self):
        return not self._itens

    def __len__(self):
        return len(self._itens)
```

**Aplicação clássica de pilha: parênteses balanceados.**

```python
def balanceado(texto):
    pares = {")": "(", "]": "[", "}": "{"}
    pilha = []
    for c in texto:
        if c in "([{":
            pilha.append(c)
        elif c in pares:
            if not pilha or pilha.pop() != pares[c]:
                return False
    return not pilha   # sobrou abertura sem fechamento?

balanceado("{[()()]}")  # True
balanceado("([)]")      # False
```

## Erros comuns

- **Usar `list.pop(0)` como fila.** Funciona, mas cada remoção é O(n); com 1 milhão de itens, o programa fica lento sem motivo.
- **Não tratar estrutura vazia.** `pop()` ou `dequeue()` em estrutura vazia precisa de tratamento explícito.
- **Trocar LIFO e FIFO.** Pilha = último entra, primeiro sai. Fila = primeiro entra, primeiro sai.
- **Esquecer de checar o que sobrou.** No problema dos parênteses, `"(("` não tem erro de fechamento, mas também não está balanceado.

## Pratique

```quiz
id: ED-02-q1
tipo: multipla_escolha
pergunta: "Em uma pilha vazia são feitas as operações: push(5), push(8), pop(), push(2), push(9), pop(), pop(). Qual valor fica no topo?"
opcoes: ["5", "8", "2", "9"]
resposta: 0
explicacao: "Após push(5), push(8): [5, 8]. pop() tira 8: [5]. push(2), push(9): [5, 2, 9]. pop() tira 9, pop() tira 2: [5]. O topo é 5."
dificuldade: 1
```

```quiz
id: ED-02-q2
tipo: verdadeiro_falso
pergunta: "Usar `lista.pop(0)` em Python para implementar uma fila é O(1)."
resposta: false
explicacao: "pop(0) remove o primeiro elemento e desloca todos os outros uma posição, o que é O(n). Use collections.deque com popleft(), que é O(1)."
dificuldade: 1
```

```quiz
id: ED-02-q3
tipo: multipla_escolha
pergunta: "Qual estrutura é mais adequada para implementar o botão 'voltar' de um navegador?"
opcoes: ["Fila", "Pilha", "Fila de prioridade", "Tabela hash"]
resposta: 1
explicacao: "'Voltar' leva à página visitada mais recentemente, ou seja, o último que entrou sai primeiro: LIFO, uma pilha."
dificuldade: 1
```

```quiz
id: ED-02-q4
tipo: multipla_escolha
pergunta: "A busca em largura (BFS) em um grafo visita os vizinhos nível por nível. Qual estrutura ela usa para guardar os próximos vértices?"
opcoes: ["Pilha", "Fila", "Árvore", "Conjunto ordenado"]
resposta: 1
explicacao: "BFS processa os vértices na ordem em que foram descobertos (FIFO), o que garante a visita por níveis. Trocar a fila por uma pilha transforma a busca em profundidade (DFS)."
dificuldade: 2
```

```quiz
id: ED-02-q5
tipo: prever_saida
pergunta: |
  O que este código imprime?
  ```python
  from collections import deque
  f = deque()
  for x in [1, 2, 3]:
      f.append(x)
  f.append(f.popleft())
  print(list(f))
  ```
resposta: "[2, 3, 1]"
explicacao: "A fila começa [1, 2, 3]. popleft() tira o 1 da frente e append() coloca-o no fim: [2, 3, 1]. Isso é uma 'rotação' de fila."
dificuldade: 2
```

```quiz
id: ED-02-q6
tipo: resposta_curta
pergunta: "O que é um stack overflow e qual a relação dele com a estrutura de pilha?"
resposta: "Cada chamada de função empilha um frame na pilha de chamadas e o retorno desempilha. Se há chamadas demais sem retorno (por exemplo, recursão sem caso base), a pilha excede o limite de memória reservado e ocorre o stack overflow."
palavras_chave: ["frame", "chamada", "recursão", "limite"]
dificuldade: 2
```

```quiz
id: ED-02-q7
tipo: codigo
linguagem: python
pergunta: |
  Implemente uma fila usando apenas duas pilhas (listas usadas só com `append` e `pop()` do final). `dequeue` deve ter custo O(1) amortizado e lançar `IndexError` se a fila estiver vazia.

  A função `usar_fila` já está pronta e é ela que os testes chamam: cada número é um `enqueue` e cada `"sai"` é um `dequeue`. Ela devolve a lista do que saiu.
codigo_inicial: |
  class FilaDuasPilhas:
      def __init__(self):
          self.entrada = []
          self.saida = []

      def enqueue(self, x):
          pass

      def dequeue(self):
          pass


  # não mude esta função: é ela que os testes usam
  def usar_fila(fila, operacoes):
      saiu = []
      for op in operacoes:
          if op == "sai":
              saiu.append(fila.dequeue())
          else:
              fila.enqueue(op)
      return saiu
usa: [append, pop]
testes:
  - chamada: "usar_fila(FilaDuasPilhas(), [1, 2, 'sai', 3, 'sai', 'sai'])"
    saida: "[1, 2, 3]"
  - chamada: "usar_fila(FilaDuasPilhas(), [10, 'sai', 20, 30, 40, 'sai', 'sai'])"
    saida: "[10, 20, 30]"
  - chamada: "usar_fila(FilaDuasPilhas(), [7, 8, 9, 'sai', 1, 'sai', 'sai', 'sai'])"
    visivel: false
    saida: "[7, 8, 9, 1]"
dica: "Uma pilha recebe as entradas. Quando a pilha de saída estiver vazia, despeje toda a pilha de entrada nela: a ordem se inverte."
solucao: |
  class FilaDuasPilhas:
      def __init__(self):
          self.entrada = []
          self.saida = []

      def enqueue(self, x):
          self.entrada.append(x)

      def dequeue(self):
          if not self.saida:
              while self.entrada:
                  self.saida.append(self.entrada.pop())
          if not self.saida:
              raise IndexError("fila vazia")
          return self.saida.pop()


  # não mude esta função: é ela que os testes usam
  def usar_fila(fila, operacoes):
      saiu = []
      for op in operacoes:
          if op == "sai":
              saiu.append(fila.dequeue())
          else:
              fila.enqueue(op)
      return saiu
explicacao: "Despejar a pilha de entrada na de saída inverte a ordem, transformando LIFO em FIFO. Cada elemento é movido no máximo uma vez de uma pilha para a outra, então o custo total de n operações é O(n), ou seja, O(1) amortizado por operação."
dificuldade: 3
```

```quiz
id: ED-02-q8
tipo: codigo
linguagem: python
pergunta: |
  **Calculadora com pilha (notação polonesa reversa).** Na notação polonesa reversa, o operador vem depois dos operandos: `3 4 + 2 *` significa (3 + 4) × 2. Escreva `calcular(expr)` que recebe os itens separados por espaço e devolve o resultado como `int`. Operadores: `+`, `-`, `*` e `/` (divisão inteira, com `//`).
codigo_inicial: |
  def calcular(expr):
      pilha = []
      return 0
usa: [def, split, append, pop, return]
testes:
  - chamada: "calcular('3 4 + 2 *')"
    saida: "14"
  - chamada: "calcular('5 1 2 + 4 * + 3 -')"
    saida: "14"
  - chamada: "calcular('42')"
    saida: "42"
  - chamada: "calcular('10 3 -')"
    visivel: false
    saida: "7"
  - chamada: "calcular('2 3 4 * + 20 5 / -')"
    visivel: false
    saida: "10"
dica: "Percorra expr.split(). Número: empilhe int(item). Operador: desempilhe b (o de cima) e depois a, calcule a OP b e empilhe o resultado. No fim, a resposta é o único item da pilha. Atenção à ordem em - e /."
solucao: |
  def calcular(expr):
      pilha = []
      for item in expr.split():
          if item in "+-*/":
              b = pilha.pop()
              a = pilha.pop()
              if item == "+":
                  pilha.append(a + b)
              elif item == "-":
                  pilha.append(a - b)
              elif item == "*":
                  pilha.append(a * b)
              else:
                  pilha.append(a // b)
          else:
              pilha.append(int(item))
      return pilha.pop()
explicacao: "A pilha guarda os operandos esperando um operador. O primeiro pop é o operando da direita: em '10 3 -', b = 3 e a = 10, então 10 − 3. Calculadoras HP e a máquina virtual da JVM e do Python avaliam expressões exatamente assim."
dificuldade: 2
```

```quiz
id: ED-02-q9
tipo: codigo
linguagem: python
pergunta: |
  **Rodízio com fila (round-robin).** Um processador atende tarefas em rodízio: cada tarefa `(nome, tempo)` roda no máximo `quantum` unidades de tempo; se ainda faltar, volta para o **fim da fila** com o tempo restante. Escreva `ordem_de_termino(tarefas, quantum)` que devolve a lista dos nomes na ordem em que **terminam**. Use `collections.deque`.
codigo_inicial: |
  from collections import deque


  def ordem_de_termino(tarefas, quantum):
      fila = deque(tarefas)
      terminadas = []
      return terminadas
usa: [def, while, popleft, append, return]
testes:
  - chamada: "ordem_de_termino([('A', 3), ('B', 1), ('C', 2)], 2)"
    saida: "['B', 'C', 'A']"
  - chamada: "ordem_de_termino([('A', 5)], 2)"
    saida: "['A']"
  - chamada: "ordem_de_termino([], 3)"
    saida: "[]"
  - chamada: "ordem_de_termino([('P1', 4), ('P2', 4), ('P3', 1), ('P4', 7)], 3)"
    visivel: false
    saida: "['P3', 'P1', 'P2', 'P4']"
dica: "Enquanto a fila tiver itens: nome, tempo = fila.popleft(). Se tempo <= quantum, a tarefa termina (append do nome em terminadas). Senão, fila.append((nome, tempo - quantum))."
solucao: |
  from collections import deque


  def ordem_de_termino(tarefas, quantum):
      fila = deque(tarefas)
      terminadas = []
      while fila:
          nome, tempo = fila.popleft()
          if tempo <= quantum:
              terminadas.append(nome)
          else:
              fila.append((nome, tempo - quantum))
      return terminadas
explicacao: "A fila garante justiça: ninguém espera mais que uma volta inteira. É o escalonador round-robin dos sistemas operacionais (SO-03). Com deque, popleft e append são O(1); com list.pop(0) cada retirada seria O(n)."
dificuldade: 2
```

## Resumo

- **Pilha = LIFO** (push/pop no topo); **fila = FIFO** (entra no fim, sai da frente).
- Todas as operações principais são **O(1)** quando bem implementadas.
- Em Python: pilha com `list`, fila com `collections.deque` (nunca `list.pop(0)`).
- Pilhas aparecem em desfazer, navegação, parsing e na **pilha de chamadas**; filas em BFS, buffers e sistemas de mensagens.

## Para ir além

- Desafio extra: avalie expressões em notação polonesa reversa (`"3 4 + 2 *"` → 14) usando uma pilha.
- *Estruturas de Dados e Algoritmos em Python* (Goodrich, Tamassia, Goldwasser), cap. 6.
- **Próximos módulos**: ED-03 Listas ligadas e AL-05 BFS e DFS.
