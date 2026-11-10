/**
 * Simulador didático de RISC-V (RV32IM) para a aula de assembly (AC-04).
 * Monta e executa o programa no navegador, no estilo do RARS: segmento .text
 * em 0x00400000, .data em 0x10010000, pilha começando em 0x7fffeffc e as
 * chamadas de sistema (ecall) do RARS para imprimir e ler.
 *
 * Cada linha de instrução (inclusive pseudo-instruções como li, la, mv, call)
 * ocupa uma posição de 4 bytes; as pseudo-instruções rodam como uma só.
 *
 * Não importa nada: é usado pelo Web Worker do app e pelo validador de aulas.
 */

export interface ErroRiscv {
  tipo: string;
  mensagem: string;
  linha: number | null;
  explicacao: string;
  dica: string | null;
  traceback: string;
}

export interface ResultadoRiscv {
  saida: string;
  terminal: string;
  erro: ErroRiscv | null;
  /** valor do registrador pedido em `chamada` (ex.: "a0"), em decimal com sinal */
  retorno: string | null;
}

export interface DadosRiscv {
  codigo: string;
  entradas?: string[];
  /** nome de um registrador (a0, t1, x5...) cujo valor final os testes comparam */
  chamada?: string;
}

const BASE_TEXTO = 0x00400000;
const BASE_DADOS = 0x10010000;
const BASE_HEAP = 0x10040000;
const TOPO_PILHA = 0x7fffeffc;
const TAM_DADOS = 0x30000; // dados + heap
const TAM_PILHA = 0x10000;
const LIMITE_PASSOS = 2_000_000;
const LIMITE_SAIDA = 50_000;

const NOMES_ABI = ['zero', 'ra', 'sp', 'gp', 'tp', 't0', 't1', 't2', 's0', 's1', 'a0', 'a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7',
  's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9', 's10', 's11', 't3', 't4', 't5', 't6'];

export function numeroRegistrador(nome: string): number | null {
  const n = nome.trim().toLowerCase();
  if (n === 'fp') return 8;
  const i = NOMES_ABI.indexOf(n);
  if (i >= 0) return i;
  const m = n.match(/^x(\d{1,2})$/);
  if (m && Number(m[1]) < 32) return Number(m[1]);
  return null;
}

class ErroMontagem extends Error {
  linha: number;
  dica: string | null;
  constructor(msg: string, linha: number, dica: string | null = null) {
    super(msg);
    this.linha = linha;
    this.dica = dica;
  }
}

class ErroExecucao extends Error {
  tipo: string;
  linha: number | null;
  constructor(tipo: string, msg: string, linha: number | null) {
    super(msg);
    this.tipo = tipo;
    this.linha = linha;
  }
}

const EXPLICACOES: Record<string, string> = {
  'Erro de montagem': 'O montador não entendeu a linha: confira o nome da instrução, os registradores (x0–x31 ou zero, ra, sp, t0–t6, s0–s11, a0–a7), as vírgulas e o formato dos operandos (ex.: lw t0, 4(sp)).',
  'Acesso inválido à memória': 'O programa tentou ler ou escrever num endereço fora das áreas de dados, heap e pilha. Confira o registrador base (foi carregado com la?) e o deslocamento.',
  'Endereço desalinhado': 'lw/sw acessam 4 bytes e exigem endereço múltiplo de 4; lh/sh exigem múltiplo de 2. Em vetores de int, o índice é multiplicado por 4 (slli t0, t0, 2).',
  'Tempo esgotado': 'O programa executou instruções demais: provavelmente um laço que nunca termina (confira a condição do desvio e se o contador muda).',
  'Salto inválido': 'O programa saltou para um endereço que não tem instrução. Confira o jalr/ret (o ra foi salvo e restaurado da pilha?).',
  'Chamada de sistema desconhecida': 'O número do serviço em a7 não existe. Os mais usados: 1 imprime inteiro, 4 imprime texto, 5 lê inteiro, 10 encerra, 11 imprime caractere.',
};

/* ============================================================== montador */

type Operando = { r: number } | { imm: number } | { mem: { imm: number; r: number } } | { rotulo: string; desloc: number };

interface Instrucao {
  op: string;
  a: Operando[];
  linha: number;
  texto: string;
}

interface Programa {
  instrucoes: Instrucao[];
  rotulos: Map<string, number>;
  dados: Uint8Array;
  fimDados: number;
  inicio: number;
}

