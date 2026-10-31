---
codigo: FP-01
titulo: Como um programa executa
trilha: Fundamentos de programação
nivel: basico
prerequisitos: []
duracao_min: 75
objetivos:
  - "Explicar o que é um programa e o que o computador realmente entende"
  - "Diferenciar compilador e interpretador"
  - "Escrever e executar seu primeiro programa em Python"
  - "Reconhecer os tipos int, float, str e bool e converter entre eles"
  - "Ler dados do teclado com input() e transformar em número antes de fazer contas"
  - "Indentar blocos de código com 4 espaços"
  - "Ler uma mensagem de erro simples e localizar a linha do problema"
aprofundar:
  - nome: "MIT 6.0001 Introduction to CS and Programming using Python (via OSSU)"
    url: "https://github.com/ossu/computer-science/blob/master/coursepages/intro-cs/README.md"
    trecho: "Aula 1: o que é computação"
tags: [fundamentos, compilador, interpretador, python, tipos-de-dados, input]
---

# Como um programa executa

## Por que isso importa

Antes de aprender comandos, vale entender o caminho que o seu texto percorre até virar algo que o computador faz. Isso explica por que um erro aparece "antes de rodar" em algumas linguagens e "no meio da execução" em outras, e ajuda muito a ler mensagens de erro.

## Intuição

Pense em uma **receita de bolo**. Você escreve em português; a cozinheira só entende outra língua. Existem duas formas de resolver:

- **Tradutor de livro (compilador)**: traduz a receita inteira de uma vez e entrega um livro novo. Depois disso, a cozinheira usa o livro traduzido quantas vezes quiser, sem o tradutor.
- **Intérprete ao vivo (interpretador)**: fica ao lado da cozinheira e traduz linha por linha enquanto ela cozinha. Se uma linha estiver errada, ele só percebe quando chega nela.

## Visual

```
COMPILADO (C, Go, Rust)
  código-fonte ──► [compilador] ──► executável (código de máquina) ──► CPU executa
   programa.c                         programa.exe

INTERPRETADO (Python, JavaScript)
  código-fonte ──► [interpretador lê e executa linha a linha] ──► resultado
   programa.py         python
```

> **Para o app**: animação em que cada linha de um programa Python acende enquanto executa, com a saída aparecendo ao lado.

## Conceito técnico

- **Programa**: sequência de instruções que diz ao computador o que fazer.
- **Código de máquina**: a única coisa que a CPU entende diretamente, instruções em binário (0s e 1s).
- **Linguagem de alto nível** (Python, Java, JavaScript): feita para humanos lerem e escreverem.
- **Compilador**: traduz o programa inteiro para código de máquina antes de executar. Erros de sintaxe aparecem já na compilação. Costuma gerar programas mais rápidos.
- **Interpretador**: lê e executa o código aos poucos. Mais fácil de testar e experimentar, geralmente mais lento.
- **Na prática há mistura**: o Python compila seu código para um *bytecode* intermediário e o interpretador executa esse bytecode; Java compila para bytecode que roda na JVM.

**Tipos de erro que você vai encontrar:**

| Tipo | Quando aparece | Exemplo |
|---|---|---|
| Erro de sintaxe | Antes de executar | Esqueceu de fechar um parêntese |
| Erro de execução | Durante a execução | Dividir por zero |
| Erro de lógica | Nunca "aparece": o programa roda, mas dá a resposta errada | Somar quando deveria subtrair |

## Código

Seu primeiro programa. Clique em **▶ Experimentar** para abrir no editor, escreva seu nome no campo **Entrada do programa** e execute (ou salve como `ola.py` e rode com `python ola.py` no terminal):

```python
# Linhas que começam com # são comentários: o computador ignora.
nome = input("Qual é o seu nome? ")   # lê o que você digitar
print("Olá,", nome)                    # mostra na tela
print("2 + 3 =", 2 + 3)
```

Um erro de propósito, para aprender a ler a mensagem:

