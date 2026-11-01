---
codigo: AL-08
titulo: "Algoritmos gulosos"
trilha: Algoritmos
nivel: intermediario
prerequisitos: [AL-03]
duracao_min: 180
objetivos:
  - "Reconhecer a estratégia gulosa: escolher o melhor agora e nunca voltar atrás"
  - "Resolver seleção de atividades, troco com moedas canônicas e mochila fracionária"
  - "Justificar uma escolha gulosa com o argumento de troca"
  - "Encontrar contraexemplos em que o guloso falha"
  - "Construir um código de Huffman"
aprofundar:
  - nome: "Algorithms Illuminated, Part 3 (Stanford, via OSSU)"
    url: "https://www.algorithmsilluminated.org/"
    trecho: "Capítulos 13 (Introduction to Greedy Algorithms) e 14 (Huffman Codes)"
  - nome: "MIT 6.046J Design and Analysis of Algorithms"
    url: "https://ocw.mit.edu/courses/6-046j-design-and-analysis-of-algorithms-spring-2015/"
    trecho: "Lecture: Greedy Algorithms (Interval Scheduling)"
tags: [algoritmos, guloso, intervalos, huffman, argumento-de-troca, troco]
---

# Algoritmos gulosos

## Por que isso importa

Muitos problemas de otimização pedem "a melhor combinação" entre um número astronômico de possibilidades. Um algoritmo **guloso** corta caminho: a cada passo, escolhe o que **parece melhor agora** e segue em frente, sem nunca reconsiderar. Quando funciona, é simples e rápido (geralmente uma ordenação e um laço). Kruskal, Prim e Dijkstra são gulosos. A compressão de arquivos ZIP, JPEG e MP3 usa o código de Huffman, que é guloso. Agendar salas de reunião e escalar tarefas também. O difícil é saber **quando** o guloso acerta, porque em muitos problemas ele erra, e a resposta parece certa.

## Intuição

Você está num festival com vários shows e quer assistir ao **maior número** possível, sem sobreposição. Qual regra usar?

- "O show que começa primeiro"? Um show longo que começa cedo pode bloquear vários outros.
- "O show mais curto"? Um show curto pode estar bem no meio de dois outros que não se sobrepõem.
- "O show que **termina primeiro**"? Isso deixa o máximo de tempo livre para o resto. Essa é a regra certa.

O guloso é isso: achar a regra de escolha local que nunca te prejudica no final.

## Visual

Seleção de atividades, ordenadas pelo **término**:

```text
tempo:    0   1   2   3   4   5   6   7   8   9  10
A         [=======]                                    termina 2  ✓ (primeira)
B             [===========]                            termina 4  ✗ sobrepõe A
C                 [===]                                termina 3  ✓ começa ≥ 2
D                         [=======]                    termina 6  ✓ começa ≥ 3
E                     [===================]            termina 8  ✗
F                                 [=======]            termina 8  ✓ começa ≥ 6
G                                         [=====]      termina 9.5 ✗ sobrepõe F

escolhidas: A, C, D, F → 4 shows
```

Troco com moedas brasileiras (1, 5, 10, 25, 50 centavos e 1 real) para 68 centavos:

```text
50 → resta 18 → 10 → resta 8 → 5 → resta 3 → 1, 1, 1      6 moedas (ótimo)
```

Com moedas inventadas {1, 3, 4} para 6:

```text
guloso: 4 + 1 + 1 = 3 moedas        ótimo: 3 + 3 = 2 moedas    ✗ guloso falha
```

## Conceito técnico

### A estrutura de um guloso

1. Defina um **critério** de escolha (o menor, o que termina primeiro, o de maior valor por peso...).
2. Ordene (ou use um heap) por esse critério.
3. Percorra: se o item é **compatível** com o que já foi escolhido, escolha; senão, descarte.

Custo típico: O(n log n), dominado pela ordenação.

### Quando funciona: duas propriedades

- **Escolha gulosa**: existe uma solução ótima que começa com a escolha gulosa.
- **Subestrutura ótima**: depois da escolha, o que sobra é um problema menor do mesmo tipo, e a solução ótima dele, junto com a escolha, dá a ótima do todo.

### Argumento de troca

A forma clássica de provar a escolha gulosa: pegue uma solução ótima qualquer O. Se ela não começa com a escolha gulosa g, **troque** o primeiro item de O por g e mostre que a solução continua válida e não piora.

Seleção de atividades: seja a a atividade de O que termina primeiro, e g a que termina primeiro entre todas. Como g termina antes (ou junto) de a, trocar a por g não cria sobreposição com o resto de O. Mesmo número de atividades: continua ótima. ∎

