---
codigo: ES-03
titulo: "Código limpo: nomes, funções, comentários"
trilha: Engenharia de software
nivel: basico
prerequisitos: [FP-06]
duracao_min: 180
objetivos:
  - "Escolher nomes que revelam a intenção e seguem as convenções da linguagem"
  - "Escrever funções pequenas, com uma responsabilidade e poucos parâmetros"
  - "Usar retornos antecipados (guard clauses) para reduzir aninhamento"
  - "Distinguir comentários úteis (o porquê) de comentários que escondem código ruim"
  - "Trocar números mágicos por constantes com nome"
aprofundar:
  - nome: "PEP 8: Style Guide for Python Code"
    url: "https://peps.python.org/pep-0008/"
    trecho: "Seções Naming Conventions e Comments"
  - nome: "Google Python Style Guide"
    url: "https://google.github.io/styleguide/pyguide.html"
    trecho: "Seção 3.8 Comments and Docstrings e 3.16 Naming"
  - nome: "Refactoring.Guru: Code Smells"
    url: "https://refactoring.guru/refactoring/smells"
    trecho: "Long Method, Long Parameter List, Comments, Magic Number"
  - nome: "OSSU Computer Science"
    url: "https://github.com/ossu/computer-science"
    trecho: "Core programming: How to Code e Software Construction, onde o desenho de funções é praticado"
tags: [engenharia-de-software, codigo-limpo, nomes, funcoes, comentarios, legibilidade]
---

# Código limpo: nomes, funções, comentários

## Por que isso importa

Código é lido muito mais vezes do que é escrito: por você daqui a três meses, pelo colega no code review, pela pessoa que vai corrigir um bug às 2 da manhã. Um código que funciona mas ninguém entende é caro: cada mudança demora, e cada mudança tem mais chance de quebrar algo. Em entrevistas práticas e em testes técnicos para levar para casa, a **legibilidade** pesa tanto quanto a solução estar certa. As técnicas desta aula são pequenas e você pode aplicá-las a partir de hoje, em qualquer linguagem.

## Intuição

Pense no código como um **texto para pessoas** que, por acaso, também roda numa máquina.

- **Nomes** são as palavras. `d` não diz nada; `dias_desde_o_ultimo_login` conta uma história.
- **Funções** são os parágrafos. Um parágrafo que fala de cinco assuntos cansa; uma função que faz cinco coisas também.
- **Comentários** são as notas de rodapé. Úteis quando explicam **por que** algo é assim; um mau sinal quando precisam explicar **o que** o código faz, porque aí o código deveria se explicar sozinho.

O teste prático: alguém do time consegue entender a função lendo só ela, sem rolar a tela e sem perguntar a você?

## Visual

Antes e depois da mesma regra:

```text
ANTES                                     DEPOIS
def calc(l, c):                           FRETE_PADRAO = 20
    t = 0                                 VALOR_FRETE_GRATIS = 100
    for i in l:                           DESCONTO_CUPOM_DEZ = 0.10
        t += i[0] * i[1]
    if c == 'DEZ':                        def subtotal(itens):
        t2 = t - t * 0.1                      return sum(preco * qtd for preco, qtd in itens)
    else:
        t2 = t                            def desconto(valor, cupom):
    # frete                                   return valor * DESCONTO_CUPOM_DEZ if cupom == 'DEZ' else 0
    if c != 'FRETE':
        if t < 100:                       def frete(valor, cupom):
            t2 = t2 + 20                      if cupom == 'FRETE' or valor >= VALOR_FRETE_GRATIS:
    return t2                                     return 0
                                              return FRETE_PADRAO

                                          def total(itens, cupom):
                                              valor = subtotal(itens)
                                              return valor - desconto(valor, cupom) + frete(valor, cupom)
```

A versão da direita é mais longa, mas cada pedaço é óbvio, e cada regra pode ser testada sozinha.

## Conceito técnico

### Nomes

