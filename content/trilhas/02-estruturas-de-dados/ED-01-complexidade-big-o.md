---
codigo: ED-01
titulo: Complexidade e notação Big-O
trilha: Estruturas de dados
nivel: basico
prerequisitos: [FP-05]
duracao_min: 50
objetivos:
  - "Explicar o que a notação Big-O mede e o que ela ignora"
  - "Determinar a complexidade de tempo de laços simples, aninhados e de divisão pela metade"
  - "Comparar as classes O(1), O(log n), O(n), O(n log n), O(n²) e O(2ⁿ)"
  - "Distinguir melhor caso, pior caso e caso médio"
aprofundar:
  - nome: "Algorithms Illuminated / Stanford Algorithms Part 1 (via OSSU)"
    url: "https://www.algorithmsilluminated.org/"
    trecho: "Parte 1, cap. 2: notação assintótica"
  - nome: "MIT 6.042J Mathematics for Computer Science (via OSSU)"
    url: "https://openlearninglibrary.mit.edu/courses/course-v1:OCW+6.042J+2T2019/about"
    trecho: "Crescimento assintótico"
tags: [complexidade, big-o, analise-de-algoritmos]
---

# Complexidade e notação Big-O

## Por que isso importa

Dois programas podem dar a mesma resposta e um deles levar 1 segundo enquanto o outro leva 3 horas. Medir com cronômetro não basta, porque o resultado muda com o computador, a linguagem e o tamanho da entrada. Big-O é a linguagem que engenheiros usam para dizer **como o custo cresce quando a entrada cresce**, independente da máquina.

## Intuição

Imagine que você precisa achar o nome "Marina" em uma lista de chamada:

- **Lista desordenada**: você lê nome por nome. Com 30 alunos, até 30 olhadas; com 3.000, até 3.000. O trabalho cresce **na mesma proporção** da lista: O(n).
- **Lista em ordem alfabética**: você abre no meio, vê se "Marina" vem antes ou depois e descarta metade. Com 3.000 nomes, umas 12 olhadas bastam. O trabalho cresce **muito devagar**: O(log n).
- **Saber o número de chamada dela**: vai direto. Não importa o tamanho da turma: O(1).

## Visual

Quantas operações cada classe faz conforme `n` cresce:

| n | O(1) | O(log n) | O(n) | O(n log n) | O(n²) | O(2ⁿ) |
|---|---|---|---|---|---|---|
| 10 | 1 | 3 | 10 | 33 | 100 | 1.024 |
| 100 | 1 | 7 | 100 | 664 | 10.000 | ≈ 10³⁰ |
| 1.000 | 1 | 10 | 1.000 | 9.966 | 1.000.000 | 💥 |
| 1.000.000 | 1 | 20 | 10⁶ | 2 × 10⁷ | 10¹² | 💥 |

```
operações
   ▲                                    O(2ⁿ)  O(n²)
   │                                   ╱      ╱
   │                                  ╱     ╱
   │                                 ╱    ╱        O(n log n)
   │                                ╱   ╱      ___╱
   │                               ╱  ╱   ___╱        O(n)
   │                              ╱ ╱ ___╱      ______╱
   │                            ╱╱__╱     _____╱
   │                         _╱╱╱________╱____________ O(log n)
   │__________________________________________________ O(1)
   └──────────────────────────────────────────────────▶ n
```

> **Para o app**: gráfico interativo com um slider de `n` mostrando as curvas e o "tempo estimado" a 10⁸ operações/segundo.

## Conceito técnico

**Definição.** Dizemos que `f(n) = O(g(n))` se existem constantes `c > 0` e `n₀` tais que `f(n) ≤ c · g(n)` para todo `n ≥ n₀`. Em português: a partir de certo tamanho, `f` nunca passa de um múltiplo de `g`. Big-O é um **limite superior** do crescimento.

**Regras práticas para calcular:**

1. **Descarte constantes**: `O(3n)` → `O(n)`; `O(500)` → `O(1)`.
2. **Fique com o termo dominante**: `O(n² + 5n + 100)` → `O(n²)`.
3. **Passos em sequência somam**: um laço O(n) seguido de outro O(n) → O(2n) → O(n).
4. **Laços aninhados multiplicam**: um laço O(n) dentro de outro O(n) → O(n²).
5. **Dividir o problema pela metade a cada passo** → O(log n).
6. **Entradas diferentes, variáveis diferentes**: percorrer `a` e depois `b` é O(a + b), não O(n).

