import { acharModulo, idAula, type Aula, type Modulo } from './conteudo';
import { perguntasDaAula } from './banco';
import type { Progresso } from './progresso';

/** Percentual mínimo no quiz de um pré-requisito para liberar o módulo seguinte. */
export const DOMINIO_MINIMO = 80;

/** A última resposta a esta pergunta foi certa? */
export function acertouUltima(p: Progresso, id: string) {
  const r = p.revisao[id];
  if (r?.recentes.length) return r.recentes[r.recentes.length - 1] === 1;
  return !!p.quiz[id]?.acertou;
}

/**
 * Domínio de uma aula (0 a 100): fração das perguntas do quiz cuja última resposta
 * foi certa. Aula sem perguntas conta como dominada quando está concluída.
 */
export function dominioAula(p: Progresso, aula: Aula) {
  const id = idAula(aula);
  const perguntas = perguntasDaAula(id);
  if (!perguntas.length) return p.concluidas[id] ? 100 : 0;
  const certas = perguntas.filter((q) => acertouUltima(p, q.id)).length;
  return Math.round((certas / perguntas.length) * 100);
}

export interface PrerequisitoPendente {
  codigo: string;
  titulo: string;
  aula: Aula;
  dominio: number;
}

/**
 * Pré-requisitos que ainda não chegaram a 80% no quiz. Lista vazia = módulo liberado.
 *
 * Não bloqueia quando: o modo livre está ligado, a aula já foi concluída (para não
 * trancar o que o aluno já estudou), ou o pré-requisito ainda não tem aula escrita.
 */
export function prerequisitosPendentes(p: Progresso, modulo: Pick<Modulo, 'prerequisitos' | 'aula'>): PrerequisitoPendente[] {
  if (p.livre) return [];
  if (modulo.aula && p.concluidas[idAula(modulo.aula)]) return [];
  const codigos = new Set([...(modulo.prerequisitos ?? []), ...(modulo.aula?.meta.prerequisitos ?? [])]);
  const pendentes: PrerequisitoPendente[] = [];
  for (const c of codigos) {
    const pre = acharModulo(c);
    const aula = pre?.modulo.aula;
    if (!aula) continue;
    const dominio = dominioAula(p, aula);
    if (dominio < DOMINIO_MINIMO) pendentes.push({ codigo: c, titulo: pre.modulo.titulo, aula, dominio });
  }
  return pendentes;
}
