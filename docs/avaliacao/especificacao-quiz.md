# Sistema de perguntas e respostas: especificação

Este documento define como a sala de aula avalia e treina o conhecimento: tipos de questão, formato dos dados, feedback, repetição espaçada e o fluxo de uma sessão de treino. Os arquivos que acompanham esta especificação são:

- `questao.schema.json`: JSON Schema de uma questão (valida o banco).
- `banco-inicial.json`: 24 questões de exemplo em 6 trilhas.
- `revisao.js`: implementação de referência da repetição espaçada e da correção automática.

## 1. Princípios

1. **Recuperação ativa antes de reler.** O aluno tenta responder primeiro; a explicação vem depois.
2. **Todo erro ensina.** Cada alternativa errada tem um feedback próprio explicando o equívoco típico que leva a ela.
3. **Pouco e frequente.** Sessões curtas (10 a 15 questões, cerca de 15 minutos) com revisões agendadas pelo algoritmo.
4. **Mistura de níveis (Bloom).** Cada trilha tem questões de lembrar, entender, aplicar e analisar, para não treinar só decoreba.
5. **Visual quando ajuda.** Questões podem trazer diagrama (Mermaid), trecho de código ou imagem no enunciado e na explicação.

## 2. Tipos de questão

| Tipo (`tipo`) | O que testa | Correção | Exemplo |
|---|---|---|---|
| `multipla_escolha` | Conceito, reconhecimento, comparação | Automática | "Qual a complexidade da busca binária?" |
| `multipla_resposta` | Conjunto de propriedades verdadeiras | Automática, com crédito parcial | "Quais destas estruturas são lineares?" |
| `verdadeiro_falso` | Concepções erradas comuns | Automática | "Um hash table garante O(1) no pior caso." |
| `preencher_lacuna` | Termo exato, sintaxe | Automática (lista de aceitas, normalizada) | "O comando git que cria um branch e já troca para ele é `git ____ -b`." |
| `ordenar` | Sequência de passos, algoritmo | Automática, crédito parcial por itens na posição certa | Ordenar fases do TCP handshake |
| `prever_saida` | Leitura e rastreio de código | Automática (comparação de texto normalizado) | "O que este código imprime?" |
| `codigo` | Escrever código que funciona | Automática por testes (roda no navegador) | "Implemente `inverter(lista)`" |
| `resposta_aberta` | Explicar com as próprias palavras, design | Autoavaliação guiada por rubrica (opcionalmente correção por IA) | "Explique a diferença entre processo e thread." |
| `flashcard` | Memorização de definições | Autoavaliação (Errei / Difícil / Bom / Fácil) | Frente: "Idempotência"; verso: definição |

### Notas por tipo

- **`codigo`**: roda no navegador, num Web Worker por linguagem, com tempo limite de 5 s: Python (Pyodide), JavaScript, TypeScript (tipos removidos com Sucrase), C/C++ (JSCPP), SQL (SQLite via sql.js) e HTML/CSS (iframe). Tudo é carregado sob demanda. Os testes ficam na própria questão (`testes`), cada um com as entradas (uma linha por `input()`/`prompt()`/`scanf`), a saída esperada e se é visível ao aluno; testes ocultos evitam "programar para o teste". A resposta só é aceita quando **todos** os testes passam, a **indentação** segue o padrão da linguagem (4 espaços em Python e C, 2 em JS/TS, sem TAB) e o código usa o que `usa` exige. Erros aparecem marcados na linha do editor e explicados em português. Implementação: `src/lib/execucao/` e `src/components/IdeCodigo.tsx`.
- **`resposta_aberta`**: depois de responder, o aluno vê a **resposta modelo** e a **rubrica** (critérios com peso) e marca quais critérios cumpriu. A nota é a soma dos pesos marcados. Se no futuro houver integração com a API do Claude, a mesma rubrica serve de instrução para a correção automática; a autoavaliação continua como alternativa offline.
- **`prever_saida`**: normalizar espaços nas pontas e quebras de linha finais antes de comparar.
- **`preencher_lacuna`**: normalizar caixa, acentos e espaços; aceitar qualquer item de `aceitas`.

## 3. Formato de uma questão

Campos comuns a todos os tipos (o schema completo está em `questao.schema.json`):

```json
{
  "id": "eds-001",
  "versao": 1,
  "trilha": "estruturas-de-dados",
  "topico": "pilha",
  "tags": ["lifo", "fundamentos"],
  "tipo": "multipla_escolha",
  "dificuldade": 2,
  "bloom": "entender",
  "enunciado": "Texto em **Markdown**. Pode conter `código` e blocos ```mermaid```.",
  "midia": { "codigo": { "linguagem": "python", "fonte": "..." } },
  "dica": "Opcional, mostrada sob demanda (reduz a nota em 25%).",
  "explicacao": "Explicação completa, mostrada sempre após responder.",
  "referencias": [{ "titulo": "Aula: Pilhas e filas", "url": "/aulas/pilhas-e-filas" }],
  "tempo_estimado_s": 60
}
```

Campos específicos:

- `multipla_escolha` e `multipla_resposta`: `alternativas: [{ id, texto, correta, feedback }]`. O `feedback` de cada alternativa explica por que ela está certa ou errada.
- `verdadeiro_falso`: `resposta: true|false`, `feedback_verdadeiro`, `feedback_falso`.
- `preencher_lacuna`: `aceitas: [string]`.
- `ordenar`: `itens: [{ id, texto }]` na ordem correta (a interface embaralha).
- `prever_saida`: `midia.codigo` obrigatório e `saida_esperada: string`.
- `codigo`: `linguagem`, `codigo_inicial`, `usa`, `indentacao`, `preparo` (SQL), `testes: [{ entrada | entradas, esperado | saida, chamada, verifica, descricao, visivel }]`, `solucao`.
- `resposta_aberta`: `resposta_modelo`, `rubrica: [{ criterio, peso }]` (pesos somam 1).
- `flashcard`: `frente`, `verso`.

Convenções:

- **`id`** estável, no formato `<sigla-da-trilha>-<número>`. Nunca reutilizar um `id`; ao mudar o conteúdo de forma relevante, incrementar `versao` (o progresso do aluno fica ligado a `id`).
- **`dificuldade`** de 1 (introdutório) a 5 (nível entrevista difícil).
- **`bloom`**: `lembrar`, `entender`, `aplicar`, `analisar`, `avaliar` ou `criar`.
- **`trilha`** usa o mesmo identificador das trilhas do currículo, e `referencias` aponta para a aula onde o tema é ensinado.

## 4. Feedback explicativo

Depois de cada resposta, a tela mostra, nesta ordem:

1. **Resultado**: certo, parcialmente certo (com a porcentagem) ou errado.
2. **Feedback específico** da alternativa escolhida (ou dos testes que falharam, com entrada, esperado e obtido).
3. **Explicação completa** (`explicacao`), com código ou diagrama quando houver.
4. **Para aprofundar**: links de `referencias` para a aula correspondente.
5. **Botões de autoavaliação de confiança** apenas nos tipos de autoavaliação; nos automáticos a confiança vem do resultado e do tempo.

Regras de escrita para quem cria questões:

- A explicação diz **por que** a resposta certa é certa, não só qual é.
- Cada distrator nasce de um erro real e comum (ex.: confundir O(log n) com O(n log n)); o feedback nomeia esse erro.
- Evitar "todas as anteriores" e "nenhuma das anteriores".
- Enunciado curto; o contexto vai em `midia`.

## 5. Repetição espaçada

Algoritmo: variação do **SM-2** (o mesmo princípio do Anki), escolhida por ser simples, previsível e fácil de rodar só no navegador. Pode ser trocado pelo FSRS depois sem mudar o formato das questões, porque o estado de revisão fica separado.

### Estado por questão (guardado no `localStorage`/IndexedDB do aluno)

```json
{
  "questao_id": "eds-001",
  "facilidade": 2.5,
  "intervalo_dias": 0,
  "repeticoes": 0,
  "proxima_revisao": "2026-10-31",
  "historico": [{ "data": "2026-10-31T16:50:00Z", "nota": 4, "tempo_s": 35 }]
}
```

### Nota (0 a 5) a partir da resposta

| Situação | Nota |
|---|---|
| Errou (ou acerto abaixo de 50%) | 1 |
| Acerto parcial (50% a 99%) ou acertou usando dica | 3 |
| Acertou, mas demorou mais que 2x o `tempo_estimado_s` | 4 |
| Acertou dentro do tempo | 5 |
| Autoavaliação: Errei / Difícil / Bom / Fácil | 1 / 3 / 4 / 5 |

### Atualização após responder

- Nota < 3: `repeticoes = 0`, `intervalo = 1` dia (a questão também volta no fim da sessão atual).
- Nota >= 3: `repeticoes += 1`; intervalo = 1 dia na 1ª, 6 dias na 2ª, depois `intervalo anterior × facilidade`, arredondado.
- `facilidade = max(1.3, facilidade + 0.1 − (5 − nota) × (0.08 + (5 − nota) × 0.02))`.
- `proxima_revisao = hoje + intervalo`.

A implementação está em `revisao.js`.

## 6. Modos de sessão

| Modo | Como escolhe as questões |
|---|---|
| **Revisão do dia** (padrão) | Todas as vencidas (`proxima_revisao <= hoje`), mais atrasadas primeiro; completa com até 5 novas da trilha atual. Limite de 20. |
| **Praticar trilha** | Questões de uma trilha/tópico, novas e vencidas, dificuldade crescente. |
| **Pós-aula** | 5 questões ligadas à aula recém-concluída, para fixar logo após estudar. |
| **Simulado** | N questões misturadas, com cronômetro e feedback só no final (treina prova e entrevista). |
| **Pontos fracos** | Questões com facilidade < 2.0 ou com erro nas últimas 3 tentativas. |

Interleaving: na revisão do dia, evitar duas questões seguidas do mesmo tópico.

## 7. Progresso e domínio

- **Domínio de um tópico** = média ponderada (pela dificuldade) da última nota de cada questão do tópico, em 0 a 100%. Questões nunca vistas contam como 0.
- Níveis visuais: Iniciante (< 40%), Em progresso (40 a 69%), Proficiente (70 a 89%), Domínio (>= 90% e todas as questões com ao menos 2 repetições).
- Painel com: sequência de dias estudados, revisões pendentes hoje, mapa de calor de atividade e radar de domínio por trilha.

## 8. Como o banco cresce

- Um arquivo JSON por trilha (`questoes/<trilha>.json`), validado contra o schema num teste automatizado.
- Meta por aula: no mínimo 5 questões, cobrindo ao menos 3 níveis de Bloom e 2 tipos diferentes.
- Quem escreve a aula escreve as questões junto, usando `referencias` para ligar uma à outra.