1. **Revele a intenção**: `tempo_decorrido_em_dias`, não `d`. Se o nome precisa de comentário, troque o nome.
2. **Evite desinformação**: não chame de `lista_clientes` algo que é um dicionário; não use `l` e `O` (parecem 1 e 0).
3. **Faça distinções com significado**: `dados` e `info`, `produto` e `produto_obj` não dizem qual é qual.
4. **Use nomes pronunciáveis e buscáveis**: `gerar_data_hora` em vez de `gdthr`; `DIAS_POR_SEMANA` em vez de `7` solto (dá para buscar no projeto).
5. **Classes são substantivos** (`Pedido`, `CalculadoraDeFrete`); **funções são verbos** (`calcular_frete`, `enviar_email`); **booleanos são perguntas** (`esta_ativo`, `tem_estoque`, `pode_editar`).
6. **Um termo por conceito**: não misture `buscar_`, `obter_` e `pegar_` para a mesma ideia.
7. **Tamanho proporcional ao escopo**: `i` está ótimo num laço de três linhas; uma variável global precisa de um nome completo.
8. **Siga a convenção da linguagem**: em Python, `snake_case` para funções e variáveis, `PascalCase` para classes, `MAIUSCULAS` para constantes. Em JavaScript e Java, `camelCase` para funções e variáveis.

### Funções

- **Pequenas** e com **uma responsabilidade**: se você descreve a função usando "e" ("valida **e** salva **e** envia e-mail"), são três funções.
- **Um nível de abstração por função**: a função `processar_pedido` chama `validar`, `cobrar` e `enviar_confirmacao`; ela não monta string de SQL no meio disso.
- **Poucos parâmetros**: zero a dois é ótimo, três já pede atenção. Muitos parâmetros relacionados viram um objeto (`Endereco` em vez de `rua, numero, cidade, cep`).
- **Sem parâmetros booleanos de modo**: `renderizar(pagina, True)` esconde o significado. Prefira duas funções ou um argumento nomeado (`renderizar(pagina, modo_impressao=True)`).
- **Sem efeitos colaterais escondidos**: uma função `verificar_senha` não deve iniciar uma sessão.
- **Separe comando de consulta**: uma função ou **muda** algo, ou **responde** algo.
- **Retornos antecipados (guard clauses)** tiram o aninhamento:

```text
# aninhado                               # com guard clauses
def pode_sacar(conta, valor):            def pode_sacar(conta, valor):
    if conta.ativa:                          if not conta.ativa:
        if valor > 0:                            return False
            if valor <= conta.saldo:         if valor <= 0:
                return True                      return False
    return False                             return valor <= conta.saldo
```

### Comentários

Bons comentários explicam o que o código **não consegue** dizer:

- **O porquê** de uma decisão: `# usamos busca linear: a lista nunca passa de 10 itens e é mais rápido que montar um índice`.
- **Avisos**: `# não paralelizar: a API do banco limita a 1 requisição por segundo`.
- **Referências**: link para a norma, o ticket ou o artigo do algoritmo.
- **Docstrings** de funções públicas: o que recebe, o que devolve, que erros lança.

Maus comentários:

- **Redundantes**: `i += 1  # incrementa i`.
- **Desatualizados**: o código mudou e o comentário mente. Comentários não são testados.
- **Código comentado**: apague; o Git lembra.
- **Compensando um nome ruim**: `d = 7  # dias de teste grátis` deveria ser `DIAS_DE_TESTE_GRATIS = 7`.

### Formatação e números mágicos

- Use o **formatador** da linguagem (`black` ou `ruff format` em Python, Prettier em JS) e pare de discutir espaços no code review.
- Um **número mágico** é um literal sem explicação (`if idade >= 18`, `preco * 0.9`). Dê um nome: `IDADE_MINIMA = 18`.
- Código que muda junto fica junto; declare variáveis perto de onde são usadas.

## Código

Um verificador de nomes que aponta problemas comuns, aplicado ao código "antes" do Visual:

```python
import ast

CODIGO = '''
def calc(l, c):
    t = 0
    for i in l:
        t += i[0] * i[1]
    if c == "DEZ":
        t2 = t - t * 0.1
    else:
        t2 = t
    if c != "FRETE":
        if t < 100:
            t2 = t2 + 20
    return t2
'''

arvore = ast.parse(CODIGO)
avisadas = set()
for no in ast.walk(arvore):
    if isinstance(no, ast.FunctionDef):
        if len(no.name) <= 4:
            print(f"função '{no.name}': nome curto demais para dizer o que faz")
        for arg in no.args.args:
            if len(arg.arg) == 1:
                print(f"parâmetro '{arg.arg}' de {no.name}: nome de uma letra")
    elif isinstance(no, ast.Name) and isinstance(no.ctx, ast.Store) and no.id[-1].isdigit():
        if no.id in avisadas:
            continue
        avisadas.add(no.id)
        print(f"variável '{no.id}': número no nome costuma esconder um conceito sem nome")
    elif isinstance(no, ast.Constant) and isinstance(no.value, (int, float)) and no.value not in (0, 1):
        print(f"linha {no.lineno}: número mágico {no.value}")
```

