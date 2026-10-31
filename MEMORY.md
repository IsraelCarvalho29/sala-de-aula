# Memória do projeto

Registro vivo das decisões e do estado do projeto. Atualize sempre que uma decisão mudar ou uma etapa terminar.

## Objetivo

Sala de aula web para o Israel estudar Ciência da Computação, Engenharia de Software e desenvolvimento, com explicações visuais e técnicas e perguntas e respostas para treinar. Precisa funcionar bem no **desktop e no celular**.

## Aluno

- Nível atual: **iniciante**. O currículo tem um "Caminho do Israel" de 5 a 7 horas por semana ([curriculo.md](docs/curriculo/curriculo.md#caminho-do-israel-nível-iniciante)).
- Idioma de todo o conteúdo e da interface: **português do Brasil**.

## Decisões

| Data | Decisão | Por quê |
|---|---|---|
| 2026-10-31 | Vite + React + TypeScript, site estático | Simples de rodar e publicar (GitHub Pages), sem servidor |
| 2026-10-31 | Conteúdo em arquivos Markdown em `content/trilhas/` | Fácil de escrever e revisar em PR; versionado junto com o código |
| 2026-10-31 | Hierarquia **trilha → módulo**, uma aula por módulo, identificada pelo código (ex.: `ED-01`) | Segue o currículo; o código é a chave de progresso e de pré-requisitos |
| 2026-10-31 | `_trilha.md` gerado a partir de `docs/curriculo/curriculo.md` | Uma fonte da verdade para a lista de módulos; módulos sem aula aparecem como "em breve" |
| 2026-10-31 | Perguntas em blocos ` ```quiz ` (YAML) dentro da aula | Formato definido no modelo de aula; o enunciado pode ter código |
| 2026-10-31 | Progresso no `localStorage`, com exportar/importar JSON | Sem login nem backend por enquanto |
| 2026-10-31 | Diagramas em Mermaid, carregado sob demanda | Diagramas em texto; não pesa nas páginas sem diagrama |
| 2026-10-31 | Tokens visuais do protótipo de design, tema claro/escuro pelo sistema, breakpoint mobile em 640px | Versão mobile pedida pelo Israel |
| 2026-10-31 | Rotas com `#` (HashRouter) e `base: './'` | Funciona no GitHub Pages em qualquer subpasta |
| 2026-10-31 | IDE nas aulas: CodeMirror 6 + execução no navegador (Pyodide, JS/TS com Sucrase, C/C++ com JSCPP, SQLite com sql.js, HTML em iframe), um Web Worker por linguagem, 5 s de limite | Pedido do Israel: escrever código como numa IDE, ver o erro e só passar quando estiver certo e bem indentado, em todas as linguagens do currículo |
| 2026-10-31 | Runtimes WebAssembly publicados com o site (`dist/pyodide`, `dist/sqljs`), não via CDN | Não depende de serviço externo; prepara o modo offline |
| 2026-10-31 | Desafio de código só é aceito com todos os testes, indentação no padrão (4 espaços Python/C, 2 JS/TS) e o que `usa` pede | O Israel quer que as respostas sejam feitas "certinho" |
| 2026-10-31 | `scripts/validar-aulas.mjs` (npm run validar, no CI) roda a solução de cada desafio com os executores do app | Garante que nenhum desafio publicado é impossível de passar; já achou desafios quebrados |
| 2026-10-31 | Desafios de função usam `chamada`; quando o teste precisa de várias operações, o `codigo_inicial` traz uma função auxiliar pronta ("não mude") | `chamada` é uma expressão só |
| 2026-10-31 | Aulas escritas na ordem do Caminho do Israel, entregues em lotes por semana no mesmo PR | Pedido do Israel: escrever todas as aulas "em breve" que der |

## Estado atual

- App base pronto: início com as trilhas, página da trilha com todos os módulos, página da aula com objetivos, pré-requisitos, perguntas, "para aprofundar" e botão de concluir.
- Perguntas funcionando: múltipla escolha, verdadeiro ou falso, tipos abertos com autoavaliação (resposta curta, prever saída) e desafios de código corrigidos por testes na IDE do navegador.
- IDE: Python, JavaScript, TypeScript (sem checagem de tipos, só remove as anotações), C/C++ (subconjunto didático do JSCPP), SQL e HTML/CSS. Shell e assembly RISC-V ainda não têm executor.
- FP-01 ampliada com tipos de dados (int, float, str, bool), conversão, input(), f-strings e indentação, e 6 desafios de código.
- 19 trilhas geradas do currículo; 23 aulas escritas, cobrindo todo o Caminho do Israel (12 semanas): FP-01 a FP-10, MD-01, MD-04, SO-08, WB-01, ET-01, ED-01 a ED-05, AL-01, AL-02, MC-01. 240 perguntas, 91 desafios de código.
- CI de build em PRs e workflow de publicação no GitHub Pages (precisa ativar em Settings → Pages → Source: GitHub Actions).

## Próximos passos

1. Escrever as aulas do "Depois" (caminho principal a partir do Mês 3 do currículo): MD-02, MD-03, ED-06 em diante, AL-03 em diante, WB-02...
2. Componente de explicação visual passo a passo (`VisualStep`, ver `docs/design/prototipo-visual.html`) e um bloco Markdown para usá-lo nas aulas.
3. Modo de treino com o banco de questões (`docs/avaliacao/banco-inicial.json`) e repetição espaçada (`docs/avaliacao/revisao.js`).
4. Bloquear módulos até os pré-requisitos estarem dominados (≥ 80% no quiz), como pede o modo iniciante.
5. Executores para shell (SO-08 hoje só tem desafio em Python) e assembly RISC-V (AC-04); checagem de tipos de verdade no TypeScript; `scanf` direto em `&v[i]` no C (JSCPP dá "Memory overflow").
6. PWA para estudar offline no celular.

## Onde está cada coisa

Ver a seção Estrutura do [README](README.md#estrutura) e a divisão de papéis em [TEAM.md](TEAM.md).
