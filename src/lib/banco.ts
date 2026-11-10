import { parse as parseYaml } from 'yaml';
import { trilhas, aulasDaTrilha, idAula, type Aula } from './conteudo';
import bancoInicial from '../../docs/avaliacao/banco-inicial.json';

/**
 * Banco de questões do treino: todas as perguntas (```quiz) e flashcards (```flashcards)
 * das aulas, mais as questões de docs/avaliacao/banco-inicial.json nos formatos que o
 * app já sabe mostrar.
 */

/** Pergunta no formato das aulas (docs/curriculo/modelo-de-aula.md). */
export interface TesteYaml {
  entrada?: string | number | (string | number)[];
  entradas?: (string | number)[];
  saida?: string | number;
  esperado?: string | number;
  chamada?: string;
  verifica?: string;
  descricao?: string;
  visivel?: boolean;
}

export interface DadosQuiz {
  id?: string;
  tipo?: string;
  pergunta: string;
  opcoes?: string[];
  resposta?: number | boolean | string;
  correta?: number; // alias antigo de `resposta`
  explicacao?: string;
  palavras_chave?: string[];
  dica?: string;
  dificuldade?: number;
  // desafio de código
  linguagem?: string;
  codigo_inicial?: string;
  testes?: TesteYaml[];
  usa?: string[];
  indentacao?: boolean;
  preparo?: string;
  solucao?: string;
}

export interface DadosFlashcard {
  id?: string;
  frente: string;
  verso: string;
}

interface ItemBase {
  id: string;
  /** slug da trilha */
  trilha: string;
  /** aula de onde veio (ausente nas questões do banco geral) */
  aula?: Aula;
  /** para intercalar: não repetir o mesmo grupo duas vezes seguidas */
  grupo: string;
  dificuldade: number;
}

export type ItemTreino =
  | (ItemBase & { tipo: 'quiz'; dados: DadosQuiz; codigo: boolean })
  | (ItemBase & { tipo: 'flashcard'; dados: DadosFlashcard; codigo: false });

/* ---------------------------------------------------------- blocos da aula */

export interface Bloco {
  tipo: 'quiz' | 'flashcards';
  /** n-ésimo bloco daquele tipo na aula (0, 1, 2...) */
  n: number;
  yaml: string;
}

/**
 * Recorta os blocos ```quiz e ```flashcards de uma aula: da abertura até a próxima
 * linha só com ```. É o mesmo recorte usado em components/Markdown.tsx e em
 * scripts/validar-aulas.mjs, e a numeração define o id padrão (`ED-02#3`).
 */
export function recortarBlocos(corpo: string): Bloco[] {
  const blocos: Bloco[] = [];
  const conta = { quiz: 0, flashcards: 0 };
  let atual: { tipo: Bloco['tipo']; linhas: string[] } | null = null;
  for (const linha of corpo.split('\n')) {
    const abre: RegExpExecArray | false | null = !atual && /^```(quiz|flashcards)\s*$/.exec(linha);
    if (abre) atual = { tipo: abre[1] as Bloco['tipo'], linhas: [] };
    else if (atual && /^```\s*$/.test(linha)) {
      blocos.push({ tipo: atual.tipo, n: conta[atual.tipo]++, yaml: atual.linhas.join('\n') });
      atual = null;
    } else if (atual) atual.linhas.push(linha);
  }
  return blocos;
}

/** Id padrão do n-ésimo flashcard da aula (contando todos os blocos ```flashcards). */
export const idFlashcard = (aula: string, n: number) => `${aula}#f${n}`;

function itensDaAula(trilha: string, aula: Aula): ItemTreino[] {
  const ida = idAula(aula);
  const itens: ItemTreino[] = [];
  let cartao = 0;
  for (const b of recortarBlocos(aula.corpo)) {
    try {
      if (b.tipo === 'quiz') {
        const q = parseYaml(b.yaml) as DadosQuiz;
        itens.push({
          tipo: 'quiz', id: q.id ?? `${ida}#${b.n}`, trilha, aula, grupo: ida, dados: q,
          dificuldade: q.dificuldade ?? 1, codigo: q.tipo === 'codigo' && !!q.testes?.length,
        });
      } else {
        const lista = parseYaml(b.yaml) as DadosFlashcard[];
        for (const c of Array.isArray(lista) ? lista : []) {
          itens.push({
            tipo: 'flashcard', id: c.id ?? idFlashcard(ida, cartao), trilha, aula, grupo: ida, dados: c,
            dificuldade: 1, codigo: false,
          });
          cartao++;
        }
      }
    } catch {
      // YAML inválido: o validador (npm run validar) acusa; aqui só pulamos
    }
  }
  return itens;
}

/* ------------------------------------------------- banco geral (JSON) */