```python
print("início")
print(10 / 0)
print("fim")
```

```
início
Traceback (most recent call last):
  File "erro.py", line 2, in <module>
    print(10 / 0)
ZeroDivisionError: division by zero
```

Como ler: a **última linha** diz o tipo do erro (`ZeroDivisionError`) e a explicação; a linha `line 2` diz **onde** aconteceu. Repare que `"início"` foi impresso: o interpretador executou a linha 1 antes de chegar no erro, e `"fim"` nunca rodou.

## Dados e tipos: o que o programa guarda

Todo programa trabalha com **dados**: um nome, uma idade, um preço, uma resposta "sim ou não". Para o computador, cada dado tem um **tipo**, e o tipo decide **o que dá para fazer** com ele. Somar duas idades faz sentido; somar dois nomes, não do mesmo jeito.

### Variáveis

Uma **variável** é um nome que guarda um valor. O sinal `=` significa **"guarde o valor da direita no nome da esquerda"** (não é o "igual" da matemática):

```python
idade = 26          # guarde 26 no nome idade
idade = idade + 1   # pegue o valor atual (26), some 1 e guarde de novo: agora é 27
print(idade)
```

Regras de nome: letras, números e `_`, sem começar com número e sem espaço. Use nomes que explicam o dado: `ano_nascimento` é melhor que `x`. `Idade` e `idade` são nomes **diferentes** (o Python diferencia maiúsculas e minúsculas).

### Os quatro tipos básicos

| Tipo | Nome completo | Exemplos | Para quê |
|---|---|---|---|
| `int` | inteiro | `26`, `-3`, `0`, `2026` | contar, idade, ano, quantidade |
| `float` | número com casas decimais (ponto flutuante) | `1.75`, `3.0`, `-0.5` | altura, preço, média |
| `str` | texto (*string*, "cadeia de caracteres") | `"Israel"`, `'26'`, `""` | nomes, mensagens, qualquer texto |
| `bool` | lógico (booleano) | `True`, `False` | respostas sim/não, resultado de comparações |

Detalhes que pegam muita gente:

- O separador decimal é o **ponto**: `1.75`, nunca `1,75`.
- `"26"` (com aspas) é **texto**; `26` (sem aspas) é **número**. Parecem iguais na tela, mas são tipos diferentes.
- `True` e `False` começam com maiúscula e não têm aspas.

A função `type()` mostra o tipo de qualquer valor. Experimente:

```python
print(type(26))        # <class 'int'>
print(type(1.75))      # <class 'float'>
print(type("26"))      # <class 'str'>
print(type(26 > 18))   # <class 'bool'>
```

### Operações dependem do tipo

```python
print(7 + 2)      # 9      soma de int
print(7 / 2)      # 3.5    divisão "normal" sempre dá float
print(7 // 2)     # 3      divisão inteira (descarta a parte decimal)
print(7 % 2)      # 1      resto da divisão
print(2 ** 3)     # 8      potência
print("7" + "2")  # 72     com texto, + JUNTA (concatena)
print("ab" * 3)   # ababab texto * int repete
print(7 > 2)      # True   comparação dá bool
```

O mesmo `+` soma números e junta textos. Misturar os dois (`"7" + 2`) é erro: o Python não adivinha se você quer `9` ou `"72"`.

### input() sempre devolve texto

Este é o erro mais comum de quem está começando. Tudo que a pessoa digita chega como **str**, mesmo que sejam só números:

```python
idade = input("Quantos anos você tem? ")   # a pessoa digita 26
print(type(idade))                          # <class 'str'>: é o texto "26"
print(idade + 1)                            # TypeError!
```

```
Traceback (most recent call last):
  File "main.py", line 3, in <module>
    print(idade + 1)
TypeError: can only concatenate str (not "int") to str
```

A mensagem diz: "só consigo juntar str com str, não com int". A correção é **converter** o texto em número logo na leitura:

```python
idade = int(input("Quantos anos você tem? "))   # "26" vira 26
print(type(idade))                               # <class 'int'>
print("Ano que vem você terá", idade + 1, "anos")
```

Leia de dentro para fora: `input(...)` devolve o texto `"26"`, e `int(...)` transforma esse texto no número `26`.

### Conversão de tipos

| Conversão | Resultado | Observação |
|---|---|---|
| `int("26")` | `26` | texto de número inteiro vira int |
| `int("1.75")` | **ValueError** | o texto tem ponto: use `float` |
| `int("vinte")` | **ValueError** | não é número |
| `int(3.99)` | `3` | de float para int **corta** as casas decimais (não arredonda) |
| `float("1.75")` | `1.75` | texto com ponto vira float |
| `float("1,75")` | **ValueError** | vírgula não é aceita |
| `str(26)` | `"26"` | número vira texto |
| `round(3.567, 2)` | `3.57` | arredonda para 2 casas |
| `bool(0)`, `bool("")` | `False` | zero e texto vazio são "falsos"; o resto é `True` |

### Montando frases: f-strings

Para colocar valores dentro de um texto, a forma mais clara é a **f-string**: um `f` antes das aspas e as variáveis entre `{ }`. Ela converte os números para texto sozinha:

```python
nome = "Israel"
idade = 26
altura = 1.756
print(f"{nome} tem {idade} anos.")                 # Israel tem 26 anos.
print(f"Daqui a 10 anos: {idade + 10} anos.")      # dá para fazer contas dentro das { }
print(f"Altura: {altura:.2f} m")                   # :.2f mostra 2 casas decimais: 1.76
```

Outras formas que você vai ver por aí: `print(nome, "tem", idade, "anos.")` (vírgulas separam com espaço) e `print(nome + " tem " + str(idade) + " anos.")` (precisa converter com `str`).

### Blocos e indentação

Às vezes o programa precisa **decidir** o que fazer. As linhas que dependem de uma decisão formam um **bloco**, e em Python o bloco é marcado pela **indentação**: a linha que abre o bloco termina com `:`, e as linhas de dentro vêm com **4 espaços** a mais.

```python
idade = int(input("Idade: "))
if idade >= 18:
    print("Maior de idade")      # 4 espaços: só roda se a condição for True
    print("Pode tirar a CNH")
else:
    print("Menor de idade")      # só roda se a condição for False
print("Fim")                     # sem recuo: sempre roda
```

Em outras linguagens o recuo é só estética; **em Python ele faz parte do código**. Recuo errado gera `IndentationError`, ou pior, muda o que o programa faz sem dar erro. O editor desta aula já indenta sozinho depois do `:` (e a tecla Tab soma 4 espaços); a correção dos desafios confere se cada nível tem exatamente 4 espaços.

## Erros comuns

- **Achar que o computador "entende" Python.** Ele só entende código de máquina; sempre há um tradutor no meio.
- **Ler a mensagem de erro de cima para baixo e desistir.** Comece pela última linha e depois procure o número da linha.
- **Confundir o terminal do sistema com o modo interativo do Python** (`>>>`). Comandos como `python ola.py` são digitados no terminal, não depois de `>>>`.
- **Esquecer de salvar o arquivo antes de rodar.**
- **Fazer conta com o resultado de `input()` sem converter.** `input()` devolve `str`; use `int(...)` ou `float(...)`.
- **Usar vírgula como separador decimal** (`1,75`). Em Python é ponto: `1.75`.
- **Misturar TAB e espaços, ou indentar com 2 espaços.** Use sempre 4 espaços por nível.
- **Escrever `Print` ou `true`.** Maiúsculas importam: o certo é `print` e `True`.

## Pratique

```quiz
id: FP-01-q1
tipo: multipla_escolha
pergunta: "Qual é a única linguagem que a CPU executa diretamente?"
opcoes: ["Python", "C", "Código de máquina", "Assembly"]
resposta: 2
explicacao: "A CPU executa só código de máquina (binário). Assembly é uma forma legível dele, mas ainda precisa ser montado; C e Python precisam ser compilados ou interpretados."
dificuldade: 1
```