### Problemas clássicos

| Problema | Critério guloso | Funciona? |
|---|---|---|
| Máximo de atividades sem sobreposição | menor **término** | sim |
| Mochila **fracionária** (pode levar pedaço) | maior **valor/peso** | sim |
| Mochila **0/1** (leva inteiro ou não leva) | maior valor/peso | **não** → programação dinâmica (AL-09) |
| Troco com moedas **canônicas** (real, dólar, euro) | maior moeda que cabe | sim |
| Troco com moedas quaisquer | maior moeda | **não** → AL-09 |
| Minimizar atraso máximo de tarefas | menor **prazo** primeiro | sim |
| Código de prefixo ótimo (compressão) | juntar os 2 **menos frequentes** (Huffman) | sim |
| Caixeiro-viajante | vizinho mais próximo | **não** (só aproxima) |

### Código de Huffman

Para comprimir um texto, dê códigos **curtos** às letras **frequentes** e longos às raras. Os códigos precisam ser **livres de prefixo** (nenhum código é começo de outro), para decodificar sem ambiguidade.

1. Ponha cada símbolo num min-heap, com sua frequência.
2. Tire os **dois menos frequentes**, junte-os num nó com a soma das frequências e devolva ao heap.
3. Repita até sobrar um nó: a raiz de uma árvore binária. O código de cada símbolo é o caminho até ele (esquerda = 0, direita = 1).

```text
frequências: a=5, b=2, c=1, d=1
junta c+d (2)        → heap: a5, b2, (cd)2
junta b+(cd) (4)     → heap: a5, (b(cd))4
junta (b(cd))+a (9)  → raiz

códigos: a=1, b=00, c=010, d=011
"aabbacdaa" → 9 letras × 8 bits = 72 bits em ASCII; com Huffman: 5×1 + 2×2 + 1×3 + 1×3 = 15 bits
```

## Código

Seleção de atividades:

```python
def max_atividades(atividades):            # [(inicio, fim), ...]
    escolhidas = []
    fim_ultima = float("-inf")
    for inicio, fim in sorted(atividades, key=lambda a: a[1]):
        if inicio >= fim_ultima:
            escolhidas.append((inicio, fim))
            fim_ultima = fim
    return escolhidas

shows = [(0, 2), (1, 4), (2, 3), (4, 6), (3, 8), (6, 8), (7.5, 9.5)]
print(max_atividades(shows))   # [(0, 2), (2, 3), (4, 6), (6, 8)]
```

Testando o guloso do troco contra a força bruta, para achar contraexemplos:

```python
from itertools import combinations_with_replacement

def troco_guloso(moedas, valor):
    n = 0
    for m in sorted(moedas, reverse=True):
        n += valor // m
        valor %= m
    return n if valor == 0 else None

def troco_otimo(moedas, valor):
    for k in range(1, valor + 1):
        for combo in combinations_with_replacement(moedas, k):
            if sum(combo) == valor:
                return k
    return None

moedas = [1, 3, 4]
for v in range(1, 15):
    g, o = troco_guloso(moedas, v), troco_otimo(moedas, v)
    if g != o:
        print(f"valor {v}: guloso {g}, ótimo {o}")
```

## Erros comuns

- **Confiar no guloso sem prova.** "Parece certo" é exatamente como o guloso engana. Procure um contraexemplo pequeno ou faça o argumento de troca.
- **Ordenar pelo critério errado.** Na seleção de atividades, ordenar pelo início ou pela duração dá respostas piores.
- **Aplicar o guloso de valor/peso na mochila 0/1.** Itens: (peso 10, valor 60), (20, 100), (30, 120), capacidade 50. Valor/peso escolhe os dois primeiros (160), mas o ótimo é 100 + 120 = 220.
- **Esquecer o caso de borda da compatibilidade**: atividades que terminam em 3 e começam em 3 são compatíveis (`>=`), a menos que o problema diga o contrário.
- **Achar que o troco guloso funciona para qualquer sistema de moedas.** Só para sistemas canônicos.

## Pratique

```quiz
id: AL-08-q1
tipo: multipla_escolha
pergunta: "Para escolher o maior número de reuniões sem sobreposição numa sala, por qual critério ordenar?"
opcoes: ["Pelo horário de início", "Pela duração (mais curtas primeiro)", "Pelo horário de término", "Pelo número de participantes"]
resposta: 2
explicacao: "Terminar o mais cedo possível deixa o máximo de tempo livre para as outras. Ordenar pelo início falha com uma reunião longa que começa cedo; pela duração falha com uma curta que fica bem no meio de duas compatíveis."
dificuldade: 1
```