**Melhor, pior e caso médio.** Na busca linear, o melhor caso é O(1) (o item é o primeiro) e o pior é O(n) (o item é o último ou não existe). Quando alguém diz só "a complexidade é...", normalmente fala do **pior caso**.

**Espaço também conta.** Complexidade de espaço mede a memória **extra** usada. Copiar uma lista inteira é O(n) de espaço; usar duas variáveis auxiliares é O(1).

**Parentes do Big-O** (para reconhecer):
- **Ω (ômega)**: limite inferior.
- **Θ (teta)**: limite justo (superior e inferior ao mesmo tempo).

## Código

```python
def primeiro(lista):            # O(1): uma operação, qualquer tamanho
    return lista[0]

def contem(lista, alvo):        # O(n): no pior caso olha todos os itens
    for x in lista:
        if x == alvo:
            return True
    return False

def tem_duplicata(lista):       # O(n²): compara cada par
    n = len(lista)
    for i in range(n):
        for j in range(i + 1, n):
            if lista[i] == lista[j]:
                return True
    return False

def tem_duplicata_rapido(lista):  # O(n) tempo, O(n) espaço: troca memória por velocidade
    vistos = set()
    for x in lista:
        if x in vistos:          # busca em set é O(1) em média
            return True
        vistos.add(x)
    return False

def busca_binaria(ordenada, alvo):  # O(log n): descarta metade a cada passo
    lo, hi = 0, len(ordenada) - 1
    while lo <= hi:
        meio = (lo + hi) // 2
        if ordenada[meio] == alvo:
            return meio
        if ordenada[meio] < alvo:
            lo = meio + 1
        else:
            hi = meio - 1
    return -1
```

Repare em `tem_duplicata` vs. `tem_duplicata_rapido`: é o **trade-off tempo × espaço** mais comum do dia a dia.

## Erros comuns

- **"O(1) significa rápido."** Significa **constante**: pode ser uma operação constante e lenta (ex.: 2 segundos sempre).
- **"Dois laços = O(n²)."** Só se forem **aninhados**. Dois laços em sequência são O(n).
- **Esquecer o custo escondido de funções prontas.** `x in lista` é O(n); `lista.insert(0, x)` é O(n); `sorted()` é O(n log n). Um `in lista` dentro de um `for` vira O(n²).
- **Achar que Big-O decide tudo para n pequeno.** Com n = 10, um O(n²) simples pode ser mais rápido que um O(n log n) cheio de overhead.
- **Confundir log n com n/2.** Metade de 1.000.000 é 500.000; log₂ de 1.000.000 é ≈ 20.

## Pratique

```quiz
id: ED-01-q1
tipo: multipla_escolha
pergunta: "Qual a complexidade de tempo de um laço `for i in range(n)` que contém outro `for j in range(n)`?"
opcoes: ["O(n)", "O(2n)", "O(n²)", "O(n log n)"]
resposta: 2
explicacao: "Laços aninhados multiplicam: para cada um dos n valores de i, o laço interno roda n vezes, total n·n = n². O(2n) seria o caso de dois laços em sequência, que simplifica para O(n)."
dificuldade: 1
```

```quiz
id: ED-01-q2
tipo: multipla_escolha
pergunta: "Simplifique: O(4n² + 100n + 3.000)"
opcoes: ["O(4n²)", "O(n²)", "O(n² + n)", "O(3.000)"]
resposta: 1
explicacao: "Descartamos constantes multiplicativas (4) e termos de menor ordem (100n e 3.000), pois para n grande o n² domina."
dificuldade: 1
```

```quiz
id: ED-01-q3
tipo: verdadeiro_falso
pergunta: "Um algoritmo O(n) é sempre mais rápido que um O(n²), para qualquer tamanho de entrada."
resposta: false
explicacao: "Big-O descreve crescimento para n grande e ignora constantes. Um O(n) com custo 1.000·n é mais lento que um O(n²) com custo n² enquanto n < 1.000."
dificuldade: 2
```