```quiz
id: FP-01-q2
tipo: multipla_escolha
pergunta: "Qual descrição combina com um compilador?"
opcoes: ["Traduz e executa uma linha por vez", "Traduz o programa inteiro antes da execução", "Corrige erros de lógica automaticamente", "Só funciona com Python"]
resposta: 1
explicacao: "O compilador traduz tudo antes e gera um executável. Traduzir e executar linha a linha é o que um interpretador faz. Nenhum dos dois corrige erros de lógica."
dificuldade: 1
```

```quiz
id: FP-01-q3
tipo: prever_saida
pergunta: |
  O que aparece na tela?
  ```python
  print("A")
  print(5 / 0)
  print("B")
  ```
resposta: "A, e depois a mensagem ZeroDivisionError. B não é impresso."
explicacao: "O Python executa em ordem: imprime A, encontra a divisão por zero na linha 2 e para com erro. A linha 3 nunca é executada."
dificuldade: 1
```

```quiz
id: FP-01-q4
tipo: verdadeiro_falso
pergunta: "Se um programa roda sem nenhuma mensagem de erro, ele está correto."
resposta: false
explicacao: "Erros de lógica não geram mensagem: o programa roda normalmente, mas produz o resultado errado. Por isso testamos os programas com entradas cujo resultado já conhecemos."
dificuldade: 1
```

```quiz
id: FP-01-q5
tipo: resposta_curta
pergunta: "Usando a analogia da receita, explique a diferença entre compilador e interpretador."
resposta: "O compilador é como um tradutor que traduz a receita inteira antes e entrega um livro pronto; o interpretador é como alguém que traduz linha por linha enquanto a pessoa cozinha."
palavras_chave: ["inteiro", "antes", "linha"]
dificuldade: 1
```

```quiz
id: FP-01-q7
tipo: multipla_escolha
pergunta: |
  A pessoa digita `25` quando este programa roda. Qual é o tipo de `idade`?
  ```python
  idade = input("Idade: ")
  ```
opcoes: ["int", "float", "str", "bool"]
resposta: 2
explicacao: "input() sempre devolve texto (str), mesmo quando a pessoa digita só números. Para virar int é preciso converter: int(input(...))."
dificuldade: 1
```

```quiz
id: FP-01-q8
tipo: multipla_escolha
pergunta: "Qual destas conversões causa ValueError?"
opcoes: ['int("42")', 'float("1.75")', 'int("1.75")', 'str(3.5)']
resposta: 2
explicacao: "int() só aceita texto de número inteiro. \"1.75\" tem ponto decimal, então precisa de float(). As outras conversões funcionam: 42, 1.75 e \"3.5\"."
dificuldade: 1
```