```quiz
id: AL-08-q2
tipo: multipla_escolha
pergunta: "Com moedas {1, 3, 4} e troco de 6, o que o guloso (maior moeda primeiro) faz?"
opcoes: ["2 moedas (3 + 3), o ótimo", "3 moedas (4 + 1 + 1), mais que o ótimo", "Não consegue dar o troco", "6 moedas de 1"]
resposta: 1
explicacao: "Pega o 4 (maior que cabe), sobra 2, depois 1 e 1: 3 moedas. O ótimo é 3 + 3 = 2 moedas. Para sistemas de moedas quaisquer, o troco mínimo pede programação dinâmica (AL-09)."
dificuldade: 1
```

```quiz
id: AL-08-q3
tipo: multipla_escolha
pergunta: "Em qual problema o guloso por maior valor/peso dá a resposta ótima?"
opcoes: ["Mochila 0/1", "Mochila fracionária", "Nos dois", "Em nenhum"]
resposta: 1
explicacao: "Na fracionária, dá para levar um pedaço do último item, então encher a mochila com o que rende mais por kg é ótimo. Na 0/1, um item com ótima razão pode deixar um espaço que nenhum outro preenche bem."
dificuldade: 2
```

```quiz
id: AL-08-q4
tipo: verdadeiro_falso
pergunta: "No código de Huffman, os dois símbolos menos frequentes ficam nas folhas mais profundas da árvore."
resposta: true
explicacao: "Eles são os primeiros a ser juntados, então ficam no nível mais baixo e recebem os códigos mais longos. Faz sentido: códigos longos custam pouco quando o símbolo é raro."
dificuldade: 2
```

```quiz
id: AL-08-q5
tipo: resposta_curta
pergunta: "Descreva o argumento de troca para provar que escolher a atividade que termina primeiro é seguro."
resposta: "Pegue uma solução ótima qualquer e troque a atividade dela que termina primeiro pela atividade que termina primeiro de todas. Como esta termina antes ou junto, não sobrepõe nenhuma das outras escolhidas, e a quantidade de atividades continua a mesma. Então existe uma solução ótima que começa com a escolha gulosa."
palavras_chave: ["solução ótima", "troca", "termina antes", "mesma quantidade"]
dificuldade: 3
```

```quiz
id: AL-08-q6
tipo: codigo
linguagem: python
pergunta: |
  **Máximo de atividades.** Escreva `max_atividades(atividades)` que recebe uma lista de pares `(inicio, fim)` e devolve **quantas** atividades sem sobreposição dá para escolher, no máximo. Uma atividade que começa exatamente quando outra termina é compatível com ela.
codigo_inicial: |
  def max_atividades(atividades):
      return len(atividades)
usa: [def, for, sorted, return]
testes:
  - chamada: "max_atividades([(0, 2), (1, 4), (2, 3), (4, 6), (3, 8), (6, 8), (7.5, 9.5)])"
    saida: "4"
  - chamada: "max_atividades([(1, 10), (2, 3), (4, 5), (6, 7)])"
    saida: "3"
  - chamada: "max_atividades([])"
    saida: "0"
  - chamada: "max_atividades([(1, 2), (2, 3), (3, 4)])"
    visivel: false
    saida: "3"
  - chamada: "max_atividades([(i % 1000, i % 1000 + 1 + i % 3) for i in range(200000)])"
    visivel: false
    saida: "1000"
dica: "Ordene pelo fim (key=lambda a: a[1]). Guarde o fim da última escolhida (comece com -infinito). Para cada atividade, se o início for >= esse fim, conte e atualize."
solucao: |
  def max_atividades(atividades):
      total = 0
      fim_ultima = float("-inf")
      for inicio, fim in sorted(atividades, key=lambda a: a[1]):
          if inicio >= fim_ultima:
              total += 1
              fim_ultima = fim
      return total
explicacao: "No segundo teste, ordenar pelo início pegaria (1, 10) e bloquearia as outras três. Pelo término, o (1, 10) fica por último e é descartado. O custo é O(n log n) da ordenação mais uma passada."
dificuldade: 2
```