Ferramentas de verdade, como `ruff` e `pylint`, fazem centenas de verificações desse tipo e rodam no editor e no CI.

## Erros comuns

- **Abreviar demais** (`usrCnt`, `calcTtlPrc`) para economizar letras que o autocompletar digitaria.
- **Nomes genéricos**: `dados`, `info`, `manager`, `processar`, `helper`, `utils`.
- **Funções de 200 linhas** com comentários separando as "seções": cada seção quer ser uma função.
- **Aninhamento profundo** (`if` dentro de `for` dentro de `if` dentro de `try`).
- **Comentar o óbvio e não comentar o surpreendente.**
- **Deixar código morto ou comentado** "para o caso de precisar".
- **Limpar demais**: quebrar uma função de 6 linhas claras em 6 funções de uma linha também atrapalha a leitura.

## Pratique

```quiz
id: ES-03-q1
tipo: multipla_escolha
pergunta: "Qual é o melhor nome para uma variável booleana que indica se o usuário já confirmou o e-mail?"
opcoes: ["flag", "email", "email_confirmado", "verificar_email"]
resposta: 2
explicacao: "Booleanos leem bem como afirmações ou perguntas: if email_confirmado. 'flag' não diz nada, 'email' sugere o endereço, e 'verificar_email' parece uma função que executa uma ação."
dificuldade: 1
```

```quiz
id: ES-03-q2
tipo: multipla_escolha
pergunta: "Qual destes comentários vale a pena manter?"
opcoes: ["# soma 1 ao contador", "# retorna o total", "# o arredondamento é para baixo por exigência da Receita (IN 1234/2020, art. 5)", "# código antigo, não apagar"]
resposta: 2
explicacao: "Ele explica um porquê que o código não tem como mostrar e aponta a fonte. Os dois primeiros repetem o código; o último protege código morto, que o Git já guarda."
dificuldade: 1
```

```quiz
id: ES-03-q3
tipo: verdadeiro_falso
pergunta: "Uma função chamada salvar_usuario que também envia um e-mail de boas-vindas está bem nomeada, desde que tenha um comentário explicando o envio."
resposta: false
explicacao: "É um efeito colateral escondido: quem chama salvar_usuario numa importação em massa vai disparar milhares de e-mails sem perceber. O certo é separar as responsabilidades (salvar e enviar) ou dar um nome honesto, como cadastrar_usuario, para o fluxo completo."
dificuldade: 2
```

```quiz
id: ES-03-q4
tipo: resposta_curta
pergunta: "Por que uma chamada como criar_relatorio(dados, True, False, 3) é difícil de ler, e como melhorar?"
resposta: "Os booleanos e o número não dizem o que significam: quem lê precisa abrir a função. Melhora usando argumentos nomeados (incluir_graficos=True, paisagem=False, casas_decimais=3), constantes com nome, ou dividindo em funções diferentes para cada modo."
palavras_chave: ["significam", "nomeados", "booleanos", "constantes"]
dificuldade: 2
```