interface QuestaoBanco {
  id: string;
  trilha: string;
  topico: string;
  tipo: string;
  dificuldade: number;
  enunciado: string;
  midia?: { codigo?: { linguagem: string; fonte: string } };
  alternativas?: { texto: string; correta: boolean; feedback?: string }[];
  resposta?: boolean;
  feedback_verdadeiro?: string;
  feedback_falso?: string;
  saida_esperada?: string;
  aceitas?: string[];
  resposta_modelo?: string;
  rubrica?: { criterio: string; peso: number }[];
  frente?: string;
  verso?: string;
  dica?: string;
  explicacao?: string;
}

/** Trilha do banco geral -> pasta da trilha em content/trilhas. */
const TRILHA_DO_BANCO: Record<string, string> = {
  algoritmos: '03-algoritmos',
  'estruturas-de-dados': '02-estruturas-de-dados',
  'sistemas-operacionais': '05-sistemas-operacionais',
  redes: '06-redes-de-computadores',
  'banco-de-dados': '10-banco-de-dados',
  'engenharia-de-software': '08-engenharia-de-software',
};

/** Converte uma questão do banco geral para o formato das aulas; `undefined` se o tipo ainda não tem tela. */
export function converterQuestaoBanco(q: QuestaoBanco): Omit<ItemTreino, 'trilha' | 'grupo' | 'id' | 'dificuldade'> | undefined {
  const codigo = q.midia?.codigo ? `\n\n\`\`\`${q.midia.codigo.linguagem}\n${q.midia.codigo.fonte}\n\`\`\`` : '';
  const pergunta = q.enunciado + codigo;
  const base = { pergunta, dica: q.dica, dificuldade: q.dificuldade, explicacao: q.explicacao };
  switch (q.tipo) {
    case 'multipla_escolha': {
      const alts = q.alternativas ?? [];
      return {
        tipo: 'quiz', codigo: false,
        dados: { ...base, tipo: 'multipla_escolha', opcoes: alts.map((a) => a.texto), resposta: alts.findIndex((a) => a.correta) },
      };
    }
    case 'verdadeiro_falso':
      return { tipo: 'quiz', codigo: false, dados: { ...base, tipo: 'verdadeiro_falso', resposta: !!q.resposta } };
    case 'prever_saida':
      return { tipo: 'quiz', codigo: false, dados: { ...base, tipo: 'prever_saida', resposta: q.saida_esperada } };
    case 'preencher_lacuna':
      return { tipo: 'quiz', codigo: false, dados: { ...base, tipo: 'resposta_curta', resposta: q.aceitas?.join(' / ') } };
    case 'resposta_aberta':
      return {
        tipo: 'quiz', codigo: false,
        dados: { ...base, tipo: 'resposta_curta', resposta: q.resposta_modelo, palavras_chave: undefined },
      };
    case 'flashcard':
      return { tipo: 'flashcard', codigo: false, dados: { frente: q.frente ?? q.enunciado, verso: q.verso ?? '' } };
    default:
      return undefined; // ordenar, multipla_resposta e codigo do banco ainda não têm tela no app
  }
}

function itensDoBanco(): ItemTreino[] {
  const itens: ItemTreino[] = [];
  for (const q of (bancoInicial as { questoes: QuestaoBanco[] }).questoes) {
    const convertido = converterQuestaoBanco(q);
    if (!convertido) continue;
    itens.push({
      ...convertido,
      id: `banco:${q.id}`,
      trilha: TRILHA_DO_BANCO[q.trilha] ?? q.trilha,
      grupo: `banco:${q.trilha}/${q.topico}`,
      dificuldade: q.dificuldade,
    } as ItemTreino);
  }
  return itens;
}

/* ------------------------------------------------------------- índice */

let cache: { itens: ItemTreino[]; porAula: Map<string, ItemTreino[]>; porId: Map<string, ItemTreino> } | undefined;

function indice() {
  if (cache) return cache;
  const itens: ItemTreino[] = [];
  const porAula = new Map<string, ItemTreino[]>();
  for (const t of trilhas) {
    for (const a of aulasDaTrilha(t)) {
      const daAula = itensDaAula(t.slug, a);
      porAula.set(idAula(a), daAula);
      itens.push(...daAula);
    }
  }
  itens.push(...itensDoBanco());
  cache = { itens, porAula, porId: new Map(itens.map((i) => [i.id, i])) };
  return cache;
}

/** Todas as perguntas e flashcards conhecidos. */
export const todosOsItens = () => indice().itens;
export const itensDaAulaId = (id: string) => indice().porAula.get(id) ?? [];
export const acharItem = (id: string) => indice().porId.get(id);
/** Só as perguntas do quiz de uma aula (sem flashcards): base do domínio da aula. */
export const perguntasDaAula = (id: string) => itensDaAulaId(id).filter((i) => i.tipo === 'quiz');