const FORMATOS: Record<string, string> = {
  // R
  add: 'rrr', sub: 'rrr', sll: 'rrr', slt: 'rrr', sltu: 'rrr', xor: 'rrr', srl: 'rrr', sra: 'rrr', or: 'rrr', and: 'rrr',
  mul: 'rrr', mulh: 'rrr', mulhsu: 'rrr', mulhu: 'rrr', div: 'rrr', divu: 'rrr', rem: 'rrr', remu: 'rrr',
  // I
  addi: 'rri', slti: 'rri', sltiu: 'rri', xori: 'rri', ori: 'rri', andi: 'rri', slli: 'rri', srli: 'rri', srai: 'rri',
  lb: 'rm', lh: 'rm', lw: 'rm', lbu: 'rm', lhu: 'rm',
  sb: 'rm', sh: 'rm', sw: 'rm',
  beq: 'rrl', bne: 'rrl', blt: 'rrl', bge: 'rrl', bltu: 'rrl', bgeu: 'rrl',
  bgt: 'rrl', ble: 'rrl', bgtu: 'rrl', bleu: 'rrl',
  beqz: 'rl', bnez: 'rl', blez: 'rl', bgez: 'rl', bltz: 'rl', bgtz: 'rl',
  lui: 'ri', auipc: 'ri', li: 'ri', la: 'rl',
  mv: 'rr', not: 'rr', neg: 'rr', seqz: 'rr', snez: 'rr', sltz: 'rr', sgtz: 'rr',
  j: 'l', call: 'l', tail: 'l', jr: 'r',
  ret: '', nop: '', ecall: '', ebreak: '',
  jal: '*', jalr: '*',
};

const SUGESTOES: Record<string, string> = {
  mov: 'mv', move: 'mv', load: 'lw', store: 'sw', jmp: 'j', jump: 'j', print: 'ecall (com a7 = 1 ou 4)', syscall: 'ecall',
  addu: 'add', addiu: 'addi', subi: 'addi com imediato negativo', muli: 'mul (carregue o número num registrador com li)', ld: 'lw', sd: 'sw',
  b: 'j', bl: 'jal', cmp: 'slt ou um desvio como blt', inc: 'addi rd, rd, 1', dec: 'addi rd, rd, -1', halt: 'li a7, 10 + ecall', exit: 'li a7, 10 + ecall',
};

function lerImediato(s: string, linha: number, constantes: Map<string, number>): number | null {
  const t = s.trim();
  if (constantes.has(t)) return constantes.get(t)!;
  let m = t.match(/^'(\\?.)'$/);
  if (m) return escapar(m[1]).charCodeAt(0);
  m = t.match(/^([-+]?)(0x[0-9a-f]+|0b[01]+|\d+)$/i);
  if (!m) return null;
  const v = Number(m[2].toLowerCase().startsWith('0b') ? parseInt(m[2].slice(2), 2) : m[2]);
  if (!Number.isFinite(v)) throw new ErroMontagem(`número inválido: ${s}`, linha);
  return m[1] === '-' ? -v : v;
}