```quiz
id: ED-01-q4
tipo: prever_saida
pergunta: |
  Qual a complexidade de tempo desta função?
  ```python
  def f(n):
      i = n
      while i > 1:
          i = i // 2
  ```
resposta: "O(log n)"
explicacao: "i é dividido por 2 a cada volta; o número de voltas é quantas vezes dá para dividir n por 2 até chegar a 1, que é log₂ n."
dificuldade: 2
```

```quiz
id: ED-01-q5
tipo: multipla_escolha
pergunta: "Uma função percorre a lista `a` (tamanho a) e depois, separadamente, a lista `b` (tamanho b). Qual a complexidade?"
opcoes: ["O(n)", "O(a · b)", "O(a + b)", "O(max(a, b)²)"]
resposta: 2
explicacao: "São passos em sequência, então somam. Como as listas têm tamanhos independentes, usamos variáveis diferentes: O(a + b). O(a·b) seria se um laço estivesse dentro do outro."
dificuldade: 2
```

```quiz
id: ED-01-q6
tipo: prever_saida
pergunta: |
  Qual a complexidade de tempo?
  ```python
  def g(lista):
      resultado = []
      for x in lista:
          if x not in resultado:
              resultado.append(x)
      return resultado
  ```
resposta: "O(n²)"
explicacao: "`x not in resultado` percorre a lista `resultado`, que pode ter até n itens. Esse O(n) escondido dentro do laço O(n) gera O(n²). Trocar `resultado` por um set (mantendo a ordem em uma lista separada) baixa para O(n)."
dificuldade: 3
```

```quiz
id: ED-01-q7
tipo: resposta_curta
pergunta: "Explique com suas palavras por que a busca binária é O(log n) e qual condição ela exige da entrada."
resposta: "A cada comparação ela descarta metade dos elementos restantes, então o número de passos é quantas vezes dá para dividir n por 2, que é log₂ n. Ela exige que a lista esteja ordenada."
palavras_chave: ["metade", "ordenada", "log"]
dificuldade: 2
```

```quiz
id: ED-01-q8
tipo: codigo
pergunta: "Escreva `soma_par_alvo(nums, alvo)` que retorna True se existirem dois números distintos (posições diferentes) cuja soma é `alvo`. Meta: O(n) de tempo."
assinatura: "def soma_par_alvo(nums: list[int], alvo: int) -> bool"
testes:
  - entrada: "([2, 7, 11, 15], 9)"
    saida: "True"
  - entrada: "([3, 3], 6)"
    saida: "True"
  - entrada: "([3], 6)"
    saida: "False"
  - entrada: "([1, 2, 3], 7)"
    saida: "False"
dica: "Para cada número x, o que você precisa ter visto antes? Guarde os vistos em um set."
resposta: |
  def soma_par_alvo(nums, alvo):
      vistos = set()
      for x in nums:
          if alvo - x in vistos:
              return True
          vistos.add(x)
      return False
explicacao: "A versão ingênua testa todos os pares em O(n²). Guardando os números vistos em um set, cada verificação de complemento é O(1) em média, total O(n) de tempo e O(n) de espaço."
dificuldade: 2
```

## Resumo

- Big-O mede **como o custo cresce** com a entrada, ignorando constantes e termos menores.
- Sequência **soma**, aninhamento **multiplica**, dividir pela metade dá **log n**.
- Fale do **pior caso** por padrão e lembre que **espaço** também é complexidade.
- Cuidado com operações O(n) escondidas (`in lista`, `insert(0, ...)`) dentro de laços.
- Trocar memória por tempo (usar `set`/`dict`) é o truque mais usado para sair de O(n²).

## Para ir além

- *Entendendo Algoritmos* (Aditya Bhargava), cap. 1: ótima introdução visual.
- *Introduction to Algorithms* (CLRS), cap. 3: definição formal de O, Ω e Θ.
- Big-O Cheat Sheet (bigocheatsheet.com): tabela de complexidades das estruturas comuns.
- **Próximo módulo**: ED-02 Pilhas e filas, e AL-01 Busca linear e binária.
