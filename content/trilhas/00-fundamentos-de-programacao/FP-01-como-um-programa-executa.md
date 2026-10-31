---
codigo: FP-01
titulo: Como um programa executa
trilha: Fundamentos de programação
nivel: basico
prerequisitos: []
duracao_min: 40
objetivos:
  - "Explicar o que é um programa e o que o computador realmente entende"
  - "Diferenciar compilador e interpretador"
  - "Escrever e executar seu primeiro programa em Python"
  - "Ler uma mensagem de erro simples e localizar a linha do problema"
aprofundar:
  - nome: "MIT 6.0001 Introduction to CS and Programming using Python (via OSSU)"
    url: "https://github.com/ossu/computer-science/blob/master/coursepages/intro-cs/README.md"
    trecho: "Aula 1: o que é computação"
tags: [fundamentos, compilador, interpretador, python]
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

Seu primeiro programa (salve como `ola.py` e rode com `python ola.py` no terminal):

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

## Erros comuns

- **Achar que o computador "entende" Python.** Ele só entende código de máquina; sempre há um tradutor no meio.
- **Ler a mensagem de erro de cima para baixo e desistir.** Comece pela última linha e depois procure o número da linha.
- **Confundir o terminal do sistema com o modo interativo do Python** (`>>>`). Comandos como `python ola.py` são digitados no terminal, não depois de `>>>`.
- **Esquecer de salvar o arquivo antes de rodar.**

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
id: FP-01-q6
tipo: codigo
pergunta: "Escreva um programa que pergunta o nome e o ano de nascimento da pessoa e imprime: 'Olá, NOME! Em 2026 você faz IDADE anos.'"
assinatura: "programa completo (use input e print)"
testes:
  - entrada: "Israel, 2000"
    saida: "Olá, Israel! Em 2026 você faz 26 anos."
dica: "input() sempre devolve texto. Para fazer conta com o ano, converta com int(...)."
resposta: |
  nome = input("Nome: ")
  ano = int(input("Ano de nascimento: "))
  print(f"Olá, {nome}! Em 2026 você faz {2026 - ano} anos.")
explicacao: "int() converte o texto digitado em número para permitir a subtração. A f-string (f\"...\") insere os valores das variáveis dentro do texto."
dificuldade: 1
```

## Resumo

- A CPU só entende **código de máquina**; linguagens de alto nível precisam de tradução.
- **Compilador** traduz tudo antes; **interpretador** traduz e executa aos poucos.
- Erros podem ser de **sintaxe**, de **execução** ou de **lógica**.
- Leia mensagens de erro pela **última linha** e depois procure o **número da linha**.

## Para ir além

- Instale o Python (python.org) e um editor (VS Code) e rode os exemplos desta aula.
- **Próximo módulo**: FP-02 Variáveis, tipos e operadores.