function escapar(s: string): string {
  return s.replace(/\\(n|t|r|0|\\|"|')/g, (_, c: string) => ({ n: '\n', t: '\t', r: '\r', '0': '\0', '\\': '\\', '"': '"', "'": "'" })[c]!);
}

function dividirOperandos(s: string): string[] {
  const out: string[] = [];
  let atual = '';
  let aspas: string | null = null;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (aspas) {
      atual += c;
      if (c === '\\') { atual += s[++i] ?? ''; continue; }
      if (c === aspas) aspas = null;
      continue;
    }
    if (c === '"' || c === "'") { aspas = c; atual += c; continue; }
    if (c === ',') { out.push(atual.trim()); atual = ''; continue; }
    atual += c;
  }
  if (atual.trim()) out.push(atual.trim());
  return out;
}

/** Tira o comentário (# até o fim), respeitando aspas. */
function semComentario(l: string): string {
  let aspas: string | null = null;
  for (let i = 0; i < l.length; i++) {
    const c = l[i];
    if (aspas) { if (c === '\\') i++; else if (c === aspas) aspas = null; continue; }
    if (c === '"' || c === "'") aspas = c;
    else if (c === '#') return l.slice(0, i);
  }
  return l;
}

function montar(fonte: string): Programa {
  const instrucoes: Instrucao[] = [];
  const rotulos = new Map<string, number>();
  const constantes = new Map<string, number>();
  const dados = new Uint8Array(TAM_DADOS);
  let pd = 0; // posição livre nos dados
  let segmento: 'text' | 'data' = 'text';
  const pendentesWord: { pos: number; rotulo: string; linha: number }[] = [];
  const definirRotulo = (nome: string, linha: number) => {
    if (rotulos.has(nome)) throw new ErroMontagem(`o rótulo "${nome}" foi definido duas vezes`, linha);
    if (numeroRegistrador(nome) !== null) throw new ErroMontagem(`"${nome}" é nome de registrador e não pode ser rótulo`, linha);
    rotulos.set(nome, segmento === 'text' ? BASE_TEXTO + 4 * instrucoes.length : BASE_DADOS + pd);
  };
  const alinhar = (n: number) => { pd = Math.ceil(pd / n) * n; };
  const escreverDado = (v: number, bytes: number, linha: number) => {
    if (pd + bytes > TAM_DADOS) throw new ErroMontagem('o segmento de dados ficou grande demais', linha);
    for (let i = 0; i < bytes; i++) dados[pd++] = (v >>> (8 * i)) & 0xff;
  };

  let pendentes: string[] = [];
  fonte.split('\n').forEach((bruta, idx) => {
    const linha = idx + 1;
    let l = semComentario(bruta).trim();
    // rótulos (podem ser vários e vir antes da instrução)
    for (;;) {
      const m = l.match(/^([A-Za-z_.$][\w.$]*)\s*:/);
      if (!m) break;
      pendentes.push(m[1]);
      l = l.slice(m[0].length).trim();
    }
    if (!l) return;
    const m = l.match(/^(\S+)\s*(.*)$/)!;
    const nome = m[1].toLowerCase();
    const resto = m[2];
    // nos dados, o rótulo pega o endereço já alinhado do .word/.half (como no RARS)
    if (segmento === 'data' && (nome === '.word' || nome === '.half')) alinhar(nome === '.word' ? 4 : 2);
    if (!['.text', '.data', '.rodata', '.bss', '.globl', '.global', '.section', '.eqv', '.equ', '.set', '.align', '.balign', '.p2align'].includes(nome)) {
      pendentes.forEach((r) => definirRotulo(r, linha));
      pendentes = [];
    }
    if (nome.startsWith('.')) {
      const args = dividirOperandos(resto);
      switch (nome) {
        case '.text': segmento = 'text'; return;
        case '.data': case '.rodata': case '.bss': segmento = 'data'; return;
        case '.globl': case '.global': case '.section': case '.type': case '.size': case '.file': case '.option': case '.extern': return;
        case '.eqv': case '.equ': case '.set': {
          const v = lerImediato(args[1] ?? '', linha, constantes);
          if (v === null || !args[0]) throw new ErroMontagem(`uso: ${nome} NOME, valor`, linha);
          constantes.set(args[0], v);
          return;
        }
      }
      if (segmento !== 'data') throw new ErroMontagem(`a diretiva ${nome} guarda dados: coloque-a depois de .data`, linha, 'Os dados ficam na seção .data e as instruções na seção .text.');
      switch (nome) {
        case '.word': case '.half': case '.byte': {
          const tam = nome === '.word' ? 4 : nome === '.half' ? 2 : 1;
          alinhar(tam);
          for (const a of args) {
            const rep = a.match(/^(.+?)\s*:\s*(\d+)$/); // .word 0:10 (RARS: valor:repetições)
            const valor = rep ? rep[1] : a;
            const vezes = rep ? Number(rep[2]) : 1;
            const v = lerImediato(valor, linha, constantes);
            for (let k = 0; k < vezes; k++) {
              if (v === null) {
                if (tam !== 4 || !/^[A-Za-z_.$][\w.$]*$/.test(valor)) throw new ErroMontagem(`valor inválido em ${nome}: ${valor}`, linha);
                pendentesWord.push({ pos: pd, rotulo: valor, linha });
                escreverDado(0, 4, linha);
              } else escreverDado(v, tam, linha);
            }
          }
          return;
        }
        case '.ascii': case '.asciz': case '.asciiz': case '.string': {
          for (const a of args) {
            const s = a.match(/^"((?:[^"\\]|\\.)*)"$/);
            if (!s) throw new ErroMontagem(`${nome} espera um texto entre aspas duplas`, linha);
            for (const b of new TextEncoder().encode(escapar(s[1]))) escreverDado(b, 1, linha);
            if (nome !== '.ascii') escreverDado(0, 1, linha);
          }
          return;
        }
        case '.space': case '.zero': case '.skip': {
          const n = lerImediato(args[0] ?? '', linha, constantes);
          if (n === null || n < 0) throw new ErroMontagem(`${nome} espera o número de bytes`, linha);
          for (let k = 0; k < n; k++) escreverDado(0, 1, linha);
          return;
        }
        case '.align': case '.balign': case '.p2align': {
          const n = lerImediato(args[0] ?? '', linha, constantes) ?? 0;
          alinhar(nome === '.balign' ? n : 2 ** n);
          return;
        }
      }
      throw new ErroMontagem(`diretiva desconhecida: ${nome}`, linha, 'Diretivas comuns: .data, .text, .word, .byte, .asciz, .space, .align, .globl.');
    }
    if (segmento !== 'text') throw new ErroMontagem(`instrução "${nome}" dentro de .data`, linha, 'Escreva .text antes das instruções.');
    if (!(nome in FORMATOS)) {
      const sug = SUGESTOES[nome];
      throw new ErroMontagem(`instrução desconhecida: "${m[1]}"`, linha, sug ? `Em RISC-V use ${sug}.` : null);
    }
    const ops = dividirOperandos(resto);
    instrucoes.push({ op: nome, a: ops.map((o) => operando(o, linha, constantes)), linha, texto: bruta.trim() });
  });

  pendentes.forEach((r) => definirRotulo(r, 0));
  for (const p of pendentesWord) {
    const v = rotulos.get(p.rotulo);
    if (v === undefined) throw new ErroMontagem(`rótulo não definido: ${p.rotulo}`, p.linha);
    for (let i = 0; i < 4; i++) dados[p.pos + i] = (v >>> (8 * i)) & 0xff;
  }

  // confere formatos e rótulos
  for (const ins of instrucoes) conferir(ins, rotulos);

  const inicio = rotulos.get('main') ?? rotulos.get('_start') ?? BASE_TEXTO;
  return { instrucoes, rotulos, dados, fimDados: pd, inicio };
}