```quiz
id: ES-03-q5
tipo: codigo
linguagem: python
pergunta: |
  **Convenção de nomes.** Escreva `snake_case(nome)` que converte nomes em `camelCase`, `PascalCase` ou `kebab-case` para `snake_case`:

  - hífens e espaços viram `_`;
  - uma letra maiúscula ganha um `_` antes quando a anterior é **minúscula ou dígito**, ou quando a anterior é **maiúscula e a próxima é minúscula** (fim de uma sigla, como em `HTTPResposta`);
  - tudo fica em minúsculas. A primeira letra nunca ganha `_`.
codigo_inicial: |
  def snake_case(nome):
      return nome.lower()
usa: [def, for, if, return]
testes:
  - chamada: "snake_case('nomeDoCliente')"
    saida: "'nome_do_cliente'"
  - chamada: "snake_case('CalcularTotal')"
    saida: "'calcular_total'"
  - chamada: "snake_case('total-com-frete')"
    saida: "'total_com_frete'"
  - chamada: "snake_case('ja_esta_ok')"
    saida: "'ja_esta_ok'"
  - chamada: "snake_case('HTTPResposta')"
    visivel: false
    saida: "'http_resposta'"
  - chamada: "snake_case('lerArquivoCSV')"
    visivel: false
    saida: "'ler_arquivo_csv'"
  - chamada: "snake_case('versao2Final')"
    visivel: false
    saida: "'versao2_final'"
  - chamada: "snake_case('x')"
    visivel: false
    saida: "'x'"
dica: "Percorra com enumerate. Para cada letra maiúscula com i > 0, olhe nome[i - 1] e, se existir, nome[i + 1]. Decida se põe '_' e depois acrescente c.lower()."
solucao: |
  def snake_case(nome):
      nome = nome.replace('-', '_').replace(' ', '_')
      saida = ''
      for i, c in enumerate(nome):
          if c.isupper() and i > 0:
              anterior = nome[i - 1]
              proxima = nome[i + 1] if i + 1 < len(nome) else ''
              fim_de_sigla = anterior.isupper() and proxima.islower()
              if anterior.islower() or anterior.isdigit() or fim_de_sigla:
                  saida += '_'
          saida += c.lower()
      return saida
explicacao: "A regra de sigla é o que separa HTTPResposta em http_resposta, e não em h_t_t_p_resposta: dentro da sigla as maiúsculas seguem juntas, e o corte vem antes da maiúscula que começa a próxima palavra. Repare que a variável fim_de_sigla dá nome a uma condição complicada: é a técnica de 'explicar com uma variável', que substitui um comentário."
dificuldade: 2
```

```quiz
id: ES-03-q6
tipo: codigo
linguagem: python
pergunta: |
  **Extraia funções.** A função `calc` funciona, mas é ilegível. Reescreva a regra em quatro funções com nomes claros e constantes no lugar dos números mágicos. `itens` é uma lista de `(preco, quantidade)` e `cupom` é `None`, `'DEZ'` ou `'FRETE'`.

  - `subtotal(itens)`: soma de preço × quantidade;
  - `desconto(valor, cupom)`: 10% do valor com o cupom `'DEZ'`, senão `0`;
  - `frete(valor, cupom)`: `0` com o cupom `'FRETE'` ou se o valor for **100 ou mais**; senão `20`;
  - `total(itens, cupom)`: subtotal − desconto + frete (os dois calculados sobre o subtotal).

  Os testes chamam as quatro funções.
codigo_inicial: |
  def calc(l, c):
      t = 0
      for i in l:
          t += i[0] * i[1]
      if c == 'DEZ':
          t2 = t - t * 0.1
      else:
          t2 = t
      if c != 'FRETE':
          if t < 100:
              t2 = t2 + 20
      return t2
usa: [def, return]
testes:
  - chamada: "subtotal([(10, 2), (5, 1)])"
    saida: "25"
  - chamada: "desconto(200, 'DEZ')"
    saida: "20.0"
  - chamada: "frete(50, None)"
    saida: "20"
  - chamada: "total([(10, 2), (5, 1)], None)"
    saida: "45"
  - chamada: "total([(60, 2)], 'DEZ')"
    visivel: false
    saida: "108.0"
  - chamada: "total([(30, 1)], 'FRETE')"
    visivel: false
    saida: "30"
  - chamada: "frete(100, None)"
    visivel: false
    saida: "0"
  - chamada: "desconto(200, None)"
    visivel: false
    saida: "0"
dica: "Defina FRETE_PADRAO = 20, VALOR_FRETE_GRATIS = 100 e DESCONTO_CUPOM_DEZ = 0.10 no topo. A função total só chama as outras três; ela não deve repetir nenhuma regra."
solucao: |
  FRETE_PADRAO = 20
  VALOR_FRETE_GRATIS = 100
  DESCONTO_CUPOM_DEZ = 0.10

  def subtotal(itens):
      return sum(preco * quantidade for preco, quantidade in itens)

  def desconto(valor, cupom):
      if cupom == 'DEZ':
          return valor * DESCONTO_CUPOM_DEZ
      return 0

  def frete(valor, cupom):
      if cupom == 'FRETE' or valor >= VALOR_FRETE_GRATIS:
          return 0
      return FRETE_PADRAO

  def total(itens, cupom):
      valor = subtotal(itens)
      return valor - desconto(valor, cupom) + frete(valor, cupom)
explicacao: "Agora dá para testar cada regra sozinha, e uma mudança como 'frete grátis a partir de 150' é uma linha numa constante com nome. A extração também revelou uma regra que estava escondida: o frete é decidido pelo subtotal antes do desconto. Isso é proposital ou um bug? Com o código original, ninguém nem perceberia a pergunta."
dificuldade: 1
```

