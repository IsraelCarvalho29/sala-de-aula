import { useSyncExternalStore } from 'react';

/** Progresso salvo no navegador (localStorage). Sem login, sem servidor. */
const CHAVE = 'sala-de-aula:progresso:v1';

export interface Progresso {
  concluidas: Record<string, string>; // idAula -> data ISO
  quiz: Record<string, { acertou: boolean; tentativas: number }>; // idAula#n -> resultado
}

const vazio: Progresso = { concluidas: {}, quiz: {} };
let estado: Progresso = carregar();
const ouvintes = new Set<() => void>();

function carregar(): Progresso {
  try {
    return { ...vazio, ...JSON.parse(localStorage.getItem(CHAVE) ?? '{}') };
  } catch {
    return vazio;
  }
}

function salvar(novo: Progresso) {
  estado = novo;
  localStorage.setItem(CHAVE, JSON.stringify(novo));
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

export function registrarResposta(idQuestao: string, acertou: boolean) {
  const anterior = estado.quiz[idQuestao];
  salvar({
    ...estado,
    quiz: {
      ...estado.quiz,
      // guarda se já acertou alguma vez e quantas tentativas fez
      [idQuestao]: { acertou: acertou || !!anterior?.acertou, tentativas: (anterior?.tentativas ?? 0) + 1 },
    },
  });
}

export function exportarProgresso() {
  return JSON.stringify(estado, null, 2);
}

export function importarProgresso(json: string) {
  salvar({ ...vazio, ...JSON.parse(json) });
}

export function zerarProgresso() {
  salvar(vazio);
}