```quiz
id: FP-01-q9
tipo: prever_saida
pergunta: |
  O que aparece na tela?
  ```python
  print(7 / 2)
  print(7 // 2)
  print("7" + "2")
  print(type(7 > 2))
  ```
resposta: "3.5, depois 3, depois 72 e por fim <class 'bool'>."
explicacao: "/ sempre dá float (3.5); // é a divisão inteira (3); + entre textos junta (\"72\"); e uma comparação devolve um bool."
dificuldade: 1
```

```quiz
id: FP-01-q10
tipo: codigo
linguagem: python
pergunta: |
  **Idade daqui a 10 anos.** Escreva um programa que lê a idade da pessoa com `input()` e imprime exatamente:

  ```
  Você tem 26 anos.
  Daqui a 10 anos você terá 36 anos.
  ```

  (os números mudam conforme a idade digitada). Escreva a idade digitada no campo **Entrada do programa**, use **▶ Executar** para testar e **✓ Verificar resposta** para corrigir.
codigo_inicial: |
  # Leia a idade e converta para int

usa: [input, int, print]
testes:
  - entrada: "26"
    saida: |
      Você tem 26 anos.
      Daqui a 10 anos você terá 36 anos.
  - entrada: "8"
    saida: |
      Você tem 8 anos.
      Daqui a 10 anos você terá 18 anos.
  - entrada: "61"
    visivel: false
    saida: |
      Você tem 61 anos.
      Daqui a 10 anos você terá 71 anos.
dica: "input() devolve texto. Converta com int(...) antes de somar 10. Uma f-string ajuda a montar a frase: f\"Você tem {idade} anos.\""
solucao: |
  idade = int(input("Qual é a sua idade? "))
  print(f"Você tem {idade} anos.")
  print(f"Daqui a 10 anos você terá {idade + 10} anos.")
explicacao: "int() transforma o texto digitado em número, e só então a soma idade + 10 funciona. O texto da pergunta do input() não conta na saída: só o que o print() mostra é comparado."
dificuldade: 1
```

```quiz
id: FP-01-q11
tipo: codigo
linguagem: python
pergunta: |
  **Conserte o programa.** Ele deveria dizer quantos anos a pessoa terá no ano que vem, mas dá erro. Execute, leia a mensagem de erro, descubra a linha e corrija. Saída esperada para a entrada `17`:

  ```
  Ano que vem você terá 18 anos.
  ```
codigo_inicial: |
  idade = input("Idade: ")
  print("Ano que vem você terá " + idade + 1 + " anos.")
usa: [int]
testes:
  - entrada: "17"
    saida: "Ano que vem você terá 18 anos."
  - entrada: "40"
    visivel: false
    saida: "Ano que vem você terá 41 anos."
dica: "São dois problemas de tipo: idade é str (converta com int) e, para juntar um número no meio do texto com +, ele precisa virar str. Ou troque tudo por uma f-string."
solucao: |
  idade = int(input("Idade: "))
  print(f"Ano que vem você terá {idade + 1} anos.")
explicacao: "O erro original é um TypeError: o + tentou juntar texto com número. Convertendo a entrada com int() a conta funciona, e a f-string cuida de transformar o resultado em texto."
dificuldade: 1
```

```quiz
id: FP-01-q12
tipo: codigo
linguagem: python
pergunta: |
  **Tipos antes e depois da conversão.** Leia um número com `input()` e imprima, em três linhas: o tipo do valor lido, o tipo depois de converter com `int()` e o dobro do número. Para a entrada `21`:

  ```
  <class 'str'>
  <class 'int'>
  42
  ```
codigo_inicial: |
  texto = input("Digite um número inteiro: ")
usa: [type, int]
testes:
  - entrada: "21"
    saida: |
      <class 'str'>
      <class 'int'>
      42
  - entrada: "-5"
    visivel: false
    saida: |
      <class 'str'>
      <class 'int'>
      -10
dica: "type(texto) mostra o tipo do que veio do input(). Guarde int(texto) em outra variável e mostre o type() dela."
solucao: |
  texto = input("Digite um número inteiro: ")
  numero = int(texto)
  print(type(texto))
  print(type(numero))
  print(numero * 2)
explicacao: "O mesmo dado (\"21\") começa como str e vira int com a conversão. Só depois disso a multiplicação faz conta; com o texto, \"21\" * 2 daria \"2121\"."
dificuldade: 1
```

```quiz
id: FP-01-q13
tipo: codigo
linguagem: python
pergunta: |
  **IMC com float.** Leia o peso (kg) e depois a altura (m), nessa ordem, e imprima o IMC (peso dividido pela altura ao quadrado) com **uma casa decimal**. Para as entradas `70` e `1.75`:

  ```
  IMC: 22.9
  ```
usa: [float]
testes:
  - entradas: ["70", "1.75"]
    saida: "IMC: 22.9"
  - entradas: ["54.5", "1.62"]
    saida: "IMC: 20.8"
  - entradas: ["90", "1.8"]
    visivel: false
    saida: "IMC: 27.8"
dica: "Peso e altura podem ter casas decimais: converta com float(...). Altura ao quadrado é altura ** 2. Para uma casa decimal use {imc:.1f} na f-string."
solucao: |
  peso = float(input("Peso (kg): "))
  altura = float(input("Altura (m): "))
  imc = peso / altura ** 2
  print(f"IMC: {imc:.1f}")
explicacao: "float() aceita números com ponto decimal. A potência (**) é calculada antes da divisão, então peso / altura ** 2 já está certo; :.1f arredonda a exibição para uma casa."
dificuldade: 2
```

```quiz
id: FP-01-q14
tipo: codigo
linguagem: python
pergunta: |
  **Maior ou menor de idade (indentação).** Leia a idade e imprima `Maior de idade` se for 18 ou mais, ou `Menor de idade` caso contrário. Na última linha, **fora do if**, imprima o resultado da comparação `idade >= 18` (um `bool`). Para a entrada `20`:

  ```
  Maior de idade
  True
  ```

  A correção confere a indentação: 4 espaços dentro do `if` e do `else`.
usa: [int, if]
testes:
  - entrada: "20"
    saida: |
      Maior de idade
      True
  - entrada: "15"
    saida: |
      Menor de idade
      False
  - entrada: "18"
    visivel: false
    saida: |
      Maior de idade
      True
dica: "A linha do if termina com ':' e o print de dentro vem com 4 espaços. O else fica alinhado com o if. O último print não tem recuo, para rodar sempre."
solucao: |
  idade = int(input("Idade: "))
  if idade >= 18:
      print("Maior de idade")
  else:
      print("Menor de idade")
  print(idade >= 18)
explicacao: "A comparação idade >= 18 produz um bool (True ou False). O if usa esse bool para escolher o bloco; a indentação diz ao Python quais linhas pertencem a cada bloco. Com 18 o resultado é True, porque >= inclui o próprio 18."
dificuldade: 2
```

```quiz
id: FP-01-q6
tipo: codigo
linguagem: python
pergunta: "**Desafio final.** Escreva um programa que pergunta o nome e depois o ano de nascimento da pessoa e imprime: `Olá, NOME! Em 2026 você faz IDADE anos.`"
usa: [input, int]
testes:
  - entradas: ["Israel", "2000"]
    saida: "Olá, Israel! Em 2026 você faz 26 anos."
  - entradas: ["Ana", "2010"]
    saida: "Olá, Ana! Em 2026 você faz 16 anos."
  - entradas: ["Rui", "1965"]
    visivel: false
    saida: "Olá, Rui! Em 2026 você faz 61 anos."
dica: "input() sempre devolve texto. Para fazer conta com o ano, converta com int(...)."
solucao: |
  nome = input("Nome: ")
  ano = int(input("Ano de nascimento: "))
  print(f"Olá, {nome}! Em 2026 você faz {2026 - ano} anos.")
explicacao: "int() converte o texto digitado em número para permitir a subtração. A f-string (f\"...\") insere os valores das variáveis dentro do texto. O nome continua str, porque não fazemos conta com ele."
dificuldade: 1
```

## Resumo

- A CPU só entende **código de máquina**; linguagens de alto nível precisam de tradução.
- **Compilador** traduz tudo antes; **interpretador** traduz e executa aos poucos.
- Erros podem ser de **sintaxe**, de **execução** ou de **lógica**.
- Leia mensagens de erro pela **última linha** e depois procure o **número da linha**.
- Os tipos básicos são **int**, **float**, **str** e **bool**; `type()` mostra o tipo de um valor.
- `input()` **sempre devolve str**: converta com `int()` ou `float()` antes de fazer contas.
- Em Python, **a indentação define os blocos**: 4 espaços depois de uma linha que termina em `:`.

## Para ir além

- Instale o Python (python.org) e um editor (VS Code) e rode os exemplos desta aula.
- **Próximo módulo**: FP-02 Variáveis, tipos e operadores (aprofunda tudo o que você viu aqui sobre tipos).