function operando(s: string, linha: number, constantes: Map<string, number>): Operando {
  const r = numeroRegistrador(s);
  if (r !== null) return { r };
  const mem = s.match(/^(.*)\(\s*([\w]+)\s*\)$/);
  if (mem) {
    const base = numeroRegistrador(mem[2]);
    if (base === null) throw new ErroMontagem(`registrador inválido dentro dos parênteses: ${mem[2]}`, linha);
    const imm = mem[1].trim() ? lerImediato(mem[1], linha, constantes) : 0;
    if (imm === null) throw new ErroMontagem(`deslocamento inválido: ${mem[1]}`, linha);
    return { mem: { imm, r: base } };
  }
  const imm = lerImediato(s, linha, constantes);
  if (imm !== null) return { imm };
  const rot = s.match(/^([A-Za-z_.$][\w.$]*)\s*(?:([-+])\s*(\w+))?$/);
  if (rot) {
    const d = rot[3] ? lerImediato(rot[3], linha, constantes) : 0;
    return { rotulo: rot[1], desloc: (rot[2] === '-' ? -1 : 1) * (d ?? 0) };
  }
  if (/^\$\w+/.test(s)) throw new ErroMontagem(`registrador inválido: ${s}`, linha, 'Em RISC-V os registradores não levam $ (isso é do MIPS): use t0, a0, s1...');
  throw new ErroMontagem(`operando inválido: ${s}`, linha);
}

function nomeOp(o: Operando): string {
  return 'r' in o ? 'registrador' : 'imm' in o ? 'número' : 'mem' in o ? 'endereço imm(reg)' : 'rótulo';
}

function conferir(ins: Instrucao, rotulos: Map<string, number>) {
  const { op, a, linha } = ins;
  const erro = (msg: string, dica: string | null = null) => { throw new ErroMontagem(msg, linha, dica); };
  const exemplo: Record<string, string> = {
    rrr: `${op} rd, rs1, rs2`, rri: `${op} rd, rs1, imediato`, rm: `${op} ${op.startsWith('s') ? 'rs2' : 'rd'}, deslocamento(rs1)`,
    rrl: `${op} rs1, rs2, rótulo`, rl: op === 'la' ? 'la rd, rótulo' : `${op} rs1, rótulo`, ri: `${op} rd, imediato`, rr: `${op} rd, rs`, l: `${op} rótulo`, r: `${op} rs`, '': op,
  };
  let fmt = FORMATOS[op];
  if (op === 'jal') fmt = a.length === 1 ? 'l' : 'rl';
  if (op === 'jalr') {
    if (a.length === 1 && 'r' in a[0]) return;
    if (a.length === 2 && 'r' in a[0] && 'mem' in a[1]) return;
    if (a.length === 3 && 'r' in a[0] && 'r' in a[1] && 'imm' in a[2]) return;
    erro('formato inválido de jalr', 'Use jalr rs, jalr rd, 0(rs) ou ret.');
  }
  // lw rd, rótulo (pseudo): aceita
  if (fmt === 'rm' && a.length === 2 && 'r' in a[0] && 'rotulo' in a[1] && !op.startsWith('s')) fmt = 'rl';
  if (a.length !== fmt.length) erro(`${op} espera ${fmt.length} operando(s) e recebeu ${a.length}`, `Formato: ${exemplo[fmt] ?? op}`);
  [...fmt].forEach((k, i) => {
    const o = a[i];
    const ok = k === 'r' ? 'r' in o : k === 'i' ? 'imm' in o : k === 'm' ? 'mem' in o : 'rotulo' in o;
    if (!ok) {
      let dica = `Formato: ${exemplo[fmt] ?? op}`;
      if (k === 'i' && 'r' in o && op.endsWith('i')) dica = `O último operando de ${op} é um número. Para somar dois registradores use ${op.slice(0, -1)}.`;
      if (k === 'r' && 'imm' in o && FORMATOS[op + 'i']) dica = `Com um número no fim, use ${op}i (ex.: ${op}i t0, t0, 1).`;
      if (k === 'm' && 'r' in o) dica = `Para acessar a memória escreva o endereço como deslocamento(registrador), ex.: ${op} t0, 0(a0).`;
      erro(`operando ${i + 1} de ${op} deveria ser ${k === 'r' ? 'um registrador' : k === 'i' ? 'um número' : k === 'm' ? 'um endereço imm(reg)' : 'um rótulo'}, mas é ${nomeOp(o)}`, dica);
    }
    if ('rotulo' in o && !rotulos.has(o.rotulo)) erro(`rótulo não definido: ${o.rotulo}`, 'Confira a grafia: maiúsculas e minúsculas contam, e o rótulo é definido com dois-pontos (laco:).');
  });
  const imm = a.find((o): o is { imm: number } => 'imm' in o)?.imm;
  const memImm = a.find((o): o is { mem: { imm: number; r: number } } => 'mem' in o)?.mem.imm;
  if (['addi', 'slti', 'sltiu', 'xori', 'ori', 'andi'].includes(op) && imm !== undefined && (imm < -2048 || imm > 2047)) {
    erro(`o imediato ${imm} não cabe em 12 bits (vai de -2048 a 2047)`, `Carregue o número com li (ex.: li t1, ${imm}) e use ${op.slice(0, -1)}.`);
  }
  if (memImm !== undefined && (memImm < -2048 || memImm > 2047)) erro(`o deslocamento ${memImm} não cabe em 12 bits (vai de -2048 a 2047)`);
  if (['slli', 'srli', 'srai'].includes(op) && imm !== undefined && (imm < 0 || imm > 31)) erro(`o deslocamento de ${op} vai de 0 a 31`);
  if (['lui', 'auipc'].includes(op) && imm !== undefined && (imm < 0 || imm > 0xfffff)) erro(`o imediato de ${op} tem 20 bits (0 a 0xFFFFF)`);
  if (op === 'li' && imm !== undefined && (imm < -(2 ** 31) || imm > 2 ** 32 - 1)) erro('o número não cabe em 32 bits');
}

