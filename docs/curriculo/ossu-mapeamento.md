# Mapeamento OSSU → nossas trilhas

Fonte: [OSSU Computer Science](https://github.com/ossu/computer-science) (lista de cursos sob licença MIT, © Open Source Society University). Os cursos listados pertencem às suas instituições e têm licenças próprias, por isso **nós só linkamos os cursos**. Nossas aulas são escritas do zero no nosso método (intuição → visual → conceito → código → erros comuns → quiz), cobrindo os mesmos tópicos.

## Como usar na sala de aula

Cada módulo nosso ganha um campo `aprofundar` no front-matter, apontando o curso OSSU correspondente:

```yaml
aprofundar:
  - nome: "Algorithms: Design and Analysis, Part 1 (Stanford)"
    url: "https://www.algorithmsilluminated.org/"
    trecho: "Semanas 1-2: análise assintótica"
```

Fluxo de estudo sugerido por módulo:
1. **Aula nossa** (curta, visual, em português) para construir a intuição.
2. **Curso OSSU** no trecho indicado, para aprofundar com a fonte original (em inglês).
3. **Quiz e desafio nossos** para fixar, com revisão espaçada.
4. **Projeto aplicado** ao fim de cada trilha, no espírito do "Final project" do OSSU.

## Tabela de correspondência

| Etapa OSSU | Curso OSSU | Nossas trilhas/módulos | Observação |
|---|---|---|---|
| Intro CS | [Intro to CS and Programming using Python (MIT 6.0001)](https://github.com/ossu/computer-science/blob/master/coursepages/intro-cs/README.md) | FP-01→FP-05, FP-08 | **Ponto de partida do Israel.** Bate com nossas semanas 1-6 |
| Core programming | [Systematic Program Design](https://github.com/ossu/computer-science/blob/master/coursepages/spd/README.md) | FP-04, FP-07, ES-06 | Ensina receita de projeto de funções; vira um módulo novo FP-10 |
| Core programming | [Class-based Program Design](https://github.com/ossu/computer-science/blob/master/coursepages/class-based/README.md) | FP-06, ES-09 | |
| Core programming | [Programming Languages (UW CSE341)](https://courses.cs.washington.edu/courses/cse341/19sp/#lectures) | FP-07, novo LP-01→LP-03 | Tipagem estática × dinâmica, funcional |
| Core programming | [Object-Oriented Design (NEU)](https://course.ccs.neu.edu/cs3500f19/) | ES-03→ES-05, ES-07 | |
| Core programming | [Software Architecture (Alberta)](https://www.coursera.org/learn/software-architecture) | AS-01→AS-04 | |
| Core math | [Calculus 1A/1B/1C (MITx)](https://openlearninglibrary.mit.edu/courses/course-v1:MITx+18.01.1x+2T2019/about) | novo MC-01→MC-03 | Lacuna que tínhamos |
| Core math | [Mathematics for Computer Science (MIT 6.042J)](https://openlearninglibrary.mit.edu/courses/course-v1:OCW+6.042J+2T2019/about) | MD-01→MD-07, ED-01 | |
| CS Tools | [The Missing Semester (MIT)](https://missing.csail.mit.edu/) | SO-08, FP-09 | Ótimo cedo: terminal, Git, editor |
| Core systems | [Nand to Tetris I e II](https://www.nand2tetris.org/) | AC-01→AC-04, TC-05 | Projeto prático: construir um computador |
| Core systems | [Operating Systems: Three Easy Pieces](https://github.com/ossu/computer-science/blob/master/coursepages/ostep/README.md) | SO-01→SO-07 | Livro gratuito (pages.cs.wisc.edu/~remzi/OSTEP) |
| Core systems | [Computer Networking: a Top-Down Approach](https://gaia.cs.umass.edu/kurose_ross/online_lectures.htm) | RD-01→RD-07 | Labs de Wireshark para RD-07 |
| Core theory | [Algorithms Part 1 e 2 (Stanford / Algorithms Illuminated)](https://www.algorithmsilluminated.org/) | ED-01→ED-09, AL-01→AL-11, TC-04 | |
| Core security | Cybersecurity Fundamentals, Principles of Secure Coding, Identifying Security Vulnerabilities | SE-01→SE-04 | Links no OSSU |
| Core applications | Databases (Stanford, 3 cursos) | BD-01→BD-06 | |
| Core applications | [Machine Learning (DeepLearning.AI)](https://www.deeplearning.ai/courses/machine-learning-specialization/) | novo IA-01→IA-04 | Lacuna que tínhamos |
| Core applications | Computer Graphics (UCSD) | eletiva futura | |
| Core applications | [Software Engineering: Introduction (UBC)](https://github.com/ubccpsc/310/blob/main/resources/README.md) | ES-01, ES-02, ES-06, ES-07, AS-03 | |
| Core ethics | Ethics, Technology and Engineering; Intellectual Property; Data Privacy | novo ET-01→ET-03 | Lacuna que tínhamos |
| Advanced programming | Compilers (Stanford), Software Debugging, Software Testing | TC-05, FP-08, ES-06 | |
| Advanced systems | Computation Structures 1-3 (MIT 6.004) | AC-05, AC-06, SO-06 | |
| Advanced theory | [Theory of Computation (MIT 18.404J)](https://ocw.mit.edu/courses/18-404j-theory-of-computation-fall-2020/) | TC-01→TC-04 | |
| Advanced math | [Essence of Linear Algebra (3Blue1Brown)](https://www.youtube.com/playlist?list=PLZHQObOWTQDPD3MizzM2xVFitgF8hE_ab), Linear Algebra (MIT 18.06), Probability (Harvard Stat 110) | novo MC-04, MC-05 | Pré-requisito de IA |
| Final project | [Fullstack Open](https://fullstackopen.com/en/) e outros | WB-01→WB-06, SD-05, SD-07 | Nosso projeto final |

## O que o OSSU tem e nós não tínhamos (adicionado ao currículo)

- **Trilha 15: Matemática contínua** (cálculo, álgebra linear, probabilidade).
- **Trilha 16: Inteligência artificial e machine learning**.
- **Trilha 17: Ética e profissão**.
- **Trilha 18: Paradigmas de linguagens** (funcional, tipagem, ML/Racket como ideia).
- **Projetos de trilha** inspirados nos cursos práticos (Nand to Tetris, Wireshark Labs, Fullstack Open).

## O que nós temos e o OSSU não cobre diretamente

Sistemas distribuídos, cloud e DevOps (trilha 11), desenvolvimento web moderno (trilha 13, só aparece no projeto final do OSSU), arquitetura avançada/DDD (trilha 9) e preparação para entrevistas (trilha 14). Esses continuam com referências próprias.
