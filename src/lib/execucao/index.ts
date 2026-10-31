import { useSyncExternalStore } from 'react';
import { analisarSemPython, type Analise, type Linguagem } from './linguagens';

export * from './linguagens';

/**
 * Executa código do aluno no navegador. Cada linguagem tem um Web Worker
 * próprio, criado na primeira execução. Se o programa passar do tempo limite
 * (laço sem fim), o worker é encerrado e recriado.
 */

export interface ErroCodigo {
  tipo: string;
  mensagem: string;
  linha: number | null;
  /** o que esse tipo de erro significa, em português */
  explicacao: string;
  /** dica para o caso específico (ex.: somar texto com número) */
  dica: string | null;
  traceback: string;
}

export interface ResultadoExecucao {
  /** só o que o programa imprimiu (print, console.log, printf, resultado do SELECT): é o que os testes comparam */
  saida: string;
  /** tudo como num terminal: perguntas do input(), o que foi digitado, saídas e erros */
  terminal: string;
  erro: ErroCodigo | null;
  /** valor da expressão `chamada` do teste, formatado na linguagem (repr no Python) */
  retorno: string | null;
  /** resultados de consultas SQL, para mostrar como tabela */
  tabelas?: { colunas: string[]; linhas: string[][] }[];
}

export interface DadosExecucao {
  codigo: string;
  entradas?: string[];
  chamada?: string;
  /** SQL que cria e preenche as tabelas antes da consulta do aluno */
  preparo?: string;
}

export type EstadoRuntime = 'parado' | 'carregando' | 'pronto' | 'falhou';

export const TEMPO_LIMITE_MS = 5000;

export class TempoEsgotado extends Error {
  constructor() {
    super(`O programa passou de ${TEMPO_LIMITE_MS / 1000} segundos e foi interrompido. Provavelmente há um laço que nunca termina.`);
    this.name = 'TempoEsgotado';
  }
}

interface Executor {
  worker: Worker;
  carregamento: Promise<void>;
  pendentes: Map<number, { ok: (v: unknown) => void; falha: (e: Error) => void }>;
}

const executores = new Map<Linguagem, Executor>();
const estados = new Map<Linguagem, EstadoRuntime>();
const ouvintes = new Set<() => void>();
let proximoId = 1;

const base = () => new URL('./', document.baseURI).href;

function mudarEstado(l: Linguagem, e: EstadoRuntime) {
  estados.set(l, e);
  ouvintes.forEach((f) => f());
}

function enviar<T>(ex: Executor, linguagem: Linguagem, acao: string, dados?: unknown, limite?: number): Promise<T> {
  const id = proximoId++;
  return new Promise<T>((ok, falha) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    ex.pendentes.set(id, {
      ok: (v) => { clearTimeout(timer); ok(v as T); },
      falha: (e) => { clearTimeout(timer); falha(e); },
    });
    if (limite) {
      timer = setTimeout(() => {
        ex.pendentes.delete(id);
        falha(new TempoEsgotado());
        reiniciar(linguagem);
      }, limite);
    }
    ex.worker.postMessage({ id, linguagem, base: base(), acao, dados });
  });
}

function obter(linguagem: Linguagem): Executor {
  let ex = executores.get(linguagem);
  if (ex) return ex;
  const worker = new Worker(new URL('./executor.worker.ts', import.meta.url), { type: 'module' });
  const novo: Executor = { worker, carregamento: Promise.resolve(), pendentes: new Map() };
  worker.onmessage = (ev) => {
    const { id, ok, resultado, erro } = ev.data;
    const p = novo.pendentes.get(id);
    if (!p) return;
    novo.pendentes.delete(id);
    if (ok) p.ok(resultado);
    else p.falha(new Error(erro));
  };
  mudarEstado(linguagem, 'carregando');
  novo.carregamento = enviar<void>(novo, linguagem, 'carregar').then(
    () => mudarEstado(linguagem, 'pronto'),
    (e) => {
      executores.delete(linguagem);
      worker.terminate();
      mudarEstado(linguagem, 'falhou');
      throw e;
    },
  );
  executores.set(linguagem, (ex = novo));
  return ex;
}

function reiniciar(linguagem: Linguagem) {
  const ex = executores.get(linguagem);
  if (!ex) return;
  ex.worker.terminate();
  ex.pendentes.forEach((p) => p.falha(new Error('Executor reiniciado')));
  executores.delete(linguagem);
  mudarEstado(linguagem, 'parado');
}

/** Começa a carregar o runtime da linguagem (ex.: ao abrir um desafio), para a primeira execução ser rápida. */
export function preparar(linguagem: Linguagem) {
  if (linguagem === 'html') return Promise.resolve();
  return obter(linguagem).carregamento;
}

export async function executar(linguagem: Linguagem, dados: DadosExecucao): Promise<ResultadoExecucao> {
  const ex = obter(linguagem);
  await ex.carregamento;
  return enviar<ResultadoExecucao>(ex, linguagem, 'executar', dados, TEMPO_LIMITE_MS);
}

export async function analisar(linguagem: Linguagem, codigo: string, usa: string[] = []): Promise<Analise> {
  if (linguagem !== 'python') return analisarSemPython(linguagem, codigo, usa);
  const ex = obter(linguagem);
  await ex.carregamento;
  return enviar<Analise>(ex, linguagem, 'analisar', { codigo, usa }, TEMPO_LIMITE_MS);
}

export const runtimePronto = (l: Linguagem) => l === 'html' || estados.get(l) === 'pronto';

export function useEstadoRuntime(linguagem: Linguagem): EstadoRuntime {
  return useSyncExternalStore(
    (f) => {
      ouvintes.add(f);
      return () => {
        ouvintes.delete(f);
      };
    },
    () => (linguagem === 'html' ? 'pronto' : estados.get(linguagem) ?? 'parado'),
  );
}

/** Compara saídas ignorando espaços no fim das linhas e linhas vazias no final. */
export function normalizarSaida(s: string) {
  return s.replace(/\r\n/g, '\n').split('\n').map((l) => l.trimEnd()).join('\n').replace(/\n+$/, '');
}