/* ============================================================== execução */

class Memoria {
  dados: Uint8Array;
  pilha = new Uint8Array(TAM_PILHA);
  heapLivre = BASE_HEAP;
  constructor(dados: Uint8Array) {
    this.dados = dados;
  }

  private local(end: number, tam: number, linha: number): [Uint8Array, number] {
    end >>>= 0;
    if (tam > 1 && end % tam !== 0) {
      throw new ErroExecucao('Endereço desalinhado', `acesso de ${tam} bytes no endereço 0x${end.toString(16).padStart(8, '0')}, que não é múltiplo de ${tam}`, linha);
    }
    if (end >= BASE_DADOS && end + tam <= BASE_DADOS + TAM_DADOS) return [this.dados, end - BASE_DADOS];
    const basePilha = TOPO_PILHA + 4 - TAM_PILHA;
    if (end >= basePilha && end + tam <= TOPO_PILHA + 4) return [this.pilha, end - basePilha];
    if (end < 0x1000) throw new ErroExecucao('Acesso inválido à memória', `endereço 0x${end.toString(16).padStart(8, '0')} (quase zero: o registrador base provavelmente não foi inicializado; use la para pegar o endereço de um rótulo)`, linha);
    if (end >= BASE_TEXTO && end < BASE_DADOS) throw new ErroExecucao('Acesso inválido à memória', `endereço 0x${end.toString(16).padStart(8, '0')} fica no segmento de código (.text); dados vão em .data`, linha);
    throw new ErroExecucao('Acesso inválido à memória', `endereço 0x${end.toString(16).padStart(8, '0')} está fora da memória do programa`, linha);
  }

  ler(end: number, tam: number, comSinal: boolean, linha: number): number {
    const [buf, i] = this.local(end, tam, linha);
    let v = 0;
    for (let k = tam - 1; k >= 0; k--) v = (v << 8) | buf[i + k];
    if (tam === 4) return v | 0;
    if (comSinal) return (v << (32 - 8 * tam)) >> (32 - 8 * tam);
    return v >>> 0;
  }

  escrever(end: number, tam: number, v: number, linha: number) {
    const [buf, i] = this.local(end, tam, linha);
    for (let k = 0; k < tam; k++) buf[i + k] = (v >>> (8 * k)) & 0xff;
  }

  texto(end: number, linha: number): string {
    const bytes: number[] = [];
    for (let e = end; bytes.length < LIMITE_SAIDA; e++) {
      const b = this.ler(e, 1, false, linha);
      if (b === 0) break;
      bytes.push(b);
    }
    return new TextDecoder().decode(new Uint8Array(bytes));
  }
}

