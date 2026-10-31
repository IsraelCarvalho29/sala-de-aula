# Currículo da Sala de Aula: Ciência da Computação, Engenharia de Software e Desenvolvimento

> Referência externa: este currículo foi alinhado ao [OSSU Computer Science](https://github.com/ossu/computer-science). Ver [`ossu-mapeamento.md`](ossu-mapeamento.md) para o curso correspondente a cada módulo.
>
> Documento-mestre do conteúdo. Cada **trilha** agrupa **módulos**; cada módulo tem um código (ex.: `ED-02`), objetivos de aprendizagem, pré-requisitos e o formato de prática. As aulas seguem o modelo em [`modelo-de-aula.md`](modelo-de-aula.md).

## Como ler este currículo

- **Nível**: 🟢 básico · 🟡 intermediário · 🔴 avançado.
- **Pré-requisitos** usam os códigos dos módulos. O app pode usá-los para montar o grafo de dependências e liberar módulos.
- **Carga**: estimativa de horas de estudo (aula + exercícios).
- Todo módulo termina com um **quiz** (múltipla escolha + verdadeiro/falso + resposta curta) e, quando faz sentido, um **desafio prático** (código).

## Mapa das trilhas

```
                 ┌──────────────┐
                 │ 0. Fundamentos│
                 │ de programação│
                 └──────┬───────┘
          ┌─────────────┼──────────────┬───────────────┐
          ▼             ▼              ▼               ▼
  ┌──────────────┐ ┌──────────┐ ┌─────────────┐ ┌──────────────┐
  │1. Matemática │ │2. Estrut.│ │4. Arquitet. │ │8. Eng. de    │
  │  discreta    │ │ de dados │ │de computad. │ │  Software    │
  └──────┬───────┘ └────┬─────┘ └──────┬──────┘ └──────┬───────┘
         └──────┬───────┘              ▼               ▼
                ▼               ┌─────────────┐ ┌──────────────┐
         ┌─────────────┐        │5. Sistemas  │ │9. Arquitetura│
         │3. Algoritmos│        │ operacionais│ │ de software  │
         └──────┬──────┘        └──────┬──────┘ └──────┬───────┘
                ▼                      ▼               │
         ┌─────────────┐        ┌─────────────┐        │
         │7. Teoria da │        │6. Redes     │        │
         │ computação  │        └──────┬──────┘        │
         └─────────────┘               ▼               ▼
                 ┌──────────────┐ ┌───────────────────────────┐
                 │10. Banco de  │→│11. Sistemas distribuídos, │
                 │    dados     │ │    cloud e DevOps         │
                 └──────────────┘ └─────────────┬─────────────┘
                                                ▼
                                  ┌───────────────────────────┐
                                  │12. Segurança  ·  13. Web  │
                                  │14. Carreira e entrevistas │
                                  └───────────────────────────┘
```

---

## Trilha 0: Fundamentos de programação

| Código | Módulo | Nível | Pré-req. | Carga |
|---|---|---|---|---|
| FP-01 | Como um programa executa: código, compilador, interpretador | 🟢 | — | 2h |
| FP-02 | Variáveis, tipos e operadores | 🟢 | FP-01 | 3h |
| FP-03 | Controle de fluxo: condicionais e laços | 🟢 | FP-02 | 4h |
| FP-04 | Funções, escopo e recursão (introdução) | 🟢 | FP-03 | 4h |
| FP-05 | Arrays, strings e manipulação de texto | 🟢 | FP-03 | 4h |
| FP-06 | Programação orientada a objetos: classes, herança, polimorfismo | 🟡 | FP-04 | 6h |
| FP-07 | Programação funcional: funções puras, map/filter/reduce, imutabilidade | 🟡 | FP-04 | 4h |
| FP-08 | Tratamento de erros, depuração e leitura de stack traces | 🟢 | FP-04 | 3h |
| FP-09 | Git e GitHub: commits, branches, merge, pull requests | 🟢 | — | 4h |

**Objetivos da trilha**: escrever programas pequenos sem ajuda, depurar com método, versionar código com Git.
**Linguagem sugerida**: Python para conceitos; JavaScript/TypeScript na trilha Web; C em SO e Arquitetura.

## Trilha 1: Matemática discreta para computação

| Código | Módulo | Nível | Pré-req. | Carga |
|---|---|---|---|---|
| MD-01 | Lógica proposicional e tabelas-verdade | 🟢 | — | 3h |
| MD-02 | Conjuntos, relações e funções | 🟢 | MD-01 | 3h |
| MD-03 | Técnicas de prova: direta, contradição, indução | 🟡 | MD-01 | 5h |
| MD-04 | Sistemas de numeração: binário, hexadecimal, complemento de dois | 🟢 | — | 3h |
| MD-05 | Combinatória e probabilidade básica | 🟡 | MD-02 | 4h |
| MD-06 | Teoria dos grafos: definições, representações, propriedades | 🟡 | MD-02 | 4h |
| MD-07 | Recorrências e somatórios | 🟡 | MD-03 | 4h |

**Objetivos**: argumentar formalmente sobre correção, contar possibilidades e modelar problemas como grafos.

## Trilha 2: Estruturas de dados

| Código | Módulo | Nível | Pré-req. | Carga |
|---|---|---|---|---|
| ED-01 | Complexidade e notação Big-O | 🟢 | FP-05 | 3h |
| ED-02 | Pilhas e filas | 🟢 | ED-01 | 3h |
| ED-03 | Listas ligadas (simples, dupla, circular) | 🟢 | ED-01 | 4h |
| ED-04 | Tabelas hash: funções de hash, colisões, rehash | 🟡 | ED-03 | 4h |
| ED-05 | Árvores binárias e árvores binárias de busca | 🟡 | ED-03, FP-04 | 5h |
| ED-06 | Árvores balanceadas: AVL e rubro-negra | 🔴 | ED-05 | 5h |
| ED-07 | Heaps e filas de prioridade | 🟡 | ED-05 | 3h |
| ED-08 | Grafos: lista e matriz de adjacência | 🟡 | ED-03, MD-06 | 3h |
| ED-09 | Tries, Union-Find e B-trees | 🔴 | ED-05 | 4h |

**Objetivos**: escolher a estrutura certa para cada problema justificando custos de tempo e memória; implementar cada estrutura do zero.
**Visual**: animações de inserção/remoção passo a passo (essencial nesta trilha).

## Trilha 3: Algoritmos

| Código | Módulo | Nível | Pré-req. | Carga |
|---|---|---|---|---|
| AL-01 | Busca linear e busca binária | 🟢 | ED-01 | 2h |
| AL-02 | Ordenação simples: bubble, selection, insertion | 🟢 | ED-01 | 3h |
| AL-03 | Ordenação eficiente: merge sort, quick sort, heap sort | 🟡 | AL-02, ED-07 | 5h |
| AL-04 | Recursão e divisão e conquista (Teorema Mestre) | 🟡 | FP-04, MD-07 | 4h |
| AL-05 | Busca em grafos: BFS e DFS | 🟡 | ED-08 | 4h |
| AL-06 | Caminhos mínimos: Dijkstra, Bellman-Ford | 🟡 | AL-05, ED-07 | 4h |
| AL-07 | Árvore geradora mínima: Kruskal e Prim | 🟡 | AL-05, ED-09 | 3h |
| AL-08 | Algoritmos gulosos | 🟡 | AL-03 | 3h |
| AL-09 | Programação dinâmica | 🔴 | AL-04 | 6h |
| AL-10 | Backtracking | 🟡 | AL-04 | 3h |
| AL-11 | Padrões de problemas: two pointers, sliding window, prefix sum | 🟡 | AL-01 | 4h |

**Objetivos**: projetar algoritmos, provar correção informalmente e analisar complexidade.

## Trilha 4: Arquitetura e organização de computadores

| Código | Módulo | Nível | Pré-req. | Carga |
|---|---|---|---|---|
| AC-01 | Portas lógicas e circuitos combinacionais | 🟢 | MD-01, MD-04 | 3h |
| AC-02 | Circuitos sequenciais: flip-flops, registradores | 🟡 | AC-01 | 3h |
| AC-03 | CPU: ciclo busca-decodifica-executa, ULA | 🟡 | AC-02 | 4h |
| AC-04 | Conjunto de instruções e assembly (RISC-V) | 🟡 | AC-03 | 5h |
| AC-05 | Hierarquia de memória e cache | 🟡 | AC-03 | 4h |
| AC-06 | Pipeline e paralelismo em nível de instrução | 🔴 | AC-04 | 4h |

## Trilha 5: Sistemas operacionais

| Código | Módulo | Nível | Pré-req. | Carga |
|---|---|---|---|---|
| SO-01 | O que o SO faz: kernel, modo usuário vs. kernel, syscalls | 🟢 | AC-03 | 2h |
| SO-02 | Processos e threads | 🟡 | SO-01 | 4h |
| SO-03 | Escalonamento de CPU | 🟡 | SO-02 | 3h |
| SO-04 | Concorrência: condições de corrida, mutex, semáforos | 🔴 | SO-02 | 5h |
| SO-05 | Deadlocks | 🟡 | SO-04 | 3h |
| SO-06 | Memória virtual e paginação | 🔴 | SO-01, AC-05 | 5h |
| SO-07 | Sistemas de arquivos | 🟡 | SO-01 | 3h |
| SO-08 | Linha de comando Linux e shell scripting | 🟢 | — | 4h |

## Trilha 6: Redes de computadores

| Código | Módulo | Nível | Pré-req. | Carga |
|---|---|---|---|---|
| RD-01 | Modelos OSI e TCP/IP | 🟢 | — | 2h |
| RD-02 | Camada física e de enlace: Ethernet, MAC, Wi-Fi | 🟢 | RD-01 | 2h |
| RD-03 | Camada de rede: IP, sub-redes, roteamento | 🟡 | RD-01, MD-04 | 4h |
| RD-04 | Camada de transporte: TCP vs. UDP, handshake, controle de congestionamento | 🟡 | RD-03 | 4h |
| RD-05 | Camada de aplicação: DNS, HTTP/1.1, HTTP/2, HTTP/3 | 🟡 | RD-04 | 4h |
| RD-06 | TLS e HTTPS | 🟡 | RD-05 | 3h |
| RD-07 | Ferramentas: ping, traceroute, curl, Wireshark | 🟢 | RD-03 | 2h |

## Trilha 7: Teoria da computação

| Código | Módulo | Nível | Pré-req. | Carga |
|---|---|---|---|---|
| TC-01 | Autômatos finitos e expressões regulares | 🟡 | MD-02 | 4h |
| TC-02 | Gramáticas livres de contexto e parsing | 🔴 | TC-01 | 4h |
| TC-03 | Máquinas de Turing e computabilidade | 🔴 | TC-01 | 4h |
| TC-04 | Classes P, NP, NP-completo | 🔴 | TC-03, AL-09 | 4h |
| TC-05 | Compiladores: análise léxica, sintática, geração de código | 🔴 | TC-02, AC-04 | 6h |

## Trilha 8: Engenharia de software

| Código | Módulo | Nível | Pré-req. | Carga |
|---|---|---|---|---|
| ES-01 | Ciclo de vida do software e metodologias (cascata, Scrum, Kanban) | 🟢 | — | 2h |
| ES-02 | Requisitos: histórias de usuário e critérios de aceitação | 🟢 | ES-01 | 2h |
| ES-03 | Código limpo: nomes, funções, comentários | 🟢 | FP-06 | 3h |
| ES-04 | Princípios SOLID, DRY, KISS, YAGNI | 🟡 | FP-06 | 4h |
| ES-05 | Padrões de projeto (GoF): criacionais, estruturais, comportamentais | 🟡 | ES-04 | 6h |
| ES-06 | Testes: unitário, integração, e2e, TDD | 🟡 | FP-08 | 5h |
| ES-07 | Refatoração e débito técnico | 🟡 | ES-03, ES-06 | 3h |
| ES-08 | Code review e colaboração | 🟢 | FP-09 | 2h |
| ES-09 | UML e modelagem: casos de uso, classes, sequência | 🟢 | FP-06 | 3h |

## Trilha 9: Arquitetura de software

| Código | Módulo | Nível | Pré-req. | Carga |
|---|---|---|---|---|
| AS-01 | Monólito, camadas e MVC | 🟡 | ES-04 | 3h |
| AS-02 | Arquitetura hexagonal e Clean Architecture | 🔴 | AS-01, ES-05 | 4h |
| AS-03 | Design de APIs: REST, GraphQL, gRPC | 🟡 | RD-05 | 4h |
| AS-04 | Microsserviços: quando usar e quando não usar | 🔴 | AS-01, AS-03 | 4h |
| AS-05 | Mensageria e eventos: filas, pub/sub, event sourcing | 🔴 | AS-04 | 4h |
| AS-06 | Domain-Driven Design (DDD) | 🔴 | AS-02 | 5h |

## Trilha 10: Banco de dados

| Código | Módulo | Nível | Pré-req. | Carga |
|---|---|---|---|---|
| BD-01 | Modelo relacional e modelagem ER | 🟢 | MD-02 | 3h |
| BD-02 | SQL básico: SELECT, WHERE, JOIN, GROUP BY | 🟢 | BD-01 | 5h |
| BD-03 | Normalização (1FN a FNBC) | 🟡 | BD-01 | 3h |
| BD-04 | Índices e planos de execução | 🟡 | BD-02, ED-09 | 4h |
| BD-05 | Transações, ACID e níveis de isolamento | 🔴 | BD-02, SO-04 | 4h |
| BD-06 | NoSQL: documento, chave-valor, coluna, grafo | 🟡 | BD-01 | 3h |
| BD-07 | ORMs e migrações | 🟢 | BD-02, FP-06 | 2h |

## Trilha 11: Sistemas distribuídos, cloud e DevOps

| Código | Módulo | Nível | Pré-req. | Carga |
|---|---|---|---|---|
| SD-01 | Fundamentos: latência, falhas parciais, teorema CAP | 🔴 | RD-04, BD-05 | 3h |
| SD-02 | Replicação, particionamento (sharding) e consenso | 🔴 | SD-01 | 5h |
| SD-03 | Cache, CDN e balanceamento de carga | 🟡 | RD-05 | 3h |
| SD-04 | System design: projetando sistemas escaláveis | 🔴 | SD-02, SD-03, AS-03 | 6h |
| SD-05 | Contêineres: Docker | 🟡 | SO-08 | 3h |
| SD-06 | Orquestração: Kubernetes (conceitos) | 🔴 | SD-05 | 4h |
| SD-07 | CI/CD e infraestrutura como código | 🟡 | FP-09, ES-06 | 3h |
| SD-08 | Observabilidade: logs, métricas, traces | 🟡 | SD-07 | 2h |

## Trilha 12: Segurança

| Código | Módulo | Nível | Pré-req. | Carga |
|---|---|---|---|---|
| SE-01 | Fundamentos: CIA, ameaças, superfície de ataque | 🟢 | — | 2h |
| SE-02 | Criptografia: simétrica, assimétrica, hash | 🟡 | MD-04, RD-06 | 4h |
| SE-03 | Autenticação e autorização: sessões, JWT, OAuth 2.0 | 🟡 | WB-04 | 4h |
| SE-04 | OWASP Top 10: SQL injection, XSS, CSRF e outros | 🟡 | BD-02, WB-02 | 4h |

## Trilha 13: Desenvolvimento web

| Código | Módulo | Nível | Pré-req. | Carga |
|---|---|---|---|---|
| WB-01 | HTML semântico e CSS (Flexbox, Grid) | 🟢 | — | 5h |
| WB-02 | JavaScript e o DOM; event loop | 🟢 | FP-04 | 5h |
| WB-03 | TypeScript | 🟡 | WB-02 | 3h |
| WB-04 | Back-end: servidor HTTP, rotas, middlewares | 🟡 | RD-05, WB-02 | 5h |
| WB-05 | Front-end com framework (React): componentes, estado, hooks | 🟡 | WB-03 | 6h |
| WB-06 | Acessibilidade e performance web | 🟡 | WB-05 | 3h |

## Trilha 14: Carreira e entrevistas técnicas

| Código | Módulo | Nível | Pré-req. | Carga |
|---|---|---|---|---|
| CR-01 | Como resolver problemas de código em entrevista | 🟡 | AL-11 | 3h |
| CR-02 | Entrevista de system design | 🔴 | SD-04 | 3h |
| CR-03 | Portfólio, GitHub e currículo | 🟢 | FP-09 | 2h |

## Trilha 15: Matemática contínua

| Código | Módulo | Nível | Pré-req. | Carga |
|---|---|---|---|---|
| MC-01 | Funções, limites e derivadas | 🟡 | — | 6h |
| MC-02 | Integrais | 🟡 | MC-01 | 5h |
| MC-03 | Séries e coordenadas | 🔴 | MC-02 | 4h |
| MC-04 | Álgebra linear: vetores, matrizes, transformações | 🟡 | — | 6h |
| MC-05 | Probabilidade e estatística | 🟡 | MD-05, MC-02 | 6h |

## Trilha 16: Inteligência artificial e machine learning

| Código | Módulo | Nível | Pré-req. | Carga |
|---|---|---|---|---|
| IA-01 | O que é aprendizado de máquina: supervisionado × não supervisionado | 🟢 | FP-05 | 2h |
| IA-02 | Regressão linear e logística, gradiente descendente | 🟡 | IA-01, MC-01, MC-04 | 5h |
| IA-03 | Redes neurais | 🔴 | IA-02 | 5h |
| IA-04 | Clustering, avaliação de modelos e overfitting | 🟡 | IA-02, MC-05 | 4h |

## Trilha 17: Ética e profissão

| Código | Módulo | Nível | Pré-req. | Carga |
|---|---|---|---|---|
| ET-01 | Ética em tecnologia e engenharia | 🟢 | — | 2h |
| ET-02 | Propriedade intelectual e licenças de software | 🟢 | — | 2h |
| ET-03 | Privacidade de dados e LGPD | 🟢 | — | 2h |

## Trilha 18: Paradigmas de linguagens

| Código | Módulo | Nível | Pré-req. | Carga |
|---|---|---|---|---|
| FP-10 | Projeto sistemático de funções (receita de projeto) | 🟢 | FP-04 | 3h |
| LP-01 | Tipagem estática × dinâmica, inferência de tipos | 🟡 | FP-06 | 3h |
| LP-02 | Funções de primeira classe, closures, pattern matching | 🟡 | FP-07 | 4h |
| LP-03 | Avaliação, escopo léxico e como um interpretador funciona | 🔴 | LP-02, TC-02 | 5h |

## Projetos de trilha

| Ao terminar | Projeto | Inspirado em |
|---|---|---|
| Trilha 0 | Jogo da forca ou agenda no terminal | MIT 6.0001 (problem sets) |
| Trilhas 2-3 | Implementar e visualizar 5 estruturas e 5 algoritmos | Algorithms Illuminated |
| Trilha 4 | Construir portas lógicas até uma CPU simples | Nand to Tetris |
| Trilha 6 | Capturar e explicar um acesso HTTPS no Wireshark | Kurose & Ross, Wireshark Labs |
| Trilha 10 | Modelar e consultar o banco de um sistema real | Stanford Databases |
| Trilha 13 | Aplicação full stack publicada | Fullstack Open |

---

## Ordem sugerida (caminho principal)

1. **Mês 1**: FP-01→FP-09, MD-01, MD-04, SO-08
2. **Mês 2**: ED-01→ED-05, AL-01→AL-03, MD-03
3. **Mês 3**: ED-06→ED-09, AL-04→AL-11, MD-06, MD-07
4. **Mês 4**: AC-01→AC-05, SO-01→SO-07
5. **Mês 5**: RD-01→RD-07, BD-01→BD-05, WB-01→WB-04
6. **Mês 6**: ES-01→ES-09, AS-01→AS-03
7. **Mês 7+**: SD, SE, AS avançado, TC, CR

O caminho muda conforme o nível: um intermediário faz a Trilha 0 como revisão rápida (só os quizzes) e começa em ED-01.

### Caminho do Israel (nível: iniciante)

Ritmo sugerido de 5 a 7 horas por semana, com aulas curtas e muita prática. Os meses acima ficam mais espaçados:

Estudo em paralelo: o curso [MIT 6.0001](https://github.com/ossu/computer-science/blob/master/coursepages/intro-cs/README.md) (primeiro curso do OSSU) acompanha as semanas 1-6. Primeiro a aula nossa, depois a aula do MIT, depois nosso quiz.

1. **Semanas 1-2**: FP-01, FP-02, MD-04 (binário), SO-08 (terminal básico, com o Missing Semester)
2. **Semanas 3-4**: FP-03, FP-04, MD-01 (lógica)
3. **Semanas 5-6**: FP-05, FP-08, FP-09 (Git), FP-10 e um mini-projeto (ex.: jogo da forca no terminal)
4. **Semanas 7-8**: FP-06, FP-07, WB-01, ET-01
5. **Semanas 9-12**: ED-01→ED-05 e AL-01→AL-02
6. **Em paralelo a partir da semana 9**: MC-01 (cálculo), 2h por semana, como no Core math do OSSU
7. **Depois**: seguir o caminho principal a partir do Mês 3

Regras para o modo iniciante: só liberar um módulo quando os pré-requisitos estiverem dominados (≥ 80% no quiz), mostrar a dica antes da resposta em todo desafio de código e manter a revisão espaçada ativa desde a primeira aula.

## Sistema de prática (para todas as aulas)

| Tipo | Uso | Exemplo |
|---|---|---|
| Múltipla escolha | Checar conceito | "Qual a complexidade da busca binária?" |
| Verdadeiro/Falso com justificativa | Desfazer equívocos comuns | "Uma pilha é FIFO. (F, é LIFO)" |
| Resposta curta | Recuperação ativa | "Explique em uma frase por que a hash table tem O(1) médio." |
| Prever a saída | Ler código | Trecho de código + "o que imprime?" |
| Desafio de código | Aplicar | Implementar a estrutura com testes automáticos |
| Flashcards | Revisão espaçada | Frente: termo · Verso: definição + exemplo |

**Revisão espaçada**: cada pergunta errada volta em 1, 3, 7, 14 e 30 dias (estilo Anki/SM-2).
**Domínio de um módulo**: ≥ 80% no quiz + desafio prático aprovado.