```quiz
id: AL-08-q7
tipo: codigo
linguagem: python
pergunta: |
  **Mochila fracionária.** Itens são pares `(peso, valor)` e dá para levar **frações** de um item. Escreva `mochila_fracionaria(itens, capacidade)` que devolve o maior valor possível, como `float` arredondado com `round(x, 2)`.
codigo_inicial: |
  def mochila_fracionaria(itens, capacidade):
      return 0
usa: [def, for, sorted, return]
testes:
  - chamada: "mochila_fracionaria([(10, 60), (20, 100), (30, 120)], 50)"
    saida: "240.0"
  - chamada: "mochila_fracionaria([(5, 10)], 2)"
    saida: "4.0"
  - chamada: "mochila_fracionaria([(1, 1), (2, 2)], 100)"
    saida: "3.0"
  - chamada: "mochila_fracionaria([], 10)"
    visivel: false
    saida: "0.0"
  - chamada: "mochila_fracionaria([(3, 7), (4, 4), (2, 9)], 4)"
    visivel: false
    saida: "13.67"
dica: "Ordene por valor/peso decrescente. Para cada item: se cabe inteiro, leve tudo e diminua a capacidade; senão, leve a fração capacidade/peso do valor e pare."
solucao: |
  def mochila_fracionaria(itens, capacidade):
      total = 0
      for peso, valor in sorted(itens, key=lambda i: i[1] / i[0], reverse=True):
          if capacidade <= 0:
              break
          if peso <= capacidade:
              total += valor
              capacidade -= peso
          else:
              total += valor * capacidade / peso
              capacidade = 0
      return round(float(total), 2)
explicacao: "No primeiro teste, as razões são 6, 5 e 4: leva os dois primeiros inteiros (160) e 20 dos 30 kg do terceiro (80), total 240. Se fosse mochila 0/1, o melhor seria 220 (segundo e terceiro), e o guloso daria 160: por isso a 0/1 pede programação dinâmica."
dificuldade: 2
```

```quiz
id: AL-08-q8
tipo: codigo
linguagem: python
pergunta: |
  **Tamanho do Huffman.** Dado um dict `{simbolo: frequencia}`, escreva `bits_huffman(freq)` que devolve o **total de bits** do texto codificado com Huffman, isto é, a soma de `frequencia × tamanho do código` de cada símbolo. Dica: esse total é igual à **soma de todos os nós internos** criados ao juntar pares no heap. Com um único símbolo, o código tem 1 bit.
codigo_inicial: |
  import heapq


  def bits_huffman(freq):
      return 8 * sum(freq.values())
usa: [def, while, heappop, heappush]
testes:
  - chamada: "bits_huffman({'a': 5, 'b': 2, 'c': 1, 'd': 1})"
    saida: "15"
  - chamada: "bits_huffman({'x': 1, 'y': 1})"
    saida: "2"
  - chamada: "bits_huffman({'z': 7})"
    saida: "7"
  - chamada: "bits_huffman({'a': 45, 'b': 13, 'c': 12, 'd': 16, 'e': 9, 'f': 5})"
    visivel: false
    saida: "224"
  - chamada: "bits_huffman({str(i): 1 for i in range(1024)})"
    visivel: false
    saida: "10240"
dica: "Ponha as frequências num heap. Se só houver uma, devolva ela. Enquanto o heap tiver 2 ou mais: tire a e b, some a + b ao total e empurre a + b de volta."
solucao: |
  import heapq


  def bits_huffman(freq):
      heap = list(freq.values())
      if len(heap) == 1:
          return heap[0]
      heapq.heapify(heap)
      total = 0
      while len(heap) > 1:
          a = heapq.heappop(heap)
          b = heapq.heappop(heap)
          total += a + b
          heapq.heappush(heap, a + b)
      return total
explicacao: "Cada vez que dois nós são juntados, todos os símbolos abaixo deles ganham 1 bit de código. Somar o peso do nó novo conta exatamente esses bits. O exemplo com a: 45, ... f: 5 é o clássico do livro de Cormen: 224 bits contra 300 de um código de tamanho fixo com 3 bits. Com 1024 símbolos iguais, Huffman dá 10 bits para todos, como um código fixo."
dificuldade: 3
```

## Resumo

- **Guloso**: escolhe o melhor local agora, nunca volta atrás. Normalmente: ordenar + uma passada.
- Funciona quando há **escolha gulosa** + **subestrutura ótima**. Prove com o **argumento de troca**.
- Acerta: atividades (menor término), mochila fracionária, troco canônico, Huffman, Kruskal/Prim/Dijkstra.
- Erra: mochila 0/1, troco com moedas quaisquer, caixeiro-viajante. Aí entra a programação dinâmica.

## Para ir além

- O capítulo 14 do Algorithms Illuminated prova que Huffman é ótimo; vale ler depois de fazer o desafio.
- **Próximo módulo**: AL-09 Programação dinâmica, que resolve os casos em que o guloso falha.