export function executarRiscv(d: DadosRiscv): ResultadoRiscv {
  let saida = '';
  let terminal = '';
  const escrever = (s: string) => {
    saida += s;
    terminal += s;
    if (saida.length > LIMITE_SAIDA) throw new ErroExecucao('Tempo esgotado', 'o programa imprimiu texto demais (laço sem fim?)', null);
  };
  const fila = [...(d.entradas ?? [])];
  const ler = (msg: string) => {
    if (!fila.length) throw new ErroExecucao('Sem entrada', `${msg}, mas não há mais linhas de entrada`, null);
    const v = fila.shift()!;
    terminal += v + '\n';
    return v;
  };

  let prog: Programa;
  try {
    prog = montar(d.codigo);
  } catch (e) {
    if (!(e instanceof ErroMontagem)) throw e;
    const erro = criarErro('Erro de montagem', e.message, e.linha, e.dica);
    return { saida: '', terminal: erro.traceback + '\n', erro, retorno: null };
  }

  const x = new Int32Array(32);
  x[2] = TOPO_PILHA | 0; // sp
  x[3] = 0x10008000 | 0; // gp
  const mem = new Memoria(prog.dados);
  let pc = prog.inicio;
  let passos = 0;
  let linhaAtual: number | null = null;
  let erro: ErroRiscv | null = null;
  let codigoSaida: number | null = null;

  const reg = (o: Operando) => x[(o as { r: number }).r];
  const set = (o: Operando, v: number) => { const r = (o as { r: number }).r; if (r) x[r] = v | 0; };
  const imm = (o: Operando) => (o as { imm: number }).imm;
  const end = (o: Operando) => { const m = (o as { mem: { imm: number; r: number } }).mem; return (x[m.r] + m.imm) | 0; };
  const alvo = (o: Operando) => { const r = o as { rotulo: string; desloc: number }; return prog.rotulos.get(r.rotulo)! + r.desloc; };
  const u = (v: number) => v >>> 0;

  try {
    for (;;) {
      const idx = (pc - BASE_TEXTO) / 4;
      if (idx === prog.instrucoes.length) break; // passou da última instrução: termina, como no RARS
      if (!Number.isInteger(idx) || idx < 0 || idx > prog.instrucoes.length) {
        throw new ErroExecucao('Salto inválido', `o PC foi para 0x${u(pc).toString(16).padStart(8, '0')}, onde não há instrução`, linhaAtual);
      }
      if (++passos > LIMITE_PASSOS) throw new ErroExecucao('Tempo esgotado', `o programa passou de ${LIMITE_PASSOS.toLocaleString('pt-BR')} instruções executadas`, linhaAtual);
      const ins = prog.instrucoes[idx];
      linhaAtual = ins.linha;
      const a = ins.a;
      let prox = pc + 4;
      const desvia = (cond: boolean, o: Operando) => { if (cond) prox = alvo(o); };
      switch (ins.op) {
        case 'add': set(a[0], reg(a[1]) + reg(a[2])); break;
        case 'sub': set(a[0], reg(a[1]) - reg(a[2])); break;
        case 'sll': set(a[0], reg(a[1]) << (reg(a[2]) & 31)); break;
        case 'slt': set(a[0], reg(a[1]) < reg(a[2]) ? 1 : 0); break;
        case 'sltu': set(a[0], u(reg(a[1])) < u(reg(a[2])) ? 1 : 0); break;
        case 'xor': set(a[0], reg(a[1]) ^ reg(a[2])); break;
        case 'srl': set(a[0], reg(a[1]) >>> (reg(a[2]) & 31)); break;
        case 'sra': set(a[0], reg(a[1]) >> (reg(a[2]) & 31)); break;
        case 'or': set(a[0], reg(a[1]) | reg(a[2])); break;
        case 'and': set(a[0], reg(a[1]) & reg(a[2])); break;
        case 'mul': set(a[0], Math.imul(reg(a[1]), reg(a[2]))); break;
        case 'mulh': set(a[0], Number((BigInt(reg(a[1])) * BigInt(reg(a[2]))) >> 32n)); break;
        case 'mulhu': set(a[0], Number((BigInt(u(reg(a[1]))) * BigInt(u(reg(a[2])))) >> 32n)); break;
        case 'mulhsu': set(a[0], Number((BigInt(reg(a[1])) * BigInt(u(reg(a[2])))) >> 32n)); break;
        case 'div': {
          const p = reg(a[1]), q = reg(a[2]);
          set(a[0], q === 0 ? -1 : p === -2147483648 && q === -1 ? p : Math.trunc(p / q));
          break;
        }
        case 'divu': { const q = u(reg(a[2])); set(a[0], q === 0 ? -1 : Math.floor(u(reg(a[1])) / q)); break; }
        case 'rem': {
          const p = reg(a[1]), q = reg(a[2]);
          set(a[0], q === 0 ? p : p === -2147483648 && q === -1 ? 0 : p % q);
          break;
        }
        case 'remu': { const q = u(reg(a[2])); set(a[0], q === 0 ? reg(a[1]) : u(reg(a[1])) % q); break; }
        case 'addi': set(a[0], reg(a[1]) + imm(a[2])); break;
        case 'slti': set(a[0], reg(a[1]) < imm(a[2]) ? 1 : 0); break;
        case 'sltiu': set(a[0], u(reg(a[1])) < u(imm(a[2])) ? 1 : 0); break;
        case 'xori': set(a[0], reg(a[1]) ^ imm(a[2])); break;
        case 'ori': set(a[0], reg(a[1]) | imm(a[2])); break;
        case 'andi': set(a[0], reg(a[1]) & imm(a[2])); break;
        case 'slli': set(a[0], reg(a[1]) << imm(a[2])); break;
        case 'srli': set(a[0], reg(a[1]) >>> imm(a[2])); break;
        case 'srai': set(a[0], reg(a[1]) >> imm(a[2])); break;
        case 'lui': set(a[0], imm(a[1]) << 12); break;
        case 'auipc': set(a[0], pc + (imm(a[1]) << 12)); break;
        case 'li': set(a[0], imm(a[1])); break;
        case 'la': set(a[0], alvo(a[1])); break;
        case 'mv': set(a[0], reg(a[1])); break;
        case 'not': set(a[0], ~reg(a[1])); break;
        case 'neg': set(a[0], -reg(a[1])); break;
        case 'seqz': set(a[0], reg(a[1]) === 0 ? 1 : 0); break;
        case 'snez': set(a[0], reg(a[1]) !== 0 ? 1 : 0); break;
        case 'sltz': set(a[0], reg(a[1]) < 0 ? 1 : 0); break;
        case 'sgtz': set(a[0], reg(a[1]) > 0 ? 1 : 0); break;
        case 'lb': case 'lh': case 'lw': case 'lbu': case 'lhu': {
          const tam = ins.op[1] === 'b' ? 1 : ins.op[1] === 'h' ? 2 : 4;
          const e = 'rotulo' in a[1] ? alvo(a[1]) : end(a[1]);
          set(a[0], mem.ler(e, tam, !ins.op.endsWith('u'), ins.linha));
          break;
        }
        case 'sb': case 'sh': case 'sw': {
          const tam = ins.op === 'sb' ? 1 : ins.op === 'sh' ? 2 : 4;
          mem.escrever(end(a[1]), tam, reg(a[0]), ins.linha);
          break;
        }
        case 'beq': desvia(reg(a[0]) === reg(a[1]), a[2]); break;
        case 'bne': desvia(reg(a[0]) !== reg(a[1]), a[2]); break;
        case 'blt': desvia(reg(a[0]) < reg(a[1]), a[2]); break;
        case 'bge': desvia(reg(a[0]) >= reg(a[1]), a[2]); break;
        case 'bltu': desvia(u(reg(a[0])) < u(reg(a[1])), a[2]); break;
        case 'bgeu': desvia(u(reg(a[0])) >= u(reg(a[1])), a[2]); break;
        case 'bgt': desvia(reg(a[0]) > reg(a[1]), a[2]); break;
        case 'ble': desvia(reg(a[0]) <= reg(a[1]), a[2]); break;
        case 'bgtu': desvia(u(reg(a[0])) > u(reg(a[1])), a[2]); break;
        case 'bleu': desvia(u(reg(a[0])) <= u(reg(a[1])), a[2]); break;
        case 'beqz': desvia(reg(a[0]) === 0, a[1]); break;
        case 'bnez': desvia(reg(a[0]) !== 0, a[1]); break;
        case 'blez': desvia(reg(a[0]) <= 0, a[1]); break;
        case 'bgez': desvia(reg(a[0]) >= 0, a[1]); break;
        case 'bltz': desvia(reg(a[0]) < 0, a[1]); break;
        case 'bgtz': desvia(reg(a[0]) > 0, a[1]); break;
        case 'j': prox = alvo(a[0]); break;
        case 'tail': prox = alvo(a[0]); break;
        case 'call': x[1] = pc + 4; prox = alvo(a[0]); break;
        case 'jal':
          if (a.length === 1) { x[1] = pc + 4; prox = alvo(a[0]); }
          else { set(a[0], pc + 4); prox = alvo(a[1]); }
          break;
        case 'jalr': {
          let destino: number;
          let rd = 1;
          if (a.length === 1) destino = reg(a[0]);
          else if (a.length === 2) { rd = (a[0] as { r: number }).r; destino = end(a[1]); }
          else { rd = (a[0] as { r: number }).r; destino = reg(a[1]) + imm(a[2]); }
          if (rd) x[rd] = pc + 4;
          prox = destino & ~1;
          break;
        }
        case 'jr': prox = reg(a[0]); break;
        case 'ret': prox = x[1]; break;
        case 'nop': break;
        case 'ebreak': codigoSaida = 0; break;
        case 'ecall': {
          const servico = x[17];
          switch (servico) {
            case 1: escrever(String(x[10])); break;
            case 4: escrever(mem.texto(x[10], ins.linha)); break;
            case 5: {
              const v = ler('ecall 5 (ler inteiro) foi chamado').trim();
              if (!/^[-+]?\d+$/.test(v)) throw new ErroExecucao('Entrada inválida', `ecall 5 esperava um número inteiro e recebeu "${v}"`, ins.linha);
              x[10] = Number(v) | 0;
              break;
            }
            case 8: {
              const v = ler('ecall 8 (ler texto) foi chamado');
              const max = x[11];
              const bytes = new TextEncoder().encode(v + '\n').slice(0, Math.max(0, max - 1));
              bytes.forEach((b, i) => mem.escrever(x[10] + i, 1, b, ins.linha));
              mem.escrever(x[10] + bytes.length, 1, 0, ins.linha);
              break;
            }
            case 9: {
              const n = x[10];
              const inicio = Math.ceil(mem.heapLivre / 4) * 4;
              if (inicio + n > BASE_DADOS + TAM_DADOS) throw new ErroExecucao('Acesso inválido à memória', 'sbrk: acabou a memória do heap', ins.linha);
              x[10] = inicio;
              mem.heapLivre = inicio + n;
              break;
            }
            case 10: codigoSaida = 0; break;
            case 11: escrever(String.fromCharCode(x[10] & 0xff)); break;
            case 12: {
              const v = ler('ecall 12 (ler caractere) foi chamado');
              x[10] = v.charCodeAt(0) || 10;
              break;
            }
            case 34: escrever('0x' + u(x[10]).toString(16).padStart(8, '0')); break;
            case 35: escrever(u(x[10]).toString(2).padStart(32, '0')); break;
            case 36: escrever(String(u(x[10]))); break;
            case 93: codigoSaida = x[10]; break;
            default:
              throw new ErroExecucao('Chamada de sistema desconhecida', `ecall com a7 = ${servico}`, ins.linha);
          }
          break;
        }
        default:
          throw new ErroExecucao('Erro de montagem', `instrução não implementada: ${ins.op}`, ins.linha);
      }
      x[0] = 0;
      if (codigoSaida !== null) break;
      pc = prox | 0;
    }
  } catch (e) {
    if (!(e instanceof ErroExecucao)) throw e;
    erro = criarErro(e.tipo, e.message, e.linha ?? linhaAtual, null);
    if (e.tipo === 'Salto inválido' && x[1] === 0) erro.dica = 'O ra está zerado: o ret foi executado sem um call/jal antes? Termine o main com li a7, 10 e ecall.';
    terminal += `${terminal && !terminal.endsWith('\n') ? '\n' : ''}${erro.traceback}\n`;
  }

  if (!erro) {
    const mudados = NOMES_ABI.map((n, i) => [n, x[i]] as const).filter(([n, v], i) => i !== 0 && v !== 0 && n !== 'sp' && n !== 'gp');
    const fim = codigoSaida ? `\n[o programa terminou com código ${codigoSaida}]` : '';
    terminal += `${terminal && !terminal.endsWith('\n') ? '\n' : ''}${fim ? fim.trim() + '\n' : ''}— registradores no fim: ${mudados.length ? mudados.map(([n, v]) => `${n}=${v}`).join(', ') : 'todos zerados'} (${passos} instruções executadas)\n`;
  }

  let retorno: string | null = null;
  if (d.chamada && !erro) {
    const r = numeroRegistrador(d.chamada);
    retorno = r === null ? `registrador desconhecido: ${d.chamada}` : String(x[r]);
  }
  return { saida, terminal, erro, retorno };
}

function criarErro(tipo: string, mensagem: string, linha: number | null, dica: string | null): ErroRiscv {
  return { tipo, mensagem, linha, explicacao: EXPLICACOES[tipo] ?? '', dica, traceback: `${tipo}: ${mensagem}${linha ? ` (linha ${linha})` : ''}` };
}

export const INSTRUCOES_RISCV = Object.keys(FORMATOS);

/** Só monta (para marcar o erro no editor enquanto o aluno digita). */
export function checarMontagem(codigo: string): { linha: number; mensagem: string } | null {
  try {
    montar(codigo);
    return null;
  } catch (e) {
    if (e instanceof ErroMontagem) return { linha: e.linha, mensagem: e.message + (e.dica ? ` ${e.dica}` : '') };
    return null;
  }
}
