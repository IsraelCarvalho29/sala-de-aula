/**
 * Repetição espaçada em degraus fixos (sistema de Leitner): 1, 3, 7, 14 e 30 dias.
 *
 * Cada pergunta e cada flashcard tem um estado com o degrau atual. Acertar sobe um
 * degrau; errar volta ao começo (revisa amanhã). Quem passa do último degrau
 * (30 dias) com acerto fica "dominada" e continua voltando a cada 30 dias.
 *
 * Funções puras, sem React nem localStorage, para poder testar e trocar o
 * algoritmo depois (ver docs/avaliacao/especificacao-quiz.md, seção 5).
 */

export const INTERVALOS = [1, 3, 7, 14, 30] as const;
/** Degrau a partir do qual a questão conta como dominada. */
export const DEGRAU_DOMINADA = INTERVALOS.length;

export interface EstadoRevisao {
  /** 0 = nunca acertou ou errou da última vez; 1..5 = degraus de 1, 3, 7, 14 e 30 dias. */
  degrau: number;
  /** próxima revisão, "AAAA-MM-DD" (data local) */
  proxima: string;
  /** última vez que respondeu, "AAAA-MM-DD" */
  ultima: string;
  acertos: number;
  erros: number;
  /** últimas respostas (1 = acertou, 0 = errou), mais recente no fim; no máximo 5 */
  recentes: number[];
}

/** Autoavaliação dos flashcards e perguntas abertas. */
export type Autoavaliacao = 'errei' | 'dificil' | 'bom' | 'facil';

export function hoje(agora = new Date()) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${agora.getFullYear()}-${p(agora.getMonth() + 1)}-${p(agora.getDate())}`;
}

export function somarDias(data: string, dias: number) {
  const [a, m, d] = data.split('-').map(Number);
  return hoje(new Date(a, m - 1, d + dias));
}

export function diasEntre(de: string, ate: string) {
  const [a1, m1, d1] = de.split('-').map(Number);
  const [a2, m2, d2] = ate.split('-').map(Number);
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86_400_000);
}

const intervaloDo = (degrau: number) => INTERVALOS[Math.min(Math.max(degrau, 1), INTERVALOS.length) - 1];

/**
 * Aplica uma resposta e devolve o novo estado (não altera o anterior).
 *
 * - Errou: volta ao degrau 0 e revisa amanhã.
 * - Acertou uma questão vencida (ou nova): sobe um degrau.
 * - Acertou antes do dia marcado (ex.: refazendo o quiz da aula): só registra,
 *   sem subir, para que reler e responder na hora não pule a revisão espaçada.
 * - Autoavaliação: "difícil" repete o degrau atual, "fácil" sobe dois.
 */
export function aplicarResposta(
  anterior: EstadoRevisao | undefined,
  resultado: boolean | Autoavaliacao,
  dia = hoje(),
): EstadoRevisao {
  const nivel = resultado === true ? 'bom' : resultado === false ? 'errei' : resultado;
  const acertou = nivel !== 'errei';
  const base: EstadoRevisao = anterior ?? { degrau: 0, proxima: dia, ultima: dia, acertos: 0, erros: 0, recentes: [] };
  const vencida = !anterior || anterior.proxima <= dia;
  const e: EstadoRevisao = {
    ...base,
    ultima: dia,
    acertos: base.acertos + (acertou ? 1 : 0),
    erros: base.erros + (acertou ? 0 : 1),
    recentes: [...base.recentes, acertou ? 1 : 0].slice(-5),
  };

  if (!acertou) {
    e.degrau = 0;
    e.proxima = somarDias(dia, 1);
    return e;
  }
  if (!vencida) return e;

  const salto = nivel === 'facil' ? 2 : nivel === 'dificil' ? 0 : 1;
  e.degrau = Math.min(DEGRAU_DOMINADA, Math.max(1, base.degrau + salto));
  e.proxima = somarDias(dia, intervaloDo(e.degrau));
  return e;
}

export const vencida = (e: EstadoRevisao | undefined, dia = hoje()) => !!e && e.proxima <= dia;
export const dominada = (e: EstadoRevisao | undefined) => !!e && e.degrau >= DEGRAU_DOMINADA;
/** Errou alguma das últimas 3 tentativas, ou está no degrau 0. */
export const fraca = (e: EstadoRevisao | undefined) => !!e && (e.degrau === 0 || e.recentes.slice(-3).includes(0));

/** Rótulo curto do intervalo atual, para mostrar no fim de cada resposta. */
export function quandoVolta(e: EstadoRevisao, dia = hoje()) {
  const d = diasEntre(dia, e.proxima);
  if (d <= 0) return 'volta hoje';
  if (d === 1) return 'volta amanhã';
  return `volta em ${d} dias`;
}

/**
 * Embaralha de forma determinística (mesma semente, mesma ordem), para que a sessão
 * não mude a cada render.
 */
export function embaralhar<T>(lista: T[], semente: number) {
  const a = [...lista];
  let s = semente || 1;
  const aleatorio = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(aleatorio() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Evita duas questões seguidas do mesmo grupo (aula/tópico), quando possível. */
export function intercalar<T>(lista: T[], grupo: (x: T) => string) {
  const resto = [...lista];
  const saida: T[] = [];
  while (resto.length) {
    const anterior = saida.length ? grupo(saida[saida.length - 1]) : undefined;
    const i = resto.findIndex((x) => grupo(x) !== anterior);
    saida.push(resto.splice(i === -1 ? 0 : i, 1)[0]);
  }
  return saida;
}
