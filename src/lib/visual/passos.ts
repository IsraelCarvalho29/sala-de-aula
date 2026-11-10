/**
 * Geradores de passos das explicações visuais (bloco ```visual nas aulas).
 *
 * Cada algoritmo roda uma vez e devolve a lista de passos; o componente
 * VisualStep só navega por ela (ver docs/design/prototipo-visual.html).
 * Este arquivo não importa nada para poder ser usado também pelo
 * scripts/validar-aulas.mjs, que confere os blocos das aulas.
 *
 * Texto da narração: **negrito** e `código` são os únicos realces.
 */

export interface Previsao {
  pergunta: string;
  opcoes: string[];
  resposta: string;
  porque: string;
}

/** Cor de estado (tokens --st-*): significado fixo em todas as aulas. */
export type Cor = 'padrao' | 'ativo' | 'compara' | 'descartado' | 'sucesso' | 'erro' | 'pivo';

export interface Ponteiro { nome: string; idx: number }

export interface EstadoPilhaFila { tipo: 'pilha' | 'fila'; itens: string[]; cores: Cor[]; saiu?: string; aviso?: string }
export interface EstadoLista {
  tipo: 'lista';
  nos: { valor: string; cor: Cor; fora?: boolean }[];
  /** setas[i]: o nó i aponta para o i+1 ('pula' = aponta para o i+2) */
  setas: ('sim' | 'nao' | 'pula')[];
  cabeca: number | null;
  ptrs: Ponteiro[];
}
export interface EstadoArray {
  tipo: 'array';
  a: number[];
  cores: Cor[];
  ptrs: Ponteiro[];
  /** linha auxiliar (intercalação do merge sort), alinhada aos índices de a */
  aux?: (number | null)[];
  barras: boolean;
}
export interface EstadoGrafo {
  tipo: 'grafo';
  vertices: { id: string; x: number; y: number; cor: Cor; rotulo?: string }[];
  arestas: { de: string; para: string; destaque: boolean }[];
  dirigido: boolean;
  estrutura: { nome: string; itens: string[] };
}
export type Estado = EstadoPilhaFila | EstadoLista | EstadoArray | EstadoGrafo;

export interface Passo {
  estado: Estado;
  /** chave em Visual.trechos */
  trecho: string;
  /** linha destacada do trecho (-1: nenhuma) */
  linha: number;
  vars: Record<string, string | number>;
  texto: string;
  prever?: Previsao;
}

export interface Campo { chave: string; rotulo: string; valor: string }

export interface Visual {
  tipo: string;
  titulo: string;
  trechos: Record<string, string[]>;
  passos: Passo[];
  legenda: { cor: Cor; nome: string }[];
  /** dados que o aluno pode mudar no cabeçalho */
  campos: Campo[];
  custo?: (p: Passo) => string;
}

export type Config = Record<string, unknown>;

export const TIPOS_VISUAIS = ['pilha', 'fila', 'lista-ligada', 'ordenacao', 'busca-binaria', 'bfs', 'dfs'] as const;
export const ALGORITMOS_ORDENACAO = ['bolha', 'selecao', 'insercao', 'merge', 'quick'] as const;
const MAX_PREVISOES = 3;

/* ------------------------------------------------------------ utilidades */

const texto = (v: unknown) => (v == null ? '' : Array.isArray(v) ? v.join(', ') : String(v));

