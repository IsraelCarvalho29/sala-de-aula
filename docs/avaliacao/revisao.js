// Implementação de referência: correção automática e repetição espaçada (SM-2 adaptado).
// Sem dependências; roda no navegador ou no Node. Datas no formato "AAAA-MM-DD".

const FACILIDADE_INICIAL = 2.5;
const FACILIDADE_MINIMA = 1.3;

/** Normaliza texto para comparação: minúsculas, sem acentos, espaços colapsados. */
export function normalizar(texto) {
  return String(texto)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Corrige uma resposta. Devolve { acerto: 0..1, feedback: string[] }.
 * `resposta` depende do tipo:
 *  multipla_escolha: id | multipla_resposta: [ids] | verdadeiro_falso: boolean
 *  preencher_lacuna / prever_saida: string | ordenar: [ids na ordem do aluno]
 *  resposta_aberta: [índices da rubrica marcados] | codigo: [{passou: boolean}] (resultado do executor)
 */
export function corrigir(questao, resposta) {
  switch (questao.tipo) {
    case 'multipla_escolha': {
      const alt = questao.alternativas.find(a => a.id === resposta);
      return { acerto: alt?.correta ? 1 : 0, feedback: alt ? [alt.feedback] : [] };
    }
    case 'multipla_resposta': {
      // Crédito parcial: acertos menos erros, sobre o total de corretas, com piso 0.
      const marcadas = new Set(resposta);
      const corretas = questao.alternativas.filter(a => a.correta);
      let pontos = 0;
      for (const a of questao.alternativas) {
        if (marcadas.has(a.id)) pontos += a.correta ? 1 : -1;
      }
      const feedback = questao.alternativas
        .filter(a => marcadas.has(a.id) !== a.correta)
        .map(a => a.feedback);
      return { acerto: Math.max(0, pontos) / corretas.length, feedback };
    }
    case 'verdadeiro_falso': {
      const certo = resposta === questao.resposta;
      return { acerto: certo ? 1 : 0, feedback: [resposta ? questao.feedback_verdadeiro : questao.feedback_falso] };
    }
    case 'preencher_lacuna': {
      const certo = questao.aceitas.some(a => normalizar(a) === normalizar(resposta));
      return { acerto: certo ? 1 : 0, feedback: [] };
    }
    case 'prever_saida': {
      const certo = normalizar(resposta) === normalizar(questao.saida_esperada);
      return { acerto: certo ? 1 : 0, feedback: [] };
    }
    case 'ordenar': {
      // Crédito parcial: fração dos itens na posição correta.
      const esperado = questao.itens.map(i => i.id);
      const certos = esperado.filter((id, i) => resposta[i] === id).length;
      return { acerto: certos / esperado.length, feedback: [] };
    }
    case 'resposta_aberta': {
      const soma = resposta.reduce((s, i) => s + (questao.rubrica[i]?.peso ?? 0), 0);
      return { acerto: Math.min(1, soma), feedback: [] };
    }
    case 'codigo': {
      const passaram = resposta.filter(t => t.passou).length;
      return { acerto: passaram / questao.testes.length, feedback: [] };
    }
    default:
      throw new Error(`Tipo não corrigido automaticamente: ${questao.tipo}`);
  }
}

/** Converte o resultado em nota 0..5 do SM-2. */
export function notaDe({ acerto, usouDica = false, tempoS = 0, tempoEstimadoS = 60 }) {
  if (acerto < 0.5) return 1;
  if (acerto < 1 || usouDica) return 3;
  if (tempoS > 2 * tempoEstimadoS) return 4;
  return 5;
}

/** Notas da autoavaliação (flashcard e resposta aberta sem rubrica). */
export const NOTA_AUTOAVALIACAO = { errei: 1, dificil: 3, bom: 4, facil: 5 };

export function estadoInicial(questaoId, hoje) {
  return { questao_id: questaoId, facilidade: FACILIDADE_INICIAL, intervalo_dias: 0, repeticoes: 0, proxima_revisao: hoje, historico: [] };
}

function somarDias(data, dias) {
  const d = new Date(data + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Aplica uma revisão e devolve o novo estado (não altera o original). */
export function revisar(estado, nota, hoje, extra = {}) {
  const e = { ...estado, historico: [...estado.historico, { data: hoje, nota, ...extra }] };
  if (nota < 3) {
    e.repeticoes = 0;
    e.intervalo_dias = 1;
  } else {
    e.repeticoes += 1;
    if (e.repeticoes === 1) e.intervalo_dias = 1;
    else if (e.repeticoes === 2) e.intervalo_dias = 6;
    else e.intervalo_dias = Math.round(e.intervalo_dias * e.facilidade);
  }
  const d = 5 - nota;
  e.facilidade = Math.max(FACILIDADE_MINIMA, e.facilidade + 0.1 - d * (0.08 + d * 0.02));
  e.proxima_revisao = somarDias(hoje, e.intervalo_dias);
  return e;
}

/**
 * Monta a sessão "Revisão do dia": vencidas (mais atrasadas primeiro) + até `novas` inéditas,
 * evitando duas questões seguidas do mesmo tópico quando possível.
 */
export function sessaoDoDia(questoes, estados, hoje, { limite = 20, novas = 5 } = {}) {
  const porId = new Map(questoes.map(q => [q.id, q]));
  const vencidas = Object.values(estados)
    .filter(s => s.proxima_revisao <= hoje && porId.has(s.questao_id))
    .sort((a, b) => a.proxima_revisao.localeCompare(b.proxima_revisao))
    .map(s => porId.get(s.questao_id));
  const ineditas = questoes.filter(q => !estados[q.id])
    .sort((a, b) => a.dificuldade - b.dificuldade)
    .slice(0, novas);
  return intercalar([...vencidas, ...ineditas].slice(0, limite));
}

function intercalar(lista) {
  const resto = [...lista];
  const saida = [];
  while (resto.length) {
    const anterior = saida.at(-1)?.topico;
    const i = resto.findIndex(q => q.topico !== anterior);
    saida.push(resto.splice(i === -1 ? 0 : i, 1)[0]);
  }
  return saida;
}

/** Domínio de um tópico (0..100), ponderado pela dificuldade; inéditas contam como 0. */
export function dominio(questoesDoTopico, estados) {
  let soma = 0, pesos = 0;
  for (const q of questoesDoTopico) {
    const ultima = estados[q.id]?.historico.at(-1)?.nota ?? 0;
    soma += (ultima / 5) * q.dificuldade;
    pesos += q.dificuldade;
  }
  return pesos ? Math.round((soma / pesos) * 100) : 0;
}
