import { useSyncExternalStore } from 'react';
import { aplicarResposta, hoje, type Autoavaliacao, type EstadoRevisao } from './revisao';

/** Progresso salvo no navegador (localStorage). Sem login, sem servidor. */
const CHAVE = 'sala-de-aula:progresso:v1';

export interface Progresso {
  concluidas: Record<string, string>; // idAula -> data ISO
  quiz: Record<string, { acertou: boolean; tentativas: number }>; // idAula#n -> resultado
  /** repetição espaçada: id da pergunta ou do flashcard -> estado (ver lib/revisao.ts) */
  revisao: Record<string, EstadoRevisao>;
  /** modo livre: ignora o bloqueio por pré-requisitos */
  livre: boolean;
}

const vazio: Progresso = { concluidas: {}, quiz: {}, revisao: {}, livre: false };
let estado: Progresso = carregar();
const ouvintes = new Set<() => void>();

function normalizar(bruto: Partial<Progresso>): Progresso {
  const p: Progresso = { ...vazio, ...bruto, revisao: { ...(bruto.revisao ?? {}) } };
  // progresso de antes da revisão espaçada: quem já acertou entra no primeiro degrau
  for (const [id, r] of Object.entries(p.quiz)) {
    if (!p.revisao[id]) p.revisao[id] = aplicarResposta(undefined, r.acertou);
  }
  return p;
}

function carregar(): Progresso {
  try {
    return normalizar(JSON.parse(localStorage.getItem(CHAVE) ?? '{}'));
  } catch {
    return vazio;
  }
}

function salvar(novo: Progresso) {
  estado = novo;
  try {
    localStorage.setItem(CHAVE, JSON.stringify(novo));
  } catch {
    // navegação privada ou armazenamento cheio: segue só na memória
  }
  ouvintes.forEach((f) => f());
}

export function useProgresso() {
  return useSyncExternalStore(
    (f) => {
      ouvintes.add(f);
      return () => {
        ouvintes.delete(f);
      };
    },
    () => estado,
  );
}

export function marcarConcluida(id: string, concluida: boolean) {
  const concluidas = { ...estado.concluidas };
  if (concluida) concluidas[id] = new Date().toISOString();
  else delete concluidas[id];
  salvar({ ...estado, concluidas });
}

/**
 * Registra a resposta a uma pergunta (na aula ou no treino) e agenda a próxima revisão.
 * `resultado` é acertou/errou, ou a autoavaliação nas perguntas abertas.
 */
export function registrarResposta(idQuestao: string, resultado: boolean | Autoavaliacao) {
  const acertou = resultado !== false && resultado !== 'errei';
  const anterior = estado.quiz[idQuestao];
  salvar({
    ...estado,
    quiz: {
      ...estado.quiz,
      // guarda se já acertou alguma vez e quantas tentativas fez
      [idQuestao]: { acertou: acertou || !!anterior?.acertou, tentativas: (anterior?.tentativas ?? 0) + 1 },
    },
    revisao: { ...estado.revisao, [idQuestao]: aplicarResposta(estado.revisao[idQuestao], resultado, hoje()) },
  });
}

/** Flashcard: só entra na revisão espaçada (não conta como pergunta do quiz). */
export function registrarFlashcard(id: string, avaliacao: Autoavaliacao) {
  salvar({ ...estado, revisao: { ...estado.revisao, [id]: aplicarResposta(estado.revisao[id], avaliacao, hoje()) } });
}

export function definirModoLivre(livre: boolean) {
  salvar({ ...estado, livre });
}

export function exportarProgresso() {
  return JSON.stringify(estado, null, 2);
}

export function importarProgresso(json: string) {
  salvar(normalizar(JSON.parse(json)));
}

export function zerarProgresso() {
  salvar(vazio);
}