/** "push 1, push(2), pop" -> [['push','1'], ['push','2'], ['pop','']] */
function lerOperacoes(v: unknown): { nome: string; arg: string }[] {
  const t = texto(v).trim();
  if (!t) throw new Error('informe as operações, por exemplo: push 1, push 2, pop');
  return t.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean).map((s) => {
    const m = /^([\p{L}_][\p{L}\d_]*)\s*(?:\(\s*([^)]*?)\s*\)|\s+(.+))?$/u.exec(s);
    if (!m) throw new Error(`operação não entendida: "${s}"`);
    return { nome: m[1].toLowerCase(), arg: (m[2] ?? m[3] ?? '').trim().replace(/^["']|["']$/g, '') };
  });
}

function lerNumeros(v: unknown, min = 2, max = 12): number[] {
  const partes = texto(v).split(/[\s,;]+/).filter(Boolean);
  const nums = partes.map(Number);
  const ruim = partes.find((p, i) => !Number.isInteger(nums[i]));
  if (ruim) throw new Error(`"${ruim}" não é um número inteiro`);
  if (nums.length < min || nums.length > max) throw new Error(`use de ${min} a ${max} números`);
  if (nums.some((n) => Math.abs(n) > 999)) throw new Error('use números entre -999 e 999');
  return nums;
}

function embaralhar<T>(a: T[], semente: number): T[] {
  // determinístico: a mesma aula mostra as opções na mesma ordem
  const r = [...a];
  let s = semente || 1;
  for (let i = r.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

function opcoes(certa: string | number, outras: (string | number)[], semente: number): string[] {
  const unicas = [...new Set([String(certa), ...outras.map(String)])].slice(0, 4);
  return embaralhar(unicas, semente);
}

const lista = (a: (string | number)[]) => `[${a.join(', ')}]`;

/* ------------------------------------------------------------ pilha e fila */

const TRECHO_PILHA = {
  pilha: [
    'pilha = []',
    'pilha.append(x)   # push',
    'x = pilha.pop()   # pop',
    'x = pilha[-1]     # peek',
    'len(pilha) == 0   # vazia?',
  ],
};
const TRECHO_FILA = {
  fila: [
    'from collections import deque',
    'fila = deque()',
    'fila.append(x)      # enqueue',
    'x = fila.popleft()  # dequeue',
    'x = fila[0]         # frente',
    'len(fila) == 0      # vazia?',
  ],
};

function pilhaOuFila(cfg: Config, tipo: 'pilha' | 'fila'): Visual {
  const ops = lerOperacoes(cfg.operacoes);
  const ehPilha = tipo === 'pilha';
  const nomes = ehPilha
    ? { entra: ['push', 'empilhar', 'append'], sai: ['pop', 'desempilhar'], olha: ['peek', 'topo'], vazia: ['vazia', 'is_empty', 'empty'] }
    : { entra: ['enqueue', 'enfileirar', 'append', 'entrar'], sai: ['dequeue', 'desenfileirar', 'popleft', 'sair'], olha: ['frente', 'peek', 'front'], vazia: ['vazia', 'is_empty', 'empty'] };
  const itens: string[] = [];
  const passos: Passo[] = [];
  let previsoes = 0;
  const ponta = () => (ehPilha ? itens.length - 1 : 0);
  const cores = (destaque?: number, cor: Cor = 'ativo'): Cor[] => itens.map((_, i) => (i === destaque ? cor : 'padrao'));
  const vars = () => ({ [tipo]: lista(itens), tamanho: itens.length });
  const add = (linha: number, texto: string, extra: Partial<EstadoPilhaFila> = {}, prever?: Previsao, destaque?: number, cor?: Cor) =>
    passos.push({ estado: { tipo, itens: [...itens], cores: cores(destaque, cor), ...extra }, trecho: tipo, linha: ehPilha ? linha : linha + 1, vars: vars(), texto, prever });

  add(0, ehPilha ? 'Começamos com a **pilha vazia**. Só mexemos numa ponta: o **topo**.' : 'Começamos com a **fila vazia**. Entra no **fim**, sai do **início**, como uma fila de banco.');
  ops.forEach((op, k) => {
    if (nomes.entra.includes(op.nome)) {
      if (!op.arg) throw new Error(`${op.nome} precisa de um valor, por exemplo: ${op.nome} 5`);
      if (itens.length >= 8) throw new Error('a visualização mostra no máximo 8 itens');
      itens.push(op.arg);
      add(1, ehPilha
        ? `\`push(${op.arg})\`: o ${op.arg} entra **em cima** de tudo e vira o novo topo. Custo O(1).`
        : `\`enqueue(${op.arg})\`: o ${op.arg} entra no **fim** da fila, atrás de quem já estava. Custo O(1).`,
      {}, undefined, itens.length - 1);
    } else if (nomes.sai.includes(op.nome) || nomes.olha.includes(op.nome)) {
      const sai = nomes.sai.includes(op.nome);
      const linha = sai ? 2 : 3;
      if (!itens.length) {
        add(linha, `\`${op.nome}()\` com a ${tipo} **vazia** é um erro (em Python, \`IndexError\`). Sempre confira se está vazia antes.`, { aviso: `${op.nome}() em ${tipo} vazia` });
        return;
      }
      const alvo = itens[ponta()];
      let prever: Previsao | undefined;
      if (sai && itens.length >= 2 && previsoes < MAX_PREVISOES) {
        previsoes++;
        const outra = itens[ehPilha ? 0 : itens.length - 1];
        prever = {
          pergunta: `Qual valor sai com \`${op.nome}()\`?`,
          opcoes: opcoes(alvo, [outra, ...itens], k + 7),
          resposta: alvo,
          porque: ehPilha ? `Na pilha sai sempre o **último** que entrou (LIFO): o ${alvo}, que está no topo.` : `Na fila sai sempre o **primeiro** que entrou (FIFO): o ${alvo}, que está no início.`,
        };
      }
      add(linha, sai
        ? `Agora \`${op.nome}()\`. Ele só olha ${ehPilha ? 'o **topo**' : 'o **início**'}, sem percorrer nada.`
        : `\`${op.nome}()\` só **olha** ${ehPilha ? 'o topo' : 'o início'}: é o ${alvo}, e ele continua lá.`,
      {}, prever, ponta(), sai ? 'ativo' : 'compara');
      if (sai) {
        itens.splice(ponta(), 1);
        add(linha, ehPilha
          ? `Saiu o **${alvo}**. O topo agora é ${itens.length ? `o ${itens[itens.length - 1]}` : 'nada: a pilha ficou vazia'}.`
          : `Saiu o **${alvo}**. ${itens.length ? `O ${itens[0]} passou a ser o primeiro da fila.` : 'A fila ficou vazia.'}`,
        { saiu: alvo });
      }
    } else if (nomes.vazia.includes(op.nome)) {
      add(4, `Está vazia? **${itens.length ? 'Não' : 'Sim'}**, tem ${itens.length} item(ns).`);
    } else {
      throw new Error(`operação desconhecida para ${tipo}: "${op.nome}". Use ${[nomes.entra[0], nomes.sai[0], nomes.olha[0], 'vazia'].join(', ')}`);
    }
  });
  add(-1, `Fim. Ordem final, ${ehPilha ? 'de baixo para o topo' : 'do início para o fim'}: ${lista(itens)}.`);
  return {
    tipo,
    titulo: ehPilha ? 'Pilha passo a passo (LIFO)' : 'Fila passo a passo (FIFO)',
    trechos: ehPilha ? TRECHO_PILHA : TRECHO_FILA,
    passos,
    legenda: [{ cor: 'padrao', nome: 'guardado' }, { cor: 'ativo', nome: ehPilha ? 'topo em uso' : 'ponta em uso' }, { cor: 'compara', nome: 'só olhando' }],
    campos: [{ chave: 'operacoes', rotulo: 'Operações', valor: ops.map((o) => (o.arg ? `${o.nome} ${o.arg}` : o.nome)).join(', ') }],
  };
}

/* ------------------------------------------------------------ lista ligada */

const TRECHOS_LISTA: Record<string, string[]> = {
  inicio: ['novo = No(x)', 'novo.prox = cabeca', 'cabeca = novo'],
  fim: ['novo = No(x)', 'if cabeca is None: cabeca = novo', 'atual = cabeca', 'while atual.prox is not None:', '    atual = atual.prox', 'atual.prox = novo'],
  buscar: ['atual = cabeca', 'while atual is not None:', '    if atual.valor == x: return atual', '    atual = atual.prox', 'return None'],
  remover: ['if cabeca.valor == x: cabeca = cabeca.prox', 'anterior, atual = cabeca, cabeca.prox', 'while atual is not None:', '    if atual.valor == x:', '        anterior.prox = atual.prox', '    anterior, atual = atual, atual.prox', 'return  # não achou'],
};

function listaLigada(cfg: Config): Visual {
  const valores = texto(cfg.valores).split(/[\s,;]+/).filter(Boolean);
  if (valores.length > 6) throw new Error('comece com no máximo 6 nós');
  const ops = lerOperacoes(cfg.operacoes);
  let nos: string[] = [...valores];
  const passos: Passo[] = [];
  let previsoes = 0;
  const base = (): EstadoLista => ({
    tipo: 'lista',
    nos: nos.map((v) => ({ valor: v, cor: 'padrao' as Cor })),
    setas: nos.map((_, i) => (i < nos.length - 1 ? 'sim' : 'nao')),
    cabeca: nos.length ? 0 : null,
    ptrs: [],
  });
  const add = (trecho: string, linha: number, texto: string, mudar?: (e: EstadoLista) => void, vars: Record<string, string | number> = {}, prever?: Previsao) => {
    const e = base();
    mudar?.(e);
    passos.push({ estado: e, trecho, linha, vars: { lista: nos.length ? nos.join(' → ') + ' → None' : 'None', ...vars }, texto, prever });
  };
  add('inicio', -1, nos.length
    ? `Uma lista ligada com ${nos.length} nós. Cada nó guarda um **valor** e uma seta **prox** para o próximo; o último aponta para \`None\`. Só sabemos onde está a **cabeça**.`
    : 'Uma lista ligada **vazia**: a cabeça é `None`.');

  ops.forEach((op, k) => {
    const x = op.arg;
    const precisa = () => { if (!x) throw new Error(`${op.nome} precisa de um valor, por exemplo: ${op.nome} 7`); };
    if (['inserir_inicio', 'inicio', 'push_front', 'prepend'].includes(op.nome)) {
      precisa();
      if (nos.length >= 8) throw new Error('a visualização mostra no máximo 8 nós');
      add('inicio', 0, `Inserir **${x}** no início. Primeiro criamos o nó novo, ainda solto.`, (e) => {
        e.nos.unshift({ valor: x, cor: 'ativo' }); e.setas.unshift('nao'); e.cabeca = nos.length ? 1 : null;
      }, { x });
      add('inicio', 1, `O nó novo aponta para a **antiga cabeça**${nos.length ? ` (o ${nos[0]})` : ' (`None`)'}. Ninguém foi movido de lugar.`, (e) => {
        e.nos.unshift({ valor: x, cor: 'ativo' }); e.setas.unshift(nos.length ? 'sim' : 'nao'); e.cabeca = nos.length ? 1 : null;
      }, { x });
      nos = [x, ...nos];
      add('inicio', 2, `A cabeça passa a ser o nó novo. Pronto: **O(1)**, não importa o tamanho da lista.`, (e) => { e.nos[0].cor = 'sucesso'; }, { x });
    } else if (['inserir_fim', 'fim', 'append', 'push_back'].includes(op.nome)) {
      precisa();
      if (nos.length >= 8) throw new Error('a visualização mostra no máximo 8 nós');
      if (!nos.length) {
        nos = [x];
        add('fim', 1, `A lista estava vazia, então o nó **${x}** vira a cabeça.`, (e) => { e.nos[0].cor = 'sucesso'; }, { x });
        return;
      }
      add('fim', 2, `Inserir **${x}** no fim. Sem ponteiro para a cauda, precisamos **andar desde a cabeça** até o último nó.`, (e) => {
        e.ptrs = [{ nome: 'atual', idx: 0 }]; e.nos[0].cor = 'ativo';
      }, { x, atual: nos[0] });
      for (let i = 1; i < nos.length; i++) {
        let prever: Previsao | undefined;
        if (i === 1 && nos.length >= 3 && previsoes < MAX_PREVISOES) {
          previsoes++;
          prever = { pergunta: `Quantos passos (\`atual = atual.prox\`) faltam para chegar ao último nó?`, opcoes: opcoes(nos.length - 2, [nos.length - 1, 1, nos.length], k + 3), resposta: String(nos.length - 2), porque: `Já demos 1 passo; são ${nos.length - 1} no total para ${nos.length} nós. Por isso inserir no fim custa **O(n)**.` };
        }
        add('fim', 4, `\`atual.prox\` não é \`None\`, então avançamos: \`atual\` vai para o **${nos[i]}**.`, (e) => {
          e.ptrs = [{ nome: 'atual', idx: i }]; e.nos[i].cor = 'ativo'; for (let j = 0; j < i; j++) e.nos[j].cor = 'descartado';
        }, { x, atual: nos[i] }, prever);
      }
      const ult = nos.length - 1;
      add('fim', 0, `\`atual.prox\` é \`None\`: chegamos ao último. Criamos o nó **${x}**.`, (e) => {
        e.nos.push({ valor: x, cor: 'ativo' }); e.setas.push('nao'); e.ptrs = [{ nome: 'atual', idx: ult }]; e.nos[ult].cor = 'compara';
      }, { x, atual: nos[ult] });
      nos = [...nos, x];
      add('fim', 5, `\`atual.prox = novo\`: o antigo último aponta para o ${x}. Foram ${ult} passos até aqui: **O(n)**.`, (e) => { e.nos[nos.length - 1].cor = 'sucesso'; e.ptrs = [{ nome: 'atual', idx: ult }]; }, { x, atual: nos[ult] });
    } else if (['buscar', 'busca', 'procurar', 'find'].includes(op.nome)) {
      precisa();
      add('buscar', 0, `Buscar **${x}**. Não dá para pular para o meio: começamos pela cabeça.`, (e) => { if (nos.length) e.ptrs = [{ nome: 'atual', idx: 0 }]; }, { x, atual: nos[0] ?? 'None' });
      for (let i = 0; i < nos.length; i++) {
        const achou = nos[i] === x;
        add('buscar', 2, achou ? `\`atual.valor\` é ${x}: **encontrado** depois de olhar ${i + 1} nó(s).` : `${nos[i]} ≠ ${x}. Seguimos a seta.`, (e) => {
          e.ptrs = [{ nome: 'atual', idx: i }]; e.nos[i].cor = achou ? 'sucesso' : 'ativo'; for (let j = 0; j < i; j++) e.nos[j].cor = 'descartado';
        }, { x, atual: nos[i] });
        if (achou) return;
      }
      add('buscar', 4, `\`atual\` virou \`None\`: passamos por todos os ${nos.length} nós e o ${x} **não está** na lista. Busca é **O(n)**.`, (e) => { e.nos.forEach((n) => (n.cor = 'descartado')); }, { x, atual: 'None' });
    } else if (['remover', 'remove', 'apagar', 'delete'].includes(op.nome)) {
      precisa();
      if (!nos.length) { add('remover', -1, 'A lista está vazia: não há o que remover.'); return; }
      if (nos[0] === x) {
        add('remover', 0, `O ${x} está na **cabeça**. Basta a cabeça pular para o próximo.`, (e) => { e.nos[0].cor = 'erro'; }, { x });
        add('remover', 0, `\`cabeca = cabeca.prox\`. O nó ${x} ficou sem ninguém apontando para ele e o coletor de lixo o apaga. **O(1)**.`, (e) => {
          e.nos[0] = { valor: x, cor: 'descartado', fora: true }; e.cabeca = nos.length > 1 ? 1 : null;
        }, { x });
        nos = nos.slice(1);
        add('remover', -1, `Lista depois de remover o ${x}.`);
        return;
      }
      for (let i = 1; i < nos.length; i++) {
        let prever: Previsao | undefined;
        const achou = nos[i] === x;
        if (achou && previsoes < MAX_PREVISOES) {
          previsoes++;
          const dep = nos[i + 1] ?? 'None';
          prever = { pergunta: `Achamos o ${x}. Para tirá-lo, \`anterior.prox\` (o ${nos[i - 1]}) deve apontar para quem?`, opcoes: opcoes(dep, [x, nos[0], 'None'], k + 11), resposta: dep, porque: `O ${nos[i - 1]} passa a apontar para o **sucessor** do ${x} (\`atual.prox\`, que é ${dep}). Assim a lista "pula" o ${x}.` };
        }
        add('remover', achou ? 3 : 5, achou ? `\`atual\` tem o valor ${x}. Precisamos do **anterior** (o ${nos[i - 1]}) para religar a lista.` : `${nos[i]} ≠ ${x}: \`anterior\` e \`atual\` andam juntos uma casa.`, (e) => {
          e.ptrs = [{ nome: 'anterior', idx: i - 1 }, { nome: 'atual', idx: i }]; e.nos[i].cor = achou ? 'erro' : 'ativo'; e.nos[i - 1].cor = 'compara';
        }, { x, anterior: nos[i - 1], atual: nos[i] }, prever);
        if (achou) {
          add('remover', 4, `\`anterior.prox = atual.prox\`: o ${nos[i - 1]} agora aponta direto para ${nos[i + 1] ?? '`None`'}. O ${x} saiu do caminho.`, (e) => {
            e.nos[i] = { valor: x, cor: 'descartado', fora: true }; e.setas[i - 1] = i + 1 < nos.length ? 'pula' : 'nao'; e.nos[i - 1].cor = 'compara';
          }, { x });
          nos = nos.filter((_, j) => j !== i);
          add('remover', -1, `Lista depois de remover o ${x}. Achar o nó custou O(n); religar as setas, O(1).`);
          return;
        }
      }
      add('remover', 6, `Chegamos ao fim sem achar o ${x}: a lista não muda.`, (e) => { e.nos.forEach((n) => (n.cor = 'descartado')); }, { x });
    } else {
      throw new Error(`operação desconhecida para lista ligada: "${op.nome}". Use inserir_inicio, inserir_fim, buscar ou remover`);
    }
  });
  return {
    tipo: 'lista-ligada',
    titulo: 'Lista ligada passo a passo',
    trechos: TRECHOS_LISTA,
    passos,
    legenda: [{ cor: 'ativo', nome: 'nó atual' }, { cor: 'compara', nome: 'anterior' }, { cor: 'descartado', nome: 'já visitado' }, { cor: 'sucesso', nome: 'resultado' }, { cor: 'erro', nome: 'a remover' }],
    campos: [
      { chave: 'valores', rotulo: 'Lista inicial', valor: valores.join(', ') },
      { chave: 'operacoes', rotulo: 'Operações', valor: ops.map((o) => (o.arg ? `${o.nome} ${o.arg}` : o.nome)).join(', ') },
    ],
  };
}

/* ------------------------------------------------------------ ordenação */

const TRECHOS_ORDENACAO: Record<string, string[]> = {
  bolha: [
    'for i in range(n - 1):',
    '    for j in range(n - 1 - i):',
    '        if a[j] > a[j + 1]:',
    '            a[j], a[j + 1] = a[j + 1], a[j]',
    '    # a[n-1-i] já está no lugar certo',
  ],
  selecao: [
    'for i in range(n - 1):',
    '    menor = i',
    '    for j in range(i + 1, n):',
    '        if a[j] < a[menor]: menor = j',
    '    a[i], a[menor] = a[menor], a[i]',
  ],
  insercao: [
    'for i in range(1, n):',
    '    chave = a[i]',
    '    j = i - 1',
    '    while j >= 0 and a[j] > chave:',
    '        a[j + 1] = a[j]',
    '        j -= 1',
    '    a[j + 1] = chave',
  ],
  merge: [
    'def merge_sort(a, lo, hi):',
    '    if lo >= hi: return',
    '    meio = (lo + hi) // 2',
    '    merge_sort(a, lo, meio)',
    '    merge_sort(a, meio + 1, hi)',
    '    # intercala as duas metades:',
    '    if a[i] <= a[j]: pega a[i]',
    '    else: pega a[j]',
    '    a[lo:hi + 1] = resultado',
  ],
  quick: [
    'def quick_sort(a, lo, hi):',
    '    if lo >= hi: return',
    '    pivo = a[hi]; i = lo',
    '    for j in range(lo, hi):',
    '        if a[j] < pivo:',
    '            a[i], a[j] = a[j], a[i]; i += 1',
    '    a[i], a[hi] = a[hi], a[i]',
    '    quick_sort(a, lo, i - 1)',
    '    quick_sort(a, i + 1, hi)',
  ],
};

const NOMES_ORDENACAO: Record<string, string> = { bolha: 'Bubble sort', selecao: 'Selection sort', insercao: 'Insertion sort', merge: 'Merge sort', quick: 'Quick sort' };

function ordenacao(cfg: Config): Visual {
  const alg = texto(cfg.algoritmo || 'bolha').toLowerCase().replace(/[_ -]?sort$/, '').replace('bubble', 'bolha').replace('selection', 'selecao').replace('insertion', 'insercao');
  if (!(ALGORITMOS_ORDENACAO as readonly string[]).includes(alg)) throw new Error(`algoritmo desconhecido: "${alg}". Use ${ALGORITMOS_ORDENACAO.join(', ')}`);
  const a = lerNumeros(cfg.valores ?? '5, 2, 4, 1, 3', 2, 10);
  const n = a.length;
  const passos: Passo[] = [];
  const fixo = new Set<number>();
  let comps = 0, trocas = 0, previsoes = 0;
  const add = (linha: number, txt: string, cores: Record<number, Cor> = {}, extra: { ptrs?: Ponteiro[]; aux?: (number | null)[]; vars?: Record<string, string | number>; prever?: Previsao; faixa?: [number, number] } = {}) => {
    const c: Cor[] = a.map((_, i) => cores[i] ?? (fixo.has(i) ? 'sucesso' : extra.faixa && (i < extra.faixa[0] || i > extra.faixa[1]) ? 'descartado' : 'padrao'));
    passos.push({
      estado: { tipo: 'array', a: [...a], cores: c, ptrs: extra.ptrs ?? [], aux: extra.aux ? [...extra.aux] : undefined, barras: true },
      trecho: alg, linha, vars: { comparações: comps, ...(alg === 'merge' ? {} : { [alg === 'insercao' ? 'deslocamentos' : 'trocas']: trocas }), ...extra.vars }, texto: txt, prever: extra.prever,
    });
  };
  const podePrever = () => previsoes < MAX_PREVISOES && (previsoes++, true);
  const trocar = (i: number, j: number) => { [a[i], a[j]] = [a[j], a[i]]; if (i !== j) trocas++; };

  add(-1, `Vamos ordenar ${lista(a)} com **${NOMES_ORDENACAO[alg]}**. A altura da barra é o valor.`);

  if (alg === 'bolha') {
    for (let i = 0; i < n - 1; i++) {
      let trocou = false;
      for (let j = 0; j < n - 1 - i; j++) {
        comps++;
        const vai = a[j] > a[j + 1];
        const prever = j <= 1 && i === 0 && podePrever()
          ? { pergunta: `a[${j}] = ${a[j]} e a[${j + 1}] = ${a[j + 1]}. Eles vão trocar de lugar?`, opcoes: ['Sim', 'Não'], resposta: vai ? 'Sim' : 'Não', porque: vai ? `${a[j]} > ${a[j + 1]}: o maior vai para a direita.` : `${a[j]} ≤ ${a[j + 1]}: já estão na ordem certa, nada muda.` }
          : undefined;
        add(2, `Comparamos os vizinhos a[${j}] = ${a[j]} e a[${j + 1}] = ${a[j + 1]}.`, { [j]: 'ativo', [j + 1]: 'compara' }, { ptrs: [{ nome: 'j', idx: j }], vars: { i, j }, prever });
        if (vai) {
          trocar(j, j + 1); trocou = true;
          add(3, `${a[j + 1]} > ${a[j]}, então **trocamos**. O maior vai "borbulhando" para a direita.`, { [j]: 'compara', [j + 1]: 'ativo' }, { ptrs: [{ nome: 'j', idx: j }], vars: { i, j } });
        }
      }
      fixo.add(n - 1 - i);
      add(4, `Fim da rodada ${i + 1}: o **${a[n - 1 - i]}** chegou à posição final ${n - 1 - i}.`, {}, { vars: { i } });
      if (!trocou) {
        for (let k = 0; k < n; k++) fixo.add(k);
        add(-1, `Nenhuma troca nesta rodada: o array **já está ordenado** e podemos parar cedo.`);
        break;
      }
    }
  } else if (alg === 'selecao') {
    for (let i = 0; i < n - 1; i++) {
      let menor = i;
      const resto = a.slice(i);
      const minimo = Math.min(...resto);
      const prever = podePrever() && i < 2
        ? { pergunta: `Qual valor vai parar na posição ${i}?`, opcoes: opcoes(minimo, resto, i + 5), resposta: String(minimo), porque: `O selection sort sempre escolhe o **menor do resto** (${lista(resto)}), que é ${minimo}.` }
        : undefined;
      add(1, `Rodada ${i + 1}: procurar o menor entre os índices ${i} e ${n - 1}. Começamos supondo que é a[${i}] = ${a[i]}.`, { [i]: 'pivo' }, { ptrs: [{ nome: 'menor', idx: i }], vars: { i, menor }, prever });
      for (let j = i + 1; j < n; j++) {
        comps++;
        const novo = a[j] < a[menor];
        add(3, novo ? `a[${j}] = ${a[j]} é menor que ${a[menor]}: **novo menor**.` : `a[${j}] = ${a[j]} não é menor que ${a[menor]}.`, { [menor]: 'pivo', [j]: 'compara' }, { ptrs: [{ nome: 'menor', idx: menor }, { nome: 'j', idx: j }], vars: { i, j, menor } });
        if (novo) menor = j;
      }
      const m = menor;
      trocar(i, m);
      fixo.add(i);
      add(4, m === i ? `O menor já estava na posição ${i}. Nada a trocar.` : `Trocamos a[${i}] com a[${m}]: o **${a[i]}** vai para a posição ${i}, que fica pronta.`, { [m]: m === i ? 'sucesso' : 'compara' }, { vars: { i, menor: m } });
    }
    fixo.add(n - 1);
    add(-1, `O último elemento sobrou no lugar certo. Sempre ${n * (n - 1) / 2} comparações: O(n²), mesmo se já estivesse ordenado.`);
  } else if (alg === 'insercao') {
    fixo.add(0);
    add(-1, 'O primeiro elemento sozinho já é uma parte **ordenada** (em verde).');
    for (let i = 1; i < n; i++) {
      const chave = a[i];
      let alvo = i;
      while (alvo > 0 && a[alvo - 1] > chave) alvo--;
      const prever = alvo < i - 1 && podePrever()
        ? { pergunta: `Em que índice a chave ${chave} vai ser encaixada?`, opcoes: opcoes(alvo, [i, alvo + 1, Math.max(0, alvo - 1), 0], i + 2), resposta: String(alvo), porque: `Todos os valores maiores que ${chave} na parte ordenada andam uma casa para a direita; o ${chave} cai no índice ${alvo}.` }
        : undefined;
      add(1, `Pegamos a **chave = ${chave}** (índice ${i}) para encaixar na parte ordenada à esquerda.`, { [i]: 'ativo' }, { ptrs: [{ nome: 'i', idx: i }], vars: { i, chave }, prever });
      let j = i - 1;
      while (j >= 0) {
        comps++;
        if (a[j] <= chave) {
          add(3, `a[${j}] = ${a[j]} ≤ ${chave}: paramos de empurrar.`, { [j]: 'compara' }, { ptrs: [{ nome: 'j', idx: j }], vars: { i, j, chave } });
          break;
        }
        a[j + 1] = a[j];
        trocas++;
        add(4, `a[${j}] = ${a[j]} > ${chave}: empurramos o ${a[j]} uma casa para a direita.`, { [j + 1]: 'compara', [j]: 'ativo' }, { ptrs: [{ nome: 'j', idx: j }], vars: { i, j, chave } });
        j--;
      }
      a[j + 1] = chave;
      for (let k = 0; k <= i; k++) fixo.add(k);
      add(6, `Colocamos a chave ${chave} no índice ${j + 1}. Os índices 0 a ${i} estão ordenados.`, { [j + 1]: 'ativo' }, { vars: { i, chave } });
    }
  } else if (alg === 'merge') {
    const ordena = (lo: number, hi: number, nivel: number) => {
      if (hi - lo < 1) return;
      const meio = (lo + hi) >> 1;
      add(2, `Dividimos a[${lo}..${hi}] ao meio: a[${lo}..${meio}] e a[${meio + 1}..${hi}].`, {}, { faixa: [lo, hi], ptrs: [{ nome: 'lo', idx: lo }, { nome: 'meio', idx: meio }, { nome: 'hi', idx: hi }], vars: { lo, meio, hi } });
      ordena(lo, meio, nivel + 1);
      ordena(meio + 1, hi, nivel + 1);
      const aux: (number | null)[] = a.map(() => null);
      let i = lo, j = meio + 1, k = lo;
      add(5, `As duas metades já estão ordenadas: ${lista(a.slice(lo, meio + 1))} e ${lista(a.slice(meio + 1, hi + 1))}. Agora **intercalamos**.`, {}, { faixa: [lo, hi], aux, vars: { lo, meio, hi } });
      while (i <= meio || j <= hi) {
        const daEsquerda = j > hi || (i <= meio && a[i] <= a[j]);
        let prever: Previsao | undefined;
        if (i <= meio && j <= hi) {
          comps++;
          if (k === lo && hi - lo >= 3 && podePrever()) {
            const menor = Math.min(a[i], a[j]);
            prever = { pergunta: `Qual valor entra primeiro no resultado?`, opcoes: opcoes(menor, [a[i], a[j], a[hi]], lo + hi), resposta: String(menor), porque: `Comparamos só as **frentes** das metades (${a[i]} e ${a[j]}) e pegamos a menor: ${menor}.` };
          }
        }
        const v = daEsquerda ? a[i] : a[j];
        const cores: Record<number, Cor> = {};
        if (i <= meio) cores[i] = 'ativo';
        if (j <= hi) cores[j] = 'compara';
        add(daEsquerda ? 6 : 7, i <= meio && j <= hi ? `Frentes: ${a[i]} (esquerda) e ${a[j]} (direita). O menor, **${v}**, vai para o resultado.` : `Um lado acabou: copiamos o ${v} que sobrou ${daEsquerda ? 'na esquerda' : 'na direita'}.`, cores, { faixa: [lo, hi], aux, ptrs: [...(i <= meio ? [{ nome: 'i', idx: i }] : []), ...(j <= hi ? [{ nome: 'j', idx: j }] : [])], vars: { lo, meio, hi }, prever });
        aux[k++] = v;
        if (daEsquerda) i++; else j++;
      }
      for (let t = lo; t <= hi; t++) a[t] = aux[t]!;
      const cores: Record<number, Cor> = {};
      for (let t = lo; t <= hi; t++) cores[t] = 'sucesso';
      if (lo === 0 && hi === n - 1) for (let t = 0; t < n; t++) fixo.add(t);
      add(8, `Copiamos o resultado de volta: a[${lo}..${hi}] = ${lista(a.slice(lo, hi + 1))} está ordenado.`, cores, { faixa: [lo, hi], vars: { lo, meio, hi } });
    };
    ordena(0, n - 1, 0);
  } else {
    const ordena = (lo: number, hi: number) => {
      if (lo >= hi) { if (lo === hi) { fixo.add(lo); } return; }
      const pivo = a[hi];
      const final = lo + a.slice(lo, hi).filter((v) => v < pivo).length;
      const prever = hi - lo >= 3 && podePrever()
        ? { pergunta: `O pivô é ${pivo}. Em que índice ele vai terminar?`, opcoes: opcoes(final, [hi, lo, (lo + hi) >> 1, final + 1], lo + hi + 1), resposta: String(final), porque: `Há ${final - lo} valor(es) menor(es) que ${pivo} entre os índices ${lo} e ${hi - 1}; eles ficam à esquerda, então o pivô cai no índice ${final}.` }
        : undefined;
      let i = lo;
      add(2, `Particionar a[${lo}..${hi}]. O **pivô** é o último: ${pivo}. Quem for menor que ele vai para a esquerda.`, { [hi]: 'pivo' }, { faixa: [lo, hi], ptrs: [{ nome: 'i', idx: lo }], vars: { lo, hi, pivo, i }, prever });
      for (let j = lo; j < hi; j++) {
        comps++;
        const menor = a[j] < pivo;
        add(4, menor ? `a[${j}] = ${a[j]} < ${pivo}: vai para a região dos menores (posição i = ${i}).` : `a[${j}] = ${a[j]} ≥ ${pivo}: fica onde está.`, { [hi]: 'pivo', [j]: menor ? 'ativo' : 'compara' }, { faixa: [lo, hi], ptrs: [{ nome: 'i', idx: i }, { nome: 'j', idx: j }], vars: { lo, hi, pivo, i, j } });
        if (menor) {
          if (i !== j) {
            trocar(i, j);
            add(5, `Trocamos a[${i}] e a[${j}]. Agora os índices ${lo} a ${i} têm só valores menores que ${pivo}.`, { [hi]: 'pivo', [i]: 'ativo', [j]: 'compara' }, { faixa: [lo, hi], ptrs: [{ nome: 'i', idx: i }, { nome: 'j', idx: j }], vars: { lo, hi, pivo, i, j } });
          }
          i++;
        }
      }
      trocar(i, hi);
      fixo.add(i);
      add(6, `O pivô ${pivo} vai para o índice ${i}: menores à esquerda, maiores à direita. Ele está **no lugar final**.`, {}, { faixa: [lo, hi], vars: { lo, hi, pivo, i } });
      ordena(lo, i - 1);
      ordena(i + 1, hi);
    };
    ordena(0, n - 1);
  }
  for (let k = 0; k < n; k++) fixo.add(k);
  const movimentos = alg === 'merge' ? '' : ` e ${trocas} ${alg === 'insercao' ? 'deslocamentos' : 'trocas'}`;
  add(-1, `Ordenado: ${lista(a)}. Foram **${comps} comparações**${movimentos} para n = ${n}.`);
  return {
    tipo: 'ordenacao',
    titulo: `${NOMES_ORDENACAO[alg]} passo a passo`,
    trechos: TRECHOS_ORDENACAO,
    passos,
    legenda: [
      { cor: 'ativo', nome: alg === 'insercao' ? 'chave' : 'em foco' },
      { cor: 'compara', nome: 'comparando' },
      ...(alg === 'quick' || alg === 'selecao' ? [{ cor: 'pivo' as Cor, nome: alg === 'quick' ? 'pivô' : 'menor até agora' }] : []),
      ...(alg === 'merge' || alg === 'quick' ? [{ cor: 'descartado' as Cor, nome: 'fora do trecho' }] : []),
      { cor: 'sucesso', nome: alg === 'merge' ? 'trecho ordenado' : 'no lugar final' },
    ],
    campos: [{ chave: 'valores', rotulo: 'Valores', valor: (cfg.valores != null ? lerNumeros(cfg.valores, 2, 10) : [5, 2, 4, 1, 3]).join(', ') }],
  };
}

/* ------------------------------------------------------------ busca binária */

function buscaBinaria(cfg: Config): Visual {
  const a = lerNumeros(cfg.valores ?? '3, 8, 12, 17, 23, 31, 38, 42, 56, 61, 77, 90', 1, 16);
  if (a.some((v, i) => i > 0 && v < a[i - 1])) throw new Error('a busca binária precisa de valores em ordem crescente');
  const alvo = Number(cfg.alvo ?? a[Math.floor(a.length * 0.75)]);
  if (!Number.isInteger(alvo)) throw new Error('o alvo precisa ser um número inteiro');
  const passos: Passo[] = [];
  let lo = 0, hi = a.length - 1, cmp = 0, previsoes = 0;
  const add = (linha: number, txt: string, mid?: number, achou = false, prever?: Previsao) => {
    const cores: Cor[] = a.map((_, i) => (achou && i === mid ? 'sucesso' : i === mid ? 'ativo' : i < lo || i > hi ? 'descartado' : 'padrao'));
    const ptrs: Ponteiro[] = [];
    if (lo <= hi) ptrs.push({ nome: 'ini', idx: lo });
    if (mid != null) ptrs.push({ nome: 'meio', idx: mid });
    if (lo <= hi) ptrs.push({ nome: 'fim', idx: hi });
    passos.push({ estado: { tipo: 'array', a: [...a], cores, ptrs, barras: false }, trecho: 'busca', linha, vars: { ini: lo, fim: hi, ...(mid != null ? { meio: mid } : {}), x: alvo, comparações: cmp }, texto: txt, prever });
  };
  add(0, `O array está **ordenado**. Começamos com o intervalo inteiro: ini = 0 e fim = ${hi}. Procuramos **${alvo}**.`);
  while (lo <= hi) {
    add(1, `ini (${lo}) ≤ fim (${hi}): ainda há onde procurar.`);
    const mid = (lo + hi) >> 1;
    add(2, `O meio do intervalo é (${lo} + ${hi}) // 2 = **${mid}**.`, mid);
    cmp++;
    if (a[mid] === alvo) { add(3, `lista[${mid}] = ${a[mid]} é o alvo. **Encontrado** com ${cmp} comparação(ões), sem olhar o array todo.`, mid, true); break; }
    const direita = a[mid] < alvo;
    const nlo = direita ? mid + 1 : lo, nhi = direita ? hi : mid - 1;
    const nmid = nlo <= nhi ? (nlo + nhi) >> 1 : null;
    const prever = nmid != null && previsoes < 2
      ? (previsoes++, { pergunta: `lista[${mid}] = ${a[mid]} é ${direita ? 'menor' : 'maior'} que ${alvo}. Qual índice será o próximo meio?`, opcoes: opcoes(nmid, [mid, nmid + 1, Math.max(0, nmid - 1)], mid + 3), resposta: String(nmid), porque: `Descartamos ${direita ? `tudo até ${mid}, então ini = ${nlo}` : `tudo a partir de ${mid}, então fim = ${nhi}`} e o novo meio é (${nlo} + ${nhi}) // 2 = ${nmid}.` })
      : undefined;
    add(direita ? 4 : 5, direita ? `lista[${mid}] = ${a[mid]} < ${alvo}. Como o array é ordenado, o alvo só pode estar **à direita**: ini = ${nlo}.` : `lista[${mid}] = ${a[mid]} > ${alvo}. O alvo só pode estar **à esquerda**: fim = ${nhi}.`, mid, false, prever);
    lo = nlo; hi = nhi;
  }
  if (lo > hi) add(6, `ini (${lo}) passou de fim (${hi}): o intervalo ficou vazio, então **${alvo} não está no array**. Foram só ${cmp} comparações.`);
  const n = a.length;
  return {
    tipo: 'busca-binaria',
    titulo: 'Busca binária passo a passo',
    trechos: { busca: ['ini, fim = 0, len(lista) - 1', 'while ini <= fim:', '    meio = (ini + fim) // 2', '    if lista[meio] == x: return meio', '    if lista[meio] < x: ini = meio + 1', '    else: fim = meio - 1', 'return -1'] },
    passos,
    legenda: [{ cor: 'padrao', nome: 'no intervalo' }, { cor: 'ativo', nome: 'comparando' }, { cor: 'descartado', nome: 'descartado' }, { cor: 'sucesso', nome: 'encontrado' }],
    campos: [{ chave: 'valores', rotulo: 'Array ordenado', valor: a.join(', ') }, { chave: 'alvo', rotulo: 'Alvo', valor: String(alvo) }],
    custo: (p) => `comparações: ${p.vars['comparações']}\nbusca linear: até ${n}\nbusca binária: até ⌈log₂(${n}+1)⌉ = ${Math.ceil(Math.log2(n + 1))}`,
  };
}

/* ------------------------------------------------------------ BFS e DFS */

function lerGrafo(cfg: Config) {
  const t = texto(cfg.arestas).trim();
  if (!t) throw new Error('informe as arestas, por exemplo: A-B, A-C, B-D');
  const dirigidoCfg = cfg.dirigido === true;
  const vertices: string[] = [];
  const adj = new Map<string, string[]>();
  const arestas: { de: string; para: string }[] = [];
  const vert = (v: string) => { if (!adj.has(v)) { adj.set(v, []); vertices.push(v); } };
  let dirigido = dirigidoCfg;
  for (const parte of t.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean)) {
    const m = /^([\p{L}\d_]+)\s*(->|-|—|→)\s*([\p{L}\d_]+)$/u.exec(parte);
    if (m) {
      const [, u, seta, v] = m;
      if (seta === '->' || seta === '→') dirigido = true;
      vert(u); vert(v);
      arestas.push({ de: u, para: v });
    } else if (/^[\p{L}\d_]+$/u.test(parte)) vert(parte); // vértice isolado
    else throw new Error(`aresta não entendida: "${parte}". Use A-B (não dirigida) ou A->B (dirigida)`);
  }
  for (const { de, para } of arestas) {
    adj.get(de)!.push(para);
    if (!dirigido) adj.get(para)!.push(de);
  }
  if (vertices.length > 12) throw new Error('a visualização mostra no máximo 12 vértices');
  const inicio = texto(cfg.inicio || vertices[0]);
  if (!adj.has(inicio)) throw new Error(`o vértice inicial "${inicio}" não aparece nas arestas`);
  return { vertices, adj, arestas, dirigido, inicio };
}

/** Desenho em camadas: coluna = distância (em arestas) a partir do início. */
function posicoes(vertices: string[], adj: Map<string, string[]>, inicio: string) {
  const nivel = new Map<string, number>([[inicio, 0]]);
  const fila = [inicio];
  while (fila.length) {
    const v = fila.shift()!;
    for (const w of adj.get(v)!) if (!nivel.has(w)) { nivel.set(w, nivel.get(v)! + 1); fila.push(w); }
  }
  const maxNivel = Math.max(...nivel.values());
  for (const v of vertices) if (!nivel.has(v)) nivel.set(v, maxNivel + 1);
  const colunas = new Map<number, string[]>();
  for (const v of vertices) { const n = nivel.get(v)!; colunas.set(n, [...(colunas.get(n) ?? []), v]); }
  const nCols = Math.max(...colunas.keys()) + 1;
  const pos = new Map<string, { x: number; y: number }>();
  for (const [c, vs] of colunas) vs.forEach((v, i) => pos.set(v, { x: nCols === 1 ? 50 : 8 + (c * 84) / (nCols - 1), y: ((i + 1) * 100) / (vs.length + 1) }));
  return pos;
}

function busca(cfg: Config, tipo: 'bfs' | 'dfs'): Visual {
  const { vertices, adj, arestas, dirigido, inicio } = lerGrafo(cfg);
  const pos = posicoes(vertices, adj, inicio);
  const passos: Passo[] = [];
  const ehBfs = tipo === 'bfs';
  const cor = new Map<string, Cor>(vertices.map((v) => [v, 'padrao']));
  const pai = new Map<string, string>();
  const dist = new Map<string, number>();
  const ordem: string[] = [];
  const estrutura: string[] = [];
  let previsoes = 0;
  const add = (linha: number, txt: string, prever?: Previsao, atual?: string) => {
    passos.push({
      estado: {
        tipo: 'grafo',
        vertices: vertices.map((v) => ({ id: v, ...pos.get(v)!, cor: v === atual ? 'ativo' : cor.get(v)!, rotulo: ehBfs && dist.has(v) ? `d=${dist.get(v)}` : undefined })),
        arestas: arestas.map((e) => ({ ...e, destaque: pai.get(e.para) === e.de || (!dirigido && pai.get(e.de) === e.para) })),
        dirigido,
        estrutura: { nome: ehBfs ? 'fila (início → fim)' : 'pilha (base → topo)', itens: [...estrutura] },
      },
      trecho: tipo, linha,
      vars: { ...(atual ? { v: atual } : {}), ordem: ordem.join(' ') || '—', [ehBfs ? 'fila' : 'pilha']: lista(estrutura) },
      texto: txt, prever,
    });
  };

  if (ehBfs) {
    dist.set(inicio, 0); cor.set(inicio, 'compara'); estrutura.push(inicio);
    add(2, `Começamos por **${inicio}**: distância 0, e ele entra na **fila**. Azul = descoberto, esperando na fila.`);
    while (estrutura.length) {
      const prox = estrutura[0];
      const prever = estrutura.length >= 2 && ordem.length >= 1 && previsoes < MAX_PREVISOES
        ? (previsoes++, { pergunta: 'Qual vértice sai da fila agora?', opcoes: opcoes(prox, [...estrutura.slice(1), ...vertices.filter((v) => cor.get(v) === 'padrao')], ordem.length + 4), resposta: prox, porque: `Fila é FIFO: sai quem foi descoberto **primeiro**, o ${prox}. É isso que faz a BFS andar em camadas.` })
        : undefined;
      add(3, `A fila tem ${lista(estrutura)}. Enquanto não estiver vazia, tiramos o primeiro.`, prever);
      const v = estrutura.shift()!;
      ordem.push(v);
      add(4, `Saiu **${v}** (distância ${dist.get(v)}). Vamos olhar os vizinhos: ${adj.get(v)!.length ? adj.get(v)!.join(', ') : 'nenhum'}.`, undefined, v);
      for (const w of adj.get(v)!) {
        if (dist.has(w)) {
          add(6, `${w} já foi descoberto: ignoramos. Sem essa checagem, um ciclo faria a busca rodar para sempre.`, undefined, v);
        } else {
          dist.set(w, dist.get(v)! + 1); pai.set(w, v); cor.set(w, 'compara'); estrutura.push(w);
          add(7, `${w} é novo: distância ${dist.get(w)} (uma a mais que ${v}) e entra no **fim** da fila.`, undefined, v);
        }
      }
      cor.set(v, 'sucesso');
    }
    const fora = vertices.filter((v) => !dist.has(v));
    add(-1, `Fila vazia: fim. Ordem de visita: **${ordem.join(', ')}**. Cada distância é o **menor número de arestas** a partir de ${inicio}.${fora.length ? ` ${fora.join(', ')} não é alcançável a partir de ${inicio}.` : ''}`);
  } else {
    const visitados = new Set<string>();
    const origem: (string | undefined)[] = [undefined]; // quem empilhou cada item (aresta da árvore da DFS)
    estrutura.push(inicio); cor.set(inicio, 'compara');
    add(1, `Começamos empilhando **${inicio}**. Azul = está na pilha, esperando.`);
    while (estrutura.length) {
      const prox = estrutura[estrutura.length - 1];
      const prever = estrutura.length >= 2 && previsoes < MAX_PREVISOES
        ? (previsoes++, { pergunta: 'Qual vértice sai da pilha agora?', opcoes: opcoes(prox, [...estrutura], ordem.length + 6), resposta: prox, porque: `Pilha é LIFO: sai o **último** empilhado, o ${prox}. Por isso a DFS mergulha fundo antes de voltar.` })
        : undefined;
      add(2, `A pilha tem ${lista(estrutura)}. Tiramos o topo.`, prever);
      const v = estrutura.pop()!;
      const u = origem.pop();
      if (visitados.has(v)) {
        add(4, `${v} já foi visitado: descartamos e seguimos.`);
        continue;
      }
      visitados.add(v); ordem.push(v);
      if (u) pai.set(v, u);
      add(5, `Visitamos **${v}**. Empilhamos os vizinhos ainda não visitados (de trás para frente, para o primeiro vizinho sair antes).`, undefined, v);
      for (const w of [...adj.get(v)!].reverse()) {
        if (!visitados.has(w)) {
          estrutura.push(w); origem.push(v); cor.set(w, 'compara');
          add(8, `${w} não foi visitado: vai para o **topo** da pilha.`, undefined, v);
        }
      }
      cor.set(v, 'sucesso');
    }
    const fora = vertices.filter((v) => !visitados.has(v));
    add(-1, `Pilha vazia: fim. Ordem de visita: **${ordem.join(', ')}**. Repare como a DFS vai fundo num caminho antes de voltar.${fora.length ? ` ${fora.join(', ')} não é alcançável a partir de ${inicio}.` : ''}`);
  }

  return {
    tipo,
    titulo: ehBfs ? 'Busca em largura (BFS) passo a passo' : 'Busca em profundidade (DFS) passo a passo',
    trechos: ehBfs
      ? { bfs: ['from collections import deque', 'dist = {inicio: 0}', 'fila = deque([inicio])', 'while fila:', '    v = fila.popleft()', '    for w in grafo[v]:', '        if w in dist: continue', '        dist[w] = dist[v] + 1', '        fila.append(w)'] }
      : { dfs: ['visitados = set()', 'pilha = [inicio]', 'while pilha:', '    v = pilha.pop()', '    if v in visitados: continue', '    visitados.add(v)', '    for w in reversed(grafo[v]):', '        if w not in visitados:', '            pilha.append(w)'] },
    passos,
    legenda: [{ cor: 'padrao', nome: 'não descoberto' }, { cor: 'compara', nome: ehBfs ? 'na fila' : 'na pilha' }, { cor: 'ativo', nome: 'visitando' }, { cor: 'sucesso', nome: 'visitado' }],
    campos: [
      { chave: 'arestas', rotulo: 'Arestas', valor: arestas.map((e) => `${e.de}${dirigido ? '->' : '-'}${e.para}`).join(', ') },
      { chave: 'inicio', rotulo: 'Início', valor: inicio },
    ],
  };
}

/* ------------------------------------------------------------ entrada */

/** Gera a visualização a partir do YAML do bloco. Lança Error com mensagem em português. */
export function gerarVisual(cfg: Config): Visual {
  const tipo = texto(cfg.tipo).toLowerCase();
  let v: Visual;
  switch (tipo) {
    case 'pilha': v = pilhaOuFila(cfg, 'pilha'); break;
    case 'fila': v = pilhaOuFila(cfg, 'fila'); break;
    case 'lista-ligada': case 'lista_ligada': case 'lista': v = listaLigada(cfg); break;
    case 'ordenacao': case 'ordenação': v = ordenacao(cfg); break;
    case 'busca-binaria': case 'busca_binaria': v = buscaBinaria(cfg); break;
    case 'bfs': v = busca(cfg, 'bfs'); break;
    case 'dfs': v = busca(cfg, 'dfs'); break;
    default: throw new Error(`tipo de visual desconhecido: "${tipo}". Use ${TIPOS_VISUAIS.join(', ')}`);
  }
  if (cfg.titulo) v.titulo = texto(cfg.titulo);
  if (v.passos.length > 400) throw new Error('passos demais: use menos dados');
  return v;
}