```quiz
id: ES-03-q7
tipo: codigo
linguagem: javascript
pergunta: |
  **Detector de funções longas.** Escreva `funcoesLongas(codigo, limite)` que recebe o texto de um arquivo JavaScript e devolve os nomes das funções com **mais** de `limite` linhas, na ordem em que aparecem.

  Simplificação: uma função começa numa linha que começa exatamente com `function nome(` (sem espaços antes) e termina na primeira linha seguinte que é exatamente `}`. O tamanho conta as duas linhas, de abertura e fechamento.
codigo_inicial: |
  function funcoesLongas(codigo, limite) {
    return [];
  }
usa: [function, for, return]
testes:
  - chamada: "funcoesLongas('function a() {\\n  return 1;\\n}', 2)"
    saida: "[ 'a' ]"
  - chamada: "funcoesLongas('function a() {\\n  return 1;\\n}', 3)"
    saida: "[]"
  - chamada: "funcoesLongas('function curta() {\\n}\\n\\nfunction longa(x) {\\n  let y = x;\\n  y += 1;\\n  return y;\\n}', 4)"
    saida: "[ 'longa' ]"
  - chamada: "funcoesLongas('', 1)"
    visivel: false
    saida: "[]"
  - chamada: "funcoesLongas('function um() {\\n  if (x) {\\n    y();\\n  }\\n}\\nfunction dois() {\\n  a();\\n  b();\\n}', 3)"
    visivel: false
    saida: "[ 'um', 'dois' ]"
dica: "Divida com codigo.split('\\n'). Guarde o nome e o índice de início quando encontrar uma abertura (com startsWith('function ') e o trecho até o primeiro '('). Ao achar uma linha igual a '}', calcule fim - inicio + 1."
solucao: |
  function funcoesLongas(codigo, limite) {
    const linhas = codigo.split('\n');
    const longas = [];
    let nome = null;
    let inicio = 0;
    for (let i = 0; i < linhas.length; i++) {
      const abre = linhas[i].startsWith('function ') && linhas[i].includes('(');
      if (abre && nome === null) {
        nome = linhas[i].slice('function '.length, linhas[i].indexOf('('));
        inicio = i;
      } else if (linhas[i] === '}' && nome !== null) {
        if (i - inicio + 1 > limite) longas.push(nome);
        nome = null;
      }
    }
    return longas;
  }
explicacao: "No teste oculto, o '}' indentado do if não fecha a função, porque a regra exige a linha exatamente igual a '}'. Ferramentas reais (ESLint com max-lines-per-function, ruff com as regras de complexidade) usam a árvore sintática em vez de texto, como o exemplo com ast da seção Código, e por isso não dependem de formatação."
dificuldade: 2
```

## Resumo

- **Nomes** revelam intenção: classes substantivos, funções verbos, booleanos perguntas; siga a convenção da linguagem.
- **Funções** pequenas, uma responsabilidade, um nível de abstração, poucos parâmetros, sem efeitos escondidos.
- **Guard clauses** reduzem aninhamento.
- **Comentários** explicam o porquê, avisam e referenciam; não repetem o código nem guardam código morto.
- **Números mágicos** viram constantes com nome; use o **formatador** e o **linter** da linguagem.

## Para ir além

- Rode `ruff check` num projeto seu e corrija os avisos um por um.
- Pegue uma função sua com mais de 30 linhas e quebre-a em funções menores com bons nomes.
- **Próximo módulo**: ES-04 Princípios SOLID, DRY, KISS, YAGNI.
