# Modelo de aula

Toda aula segue esta estrutura para que o app renderize de forma consistente.

## Front-matter (metadados)

```yaml
---
codigo: ED-02            # código do módulo no currículo
titulo: Pilhas e filas
trilha: Estruturas de dados
nivel: basico            # basico | intermediario | avancado
prerequisitos: [ED-01]
duracao_min: 45
objetivos:
  - "..."
aprofundar:               # curso externo (ex.: do OSSU), só link, nunca conteúdo copiado
  - nome: "..."
    url: "https://..."
    trecho: "qual aula/capítulo"
tags: [estruturas-de-dados, lifo, fifo]
---
```

## Seções (nesta ordem)

1. **Por que isso importa**: um problema real que o conceito resolve (2-4 frases).
2. **Intuição**: analogia do dia a dia, sem jargão.
3. **Visual**: diagrama (ASCII/Mermaid). O app deve animar quando houver passo a passo.
4. **Conceito técnico**: definição precisa, operações, complexidade.
5. **Código**: implementação comentada (Python por padrão).
6. **Erros comuns**: 3-5 equívocos frequentes.
7. **Pratique**: perguntas no formato abaixo.
8. **Resumo**: 3-5 bullets.
9. **Para ir além**: leitura opcional, curso externo de `aprofundar` e próximo módulo.

## Formato das perguntas

Cada pergunta fica em um bloco ```quiz para o app conseguir extrair:

```quiz
id: ED-02-q1
tipo: multipla_escolha      # multipla_escolha | verdadeiro_falso | resposta_curta | prever_saida | codigo
pergunta: "..."
opcoes: ["A", "B", "C", "D"]
resposta: 1                 # índice (0-based) para múltipla escolha; true/false; texto para as demais
explicacao: "Por que essa é a resposta, e por que as outras não são."
dificuldade: 1              # 1 a 3
```

Para `resposta_curta`, `resposta` traz uma resposta-modelo e `palavras_chave` lista os termos que uma boa resposta deve conter.
Para `codigo`, inclua `linguagem`, `testes` (entrada → saída esperada, com pelo menos um teste oculto), `usa` (o que o código precisa usar), `dica` e `solucao`. O formato completo está no [README](../../README.md#desafios-de-código-corrigidos-automaticamente). Blocos de código de linguagens executáveis no texto da aula ganham automaticamente o botão "Experimentar".
