/**
 * Shell didático: um interpretador de um subconjunto do Bash que roda no
 * navegador, sobre um sistema de arquivos em memória. Serve para os desafios
 * de linha de comando (SO-08) sem precisar de um Linux de verdade.
 *
 * O que tem: variáveis, aspas, $(...), $((...)), globs (*, ?), pipes, &&, ||,
 * redirecionamento (>, >>, <, 2>), if/elif/else, for (lista e estilo C), while,
 * until, funções, [ ] e [[ ]], read, e os comandos mais usados (ls, cd, cat,
 * grep, sort, wc, head, tail, cut, tr, sed s///, find, ...).
 *
 * O arquivo não importa nada: é usado pelo Web Worker do app e pelo validador
 * de aulas (scripts/validar-aulas.mjs), que o carrega direto no Node.
 */

export interface ErroShell {
  tipo: string;
  mensagem: string;
  linha: number | null;
  explicacao: string;
  dica: string | null;
  traceback: string;
}

export interface ResultadoShell {
  saida: string;
  terminal: string;
  erro: ErroShell | null;
  retorno: string | null;
}

export interface DadosShell {
  codigo: string;
  entradas?: string[];
  /** script rodado antes (cria arquivos e pastas); a saída dele não aparece */
  preparo?: string;
  /** opcional: expressão avaliada no fim, ex.: "$total" ou "$(cat notas.txt)" */
  chamada?: string;
}

const HOME = '/home/aluno';
const LIMITE_PASSOS = 200_000;
const LIMITE_MS = 4500;
const LIMITE_SAIDA = 50_000;

/* ================================================================ arquivos */

type No = { tipo: 'dir'; filhos: Map<string, No> } | { tipo: 'arq'; conteudo: string };

class SistemaArquivos {
  raiz: No = { tipo: 'dir', filhos: new Map() };

  constructor() {
    this.mkdir('/home/aluno', true);
    this.mkdir('/tmp', true);
  }

  static normalizar(caminho: string, cwd: string): string {
    const abs = caminho.startsWith('/') ? caminho : `${cwd}/${caminho}`;
    const partes: string[] = [];
    for (const p of abs.split('/')) {
      if (!p || p === '.') continue;
      if (p === '..') partes.pop();
      else partes.push(p);
    }
    return '/' + partes.join('/');
  }

  obter(abs: string): No | null {
    let no: No = this.raiz;
    for (const p of abs.split('/').filter(Boolean)) {
      if (no.tipo !== 'dir') return null;
      const f = no.filhos.get(p);
      if (!f) return null;
      no = f;
    }
    return no;
  }

  pai(abs: string): { dir: No | null; nome: string } {
    const i = abs.lastIndexOf('/');
    return { dir: this.obter(abs.slice(0, i) || '/'), nome: abs.slice(i + 1) };
  }

  mkdir(abs: string, recursivo: boolean): string | null {
    if (recursivo) {
      let no = this.raiz;
      for (const p of abs.split('/').filter(Boolean)) {
        if (no.tipo !== 'dir') return 'Não é um diretório';
        let f = no.filhos.get(p);
        if (!f) no.filhos.set(p, (f = { tipo: 'dir', filhos: new Map() }));
        no = f;
      }
      return no.tipo === 'dir' ? null : 'Arquivo existe';
    }
    const { dir, nome } = this.pai(abs);
    if (!dir) return 'Arquivo ou diretório inexistente';
    if (dir.tipo !== 'dir') return 'Não é um diretório';
    if (dir.filhos.has(nome)) return 'Arquivo existe';
    dir.filhos.set(nome, { tipo: 'dir', filhos: new Map() });
    return null;
  }

  escrever(abs: string, conteudo: string, anexar: boolean): string | null {
    const { dir, nome } = this.pai(abs);
    if (!dir || dir.tipo !== 'dir') return 'Arquivo ou diretório inexistente';
    const atual = dir.filhos.get(nome);
    if (atual?.tipo === 'dir') return 'É um diretório';
    dir.filhos.set(nome, { tipo: 'arq', conteudo: anexar && atual ? atual.conteudo + conteudo : conteudo });
    return null;
  }

  remover(abs: string) {
    const { dir, nome } = this.pai(abs);
    if (dir?.tipo === 'dir') dir.filhos.delete(nome);
  }
}

const copiarNo = (n: No): No =>
  n.tipo === 'arq' ? { tipo: 'arq', conteudo: n.conteudo } : { tipo: 'dir', filhos: new Map([...n.filhos].map(([k, v]) => [k, copiarNo(v)])) };

/* ================================================================== léxico */

type Parte =
  | { t: 'lit'; v: string; q: boolean }
  | { t: 'var'; nome: string; q: boolean; padrao?: { op: string; arg: Palavra } }
  | { t: 'cmd'; src: string; q: boolean; linha: number }
  | { t: 'arit'; src: string; q: boolean };

interface Palavra { partes: Parte[]; linha: number }

type Token =
  | { k: 'palavra'; p: Palavra; bruto: string; linha: number }
  | { k: 'op'; v: string; linha: number }
  | { k: 'arit'; src: string; linha: number }
  | { k: 'fim'; linha: number };

class ErroSintaxe extends Error {
  linha: number;
  constructor(msg: string, linha: number) {
    super(msg);
    this.linha = linha;
  }
}

const OPERADORES = ['&&', '||', ';;', '>>', '2>>', '2>&1', '&>', '2>', '|', ';', '<', '>', '(', ')', '&', '\n'];

function lerAteFecha(src: string, i: number, abre: string, fecha: string): number {
  // devolve o índice logo depois do `fecha` que equilibra (respeitando aspas)
  let nivel = 1;
  while (i < src.length) {
    const c = src[i];
    if (c === '\\') { i += 2; continue; }
    if (c === "'") { const f = src.indexOf("'", i + 1); i = f < 0 ? src.length : f + 1; continue; }
    if (c === '"') {
      i++;
      while (i < src.length && src[i] !== '"') i += src[i] === '\\' ? 2 : 1;
      i++;
      continue;
    }
    if (src.startsWith(abre, i)) { nivel++; i += abre.length; continue; }
    if (src.startsWith(fecha, i)) { nivel--; i += fecha.length; if (nivel === 0) return i; continue; }
    i++;
  }
  return -1;
}

class Lexico {
  i = 0;
  linha = 1;
  src: string;
  constructor(src: string) {
    this.src = src;
  }

  tokens(): Token[] {
    const out: Token[] = [];
    const s = this.src;
    while (this.i < s.length) {
      const c = s[this.i];
      if (c === ' ' || c === '\t' || c === '\r') { this.i++; continue; }
      if (c === '\\' && s[this.i + 1] === '\n') { this.i += 2; this.linha++; continue; }
      if (c === '#') { while (this.i < s.length && s[this.i] !== '\n') this.i++; continue; }
      if (s.startsWith('((', this.i)) {
        const fim = lerAteFecha(s, this.i + 2, '((', '))');
        if (fim < 0) throw new ErroSintaxe('faltou fechar o (( com ))', this.linha);
        const src = s.slice(this.i + 2, fim - 2);
        out.push({ k: 'arit', src, linha: this.linha });
        this.linha += (src.match(/\n/g) ?? []).length;
        this.i = fim;
        continue;
      }
      const op = OPERADORES.find((o) => s.startsWith(o, this.i));
      if (op && !(op.startsWith('2') && /[\w]/.test(s[this.i - 1] ?? ''))) {
        out.push({ k: 'op', v: op, linha: this.linha });
        if (op === '\n') this.linha++;
        this.i += op.length;
        continue;
      }
      const inicio = this.i;
      const linha = this.linha;
      const p = this.palavra();
      out.push({ k: 'palavra', p, bruto: s.slice(inicio, this.i), linha });
    }
    out.push({ k: 'fim', linha: this.linha });
    return out;
  }

  private palavra(): Palavra {
    const s = this.src;
    const partes: Parte[] = [];
    const linha = this.linha;
    let lit = '';
    const soltar = (q: boolean) => { if (lit) partes.push({ t: 'lit', v: lit, q }); lit = ''; };
    while (this.i < s.length) {
      const c = s[this.i];
      if (/[ \t\r\n|&;<>()]/.test(c)) break;
      if (c === '\\') {
        soltar(false);
        if (s[this.i + 1] === '\n') { this.i += 2; this.linha++; continue; }
        partes.push({ t: 'lit', v: s[this.i + 1] ?? '', q: true });
        this.i += 2;
        continue;
      }
      if (c === "'") {
        soltar(false);
        const f = s.indexOf("'", this.i + 1);
        if (f < 0) throw new ErroSintaxe("faltou fechar a aspa simples (')", this.linha);
        const v = s.slice(this.i + 1, f);
        this.linha += (v.match(/\n/g) ?? []).length;
        partes.push({ t: 'lit', v, q: true });
        this.i = f + 1;
        continue;
      }
      if (c === '"') {
        soltar(false);
        this.i++;
        this.duplas(partes);
        continue;
      }
      if (c === '$') {
        const p = this.cifrao(false);
        if (p) { soltar(false); partes.push(p); continue; }
      }
      if (c === '`') {
        soltar(false);
        const f = s.indexOf('`', this.i + 1);
        if (f < 0) throw new ErroSintaxe('faltou fechar a crase (`)', this.linha);
        partes.push({ t: 'cmd', src: s.slice(this.i + 1, f), q: false, linha: this.linha });
        this.i = f + 1;
        continue;
      }
      if (c === '~' && partes.length === 0 && !lit && (s[this.i + 1] === undefined || /[/\s;|&)]/.test(s[this.i + 1]))) {
        partes.push({ t: 'lit', v: HOME, q: true });
        this.i++;
        continue;
      }
      lit += c;
      this.i++;
    }
    soltar(false);
    return { partes, linha };
  }

  private duplas(partes: Parte[]) {
    const s = this.src;
    let lit = '';
    const soltar = () => { if (lit) partes.push({ t: 'lit', v: lit, q: true }); lit = ''; };
    while (this.i < s.length && s[this.i] !== '"') {
      const c = s[this.i];
      if (c === '\\' && '"\\$`\n'.includes(s[this.i + 1])) {
        if (s[this.i + 1] !== '\n') lit += s[this.i + 1];
        else this.linha++;
        this.i += 2;
        continue;
      }
      if (c === '$') {
        const p = this.cifrao(true);
        if (p) { soltar(); partes.push(p); continue; }
      }
      if (c === '`') {
        soltar();
        const f = s.indexOf('`', this.i + 1);
        if (f < 0) throw new ErroSintaxe('faltou fechar a crase (`)', this.linha);
        partes.push({ t: 'cmd', src: s.slice(this.i + 1, f), q: true, linha: this.linha });
        this.i = f + 1;
        continue;
      }
      if (c === '\n') this.linha++;
      lit += c;
      this.i++;
    }
    if (this.i >= s.length) throw new ErroSintaxe('faltou fechar a aspa dupla (")', this.linha);
    this.i++;
    soltar();
    // "" vazio ainda conta como uma palavra
    partes.push({ t: 'lit', v: '', q: true });
  }

  private cifrao(q: boolean): Parte | null {
    const s = this.src;
    const prox = s[this.i + 1];
    if (s.startsWith('$((', this.i)) {
      const fim = lerAteFecha(s, this.i + 3, '((', '))');
      if (fim < 0) throw new ErroSintaxe('faltou fechar o $(( com ))', this.linha);
      const src = s.slice(this.i + 3, fim - 2);
      this.i = fim;
      return { t: 'arit', src, q };
    }
    if (prox === '(') {
      const fim = lerAteFecha(s, this.i + 2, '(', ')');
      if (fim < 0) throw new ErroSintaxe('faltou fechar o $( com )', this.linha);
      const src = s.slice(this.i + 2, fim - 1);
      const linha = this.linha;
      this.linha += (src.match(/\n/g) ?? []).length;
      this.i = fim;
      return { t: 'cmd', src, q, linha };
    }
    if (prox === '{') {
      const fim = s.indexOf('}', this.i + 2);
      if (fim < 0) throw new ErroSintaxe('faltou fechar o ${ com }', this.linha);
      const dentro = s.slice(this.i + 2, fim);
      this.i = fim + 1;
      const m = dentro.match(/^(#?)([A-Za-z_]\w*|[0-9]+|[@*#?])(?:(:-|:=|-|=|#|%|\/)(.*))?$/s);
      if (!m) throw new ErroSintaxe(`\${${dentro}}: substituição inválida`, this.linha);
      if (m[1]) return { t: 'var', nome: '#' + m[2], q };
      const parte: Parte = { t: 'var', nome: m[2], q };
      if (m[3]) parte.padrao = { op: m[3], arg: new Lexico(m[4]).palavraSolta() };
      return parte;
    }
    const m = s.slice(this.i + 1).match(/^([A-Za-z_]\w*|[0-9]|[@*#?$!])/);
    if (!m) return null;
    this.i += 1 + m[1].length;
    return { t: 'var', nome: m[1], q };
  }

  /** O texto inteiro como uma palavra só (usado no ${x:-padrão}). */
  palavraSolta(): Palavra {
    const partes: Parte[] = [];
    let lit = '';
    while (this.i < this.src.length) {
      if (this.src[this.i] === '$') {
        const p = this.cifrao(false);
        if (p) { if (lit) partes.push({ t: 'lit', v: lit, q: true }); lit = ''; partes.push(p); continue; }
      }
      lit += this.src[this.i++];
    }
    if (lit) partes.push({ t: 'lit', v: lit, q: true });
    return { partes, linha: this.linha };
  }
}

/* ================================================================= sintaxe */

interface Redir { op: string; alvo: Palavra }
type Comando =
  | { k: 'simples'; palavras: Palavra[]; atribs: { nome: string; valor: Palavra; anexar: boolean }[]; redirs: Redir[]; linha: number }
  | { k: 'se'; ramos: { cond: Lista; corpo: Lista }[]; senao: Lista | null; redirs: Redir[]; linha: number }
  | { k: 'para'; var: string; itens: Palavra[] | null; corpo: Lista; redirs: Redir[]; linha: number }
  | { k: 'paraC'; ini: string; cond: string; passo: string; corpo: Lista; redirs: Redir[]; linha: number }
  | { k: 'enquanto'; cond: Lista; corpo: Lista; ate: boolean; redirs: Redir[]; linha: number }
  | { k: 'caso'; palavra: Palavra; ramos: { padroes: Palavra[]; corpo: Lista }[]; redirs: Redir[]; linha: number }
  | { k: 'grupo'; corpo: Lista; redirs: Redir[]; linha: number }
  | { k: 'funcao'; nome: string; corpo: Comando; linha: number }
  | { k: 'arit'; src: string; linha: number }
  | { k: 'teste2'; args: { texto: string; p: Palavra | null }[]; linha: number };

interface Tubo { negar: boolean; cmds: Comando[] }
interface EouOu { primeiro: Tubo; resto: { op: '&&' | '||'; tubo: Tubo }[] }
type Lista = EouOu[];

const RESERVADAS = new Set(['if', 'then', 'elif', 'else', 'fi', 'for', 'in', 'do', 'done', 'while', 'until', 'case', 'esac', '{', '}', '!', 'function']);

class Sintaxe {
  pos = 0;
  t: Token[];
  constructor(t: Token[]) {
    this.t = t;
  }

  get atual() { return this.t[this.pos]; }
  palavraLit(tok: Token = this.atual): string | null {
    if (tok.k !== 'palavra') return null;
    const p = tok.p.partes;
    return p.length === 1 && p[0].t === 'lit' && !p[0].q ? p[0].v : null;
  }
  ehPalavra(v: string) { return this.palavraLit() === v; }
  ehOp(v: string) { return this.atual.k === 'op' && this.atual.v === v; }
  pularLinhas() { while (this.ehOp('\n') || this.ehOp(';')) this.pos++; }
  pularQuebras() { while (this.ehOp('\n')) this.pos++; }

  esperar(v: string, contexto: string) {
    this.pularLinhas();
    if (!this.ehPalavra(v)) {
      const achou = this.atual.k === 'fim' ? 'o fim do script' : this.atual.k === 'palavra' ? `"${this.atual.bruto}"` : `"${this.atual.k === 'op' ? this.atual.v.replace('\n', 'quebra de linha') : '(('}"`;
      throw new ErroSintaxe(`esperava "${v}" ${contexto}, mas encontrou ${achou}`, this.atual.linha);
    }
    this.pos++;
  }

  programa(): Lista {
    const l = this.lista([]);
    if (this.atual.k !== 'fim') {
      const tok = this.atual;
      const v = tok.k === 'palavra' ? tok.bruto : tok.k === 'op' ? tok.v : '((';
      throw new ErroSintaxe(`"${v}" inesperado`, tok.linha);
    }
    return l;
  }

  /** Lê comandos até encontrar uma das palavras de parada (sem consumi-la). */
  lista(parar: string[]): Lista {
    const l: Lista = [];
    for (;;) {
      this.pularLinhas();
      const tok = this.atual;
      if (tok.k === 'fim') break;
      if (tok.k === 'op' && (tok.v === ')' || tok.v === ';;')) break;
      const lit = this.palavraLit();
      if (lit && parar.includes(lit)) break;
      l.push(this.eOuOu());
      if (this.ehOp('&')) throw new ErroSintaxe('rodar em segundo plano (&) não é suportado aqui', this.atual.linha);
    }
    return l;
  }

  eOuOu(): EouOu {
    const primeiro = this.tubo();
    const resto: EouOu['resto'] = [];
    while (this.ehOp('&&') || this.ehOp('||')) {
      const op = (this.atual as { v: '&&' | '||' }).v;
      this.pos++;
      this.pularQuebras();
      resto.push({ op, tubo: this.tubo() });
    }
    return { primeiro, resto };
  }

  tubo(): Tubo {
    let negar = false;
    if (this.ehPalavra('!')) { negar = true; this.pos++; }
    const cmds = [this.comando()];
    while (this.ehOp('|')) {
      this.pos++;
      this.pularQuebras();
      cmds.push(this.comando());
    }
    return { negar, cmds };
  }

  redirs(): Redir[] {
    const r: Redir[] = [];
    while (this.atual.k === 'op' && ['>', '>>', '<', '2>', '2>>', '2>&1', '&>'].includes(this.atual.v)) {
      const op = this.atual.v;
      this.pos++;
      if (op === '2>&1') { r.push({ op, alvo: { partes: [], linha: 0 } }); continue; }
      const tok = this.atual as Token;
      if (tok.k !== 'palavra') throw new ErroSintaxe(`faltou o nome do arquivo depois de ${op}`, tok.linha);
      r.push({ op, alvo: tok.p });
      this.pos++;
    }
    return r;
  }

  comando(): Comando {
    const tok = this.atual;
    const linha = tok.linha;
    if (tok.k === 'arit') { this.pos++; return { k: 'arit', src: tok.src, linha }; }
    if (tok.k === 'op' && tok.v === '(') throw new ErroSintaxe('subshell com ( ) não é suportado aqui; use { ...; }', linha);
    if (tok.k !== 'palavra' && !(tok.k === 'op' && ['>', '>>', '<', '2>'].includes(tok.v))) {
      const v = tok.k === 'op' ? tok.v.replace('\n', 'quebra de linha') : 'fim do script';
      throw new ErroSintaxe(`esperava um comando, mas encontrou "${v}"`, linha);
    }
    const lit = this.palavraLit();
    if (lit === 'if') {
      this.pos++;
      const ramos: { cond: Lista; corpo: Lista }[] = [];
      let senao: Lista | null = null;
      const cond = this.lista(['then']);
      this.esperar('then', 'depois da condição do if');
      ramos.push({ cond, corpo: this.lista(['elif', 'else', 'fi']) });
      for (;;) {
        this.pularLinhas();
        if (this.ehPalavra('elif')) {
          this.pos++;
          const c = this.lista(['then']);
          this.esperar('then', 'depois da condição do elif');
          ramos.push({ cond: c, corpo: this.lista(['elif', 'else', 'fi']) });
        } else if (this.ehPalavra('else')) {
          this.pos++;
          senao = this.lista(['fi']);
        } else break;
      }
      this.esperar('fi', 'para fechar o if');
      return { k: 'se', ramos, senao, redirs: this.redirs(), linha };
    }
    if (lit === 'for') {
      this.pos++;
      if (this.atual.k === 'arit') {
        const partes = this.atual.src.split(';');
        if (partes.length !== 3) throw new ErroSintaxe('o for estilo C precisa de três partes: for ((ini; cond; passo))', linha);
        this.pos++;
        this.pularLinhas();
        this.esperar('do', 'no for');
        const corpo = this.lista(['done']);
        this.esperar('done', 'para fechar o for');
        return { k: 'paraC', ini: partes[0], cond: partes[1], passo: partes[2], corpo, redirs: this.redirs(), linha };
      }
      const nome = this.palavraLit();
      if (!nome || !/^[A-Za-z_]\w*$/.test(nome)) throw new ErroSintaxe('depois do for vem o nome de uma variável (ex.: for arq in *.txt)', linha);
      this.pos++;
      let itens: Palavra[] | null = null;
      this.pularQuebras();
      if (this.ehPalavra('in')) {
        this.pos++;
        itens = [];
        while (this.atual.k === 'palavra') { itens.push(this.atual.p); this.pos++; }
      }
      this.esperar('do', 'no for');
      const corpo = this.lista(['done']);
      this.esperar('done', 'para fechar o for');
      return { k: 'para', var: nome, itens, corpo, redirs: this.redirs(), linha };
    }
    if (lit === 'while' || lit === 'until') {
      this.pos++;
      const cond = this.lista(['do']);
      this.esperar('do', `no ${lit}`);
      const corpo = this.lista(['done']);
      this.esperar('done', `para fechar o ${lit}`);
      return { k: 'enquanto', cond, corpo, ate: lit === 'until', redirs: this.redirs(), linha };
    }
    if (lit === 'case') {
      this.pos++;
      const t = this.atual;
      if (t.k !== 'palavra') throw new ErroSintaxe('faltou a palavra do case', linha);
      this.pos++;
      this.esperar('in', 'no case');
      const ramos: { padroes: Palavra[]; corpo: Lista }[] = [];
      for (;;) {
        this.pularLinhas();
        if (this.ehPalavra('esac')) break;
        if (this.ehOp('(')) this.pos++;
        const padroes: Palavra[] = [];
        for (;;) {
          const pt = this.atual;
          if (pt.k !== 'palavra') throw new ErroSintaxe('esperava um padrão no case (ex.: sim|s) )', pt.linha);
          padroes.push(pt.p);
          this.pos++;
          if (this.ehOp('|')) { this.pos++; continue; }
          break;
        }
        if (!this.ehOp(')')) throw new ErroSintaxe('faltou o ) depois do padrão do case', this.atual.linha);
        this.pos++;
        const corpo = this.lista(['esac']);
        ramos.push({ padroes, corpo });
        if (this.ehOp(';;')) this.pos++;
      }
      this.esperar('esac', 'para fechar o case');
      return { k: 'caso', palavra: t.p, ramos, redirs: this.redirs(), linha };
    }
    if (lit === '{') {
      this.pos++;
      const corpo = this.lista(['}']);
      this.esperar('}', 'para fechar o bloco { }');
      return { k: 'grupo', corpo, redirs: this.redirs(), linha };
    }
    if (lit === 'then' || lit === 'do' || lit === 'done' || lit === 'fi' || lit === 'else' || lit === 'elif' || lit === '}' || lit === 'esac') {
      throw new ErroSintaxe(`"${lit}" fora do lugar`, linha);
    }
    if (lit === 'function') {
      this.pos++;
      const nome = this.palavraLit();
      if (!nome) throw new ErroSintaxe('faltou o nome da função', linha);
      this.pos++;
      if (this.ehOp('(')) { this.pos++; if (!this.ehOp(')')) throw new ErroSintaxe('faltou o ) em nome()', linha); this.pos++; }
      this.pularQuebras();
      return { k: 'funcao', nome, corpo: this.comando(), linha };
    }
    // nome() { ... }
    if (lit && /^[A-Za-z_][\w-]*$/.test(lit) && this.t[this.pos + 1]?.k === 'op' && (this.t[this.pos + 1] as { v: string }).v === '(') {
      this.pos += 2;
      if (!this.ehOp(')')) throw new ErroSintaxe('faltou o ) em nome()', linha);
      this.pos++;
      this.pularQuebras();
      return { k: 'funcao', nome: lit, corpo: this.comando(), linha };
    }
    if (lit === '[[') {
      this.pos++;
      const args: { texto: string; p: Palavra | null }[] = [];
      while (!this.ehPalavra(']]')) {
        const t = this.atual as Token;
        if (t.k === 'fim' || (t.k === 'op' && t.v === '\n')) throw new ErroSintaxe('faltou fechar o [[ com ]]', linha);
        if (t.k === 'op') args.push({ texto: t.v, p: null });
        else if (t.k === 'palavra') args.push({ texto: t.bruto, p: t.p });
        else args.push({ texto: `((${t.src}))`, p: null });
        this.pos++;
      }
      this.pos++;
      return { k: 'teste2', args, linha };
    }

    const palavras: Palavra[] = [];
    const atribs: { nome: string; valor: Palavra; anexar: boolean }[] = [];
    const redirs: Redir[] = [];
    for (;;) {
      redirs.push(...this.redirs());
      const t = this.atual;
      if (t.k !== 'palavra') break;
      const m = palavras.length === 0 ? t.bruto.match(/^([A-Za-z_]\w*)(\+?)=/) : null;
      if (m) {
        // tira "nome=" do começo da primeira parte literal
        const partes = [...t.p.partes];
        const p0 = partes[0];
        if (p0.t === 'lit' && !p0.q && p0.v.startsWith(m[0])) {
          const resto = p0.v.slice(m[0].length);
          if (resto) partes[0] = { t: 'lit', v: resto, q: false };
          else partes.shift();
          atribs.push({ nome: m[1], valor: { partes, linha: t.linha }, anexar: !!m[2] });
          this.pos++;
          continue;
        }
      }
      palavras.push(t.p);
      this.pos++;
    }
    if (!palavras.length && !atribs.length && !redirs.length) throw new ErroSintaxe('esperava um comando', linha);
    if (palavras.length === 1 && this.ehOp('(')) throw new ErroSintaxe('para definir uma função escreva nome() { comandos; }', linha);
    return { k: 'simples', palavras, atribs, redirs, linha };
  }
}

/* =========================================================== aritmética */

class Aritmetica {
  i = 0;
  toks: string[];
  ler: (n: string) => string;
  gravar: (n: string, v: string) => void;
  constructor(src: string, ler: (n: string) => string, gravar: (n: string, v: string) => void) {
    this.ler = ler;
    this.gravar = gravar;
    this.toks = src.match(/\d+|[A-Za-z_]\w*|\*\*=?|\+\+|--|<<=?|>>=?|<=|>=|==|!=|&&|\|\||[-+*/%&|^]=|[-+*/%()<>!=?:,~&|^]|\$\w+|\S/g) ?? [];
    this.toks = this.toks.map((t) => (t.startsWith('$') ? t.slice(1) : t));
  }

  avaliar(): number {
    if (!this.toks.length) return 0;
    let v = this.virgula();
    if (this.i < this.toks.length) throw new Error(`erro de sintaxe na expressão (perto de "${this.toks[this.i]}")`);
    return v;
  }
  private olha() { return this.toks[this.i]; }
  private come(t: string) { if (this.toks[this.i] === t) { this.i++; return true; } return false; }
  private valor(n: string): number {
    const s = this.ler(n).trim();
    if (!s) return 0;
    if (/^-?\d+$/.test(s)) return Number(s);
    if (/^[A-Za-z_]\w*$/.test(s)) return this.valor(s);
    throw new Error(`"${s}" não é um número inteiro`);
  }
  private virgula(): number {
    let v = this.atrib();
    while (this.come(',')) v = this.atrib();
    return v;
  }
  private atrib(): number {
    const a = this.toks[this.i], op = this.toks[this.i + 1];
    if (a && /^[A-Za-z_]\w*$/.test(a) && op && /^([-+*/%]|\*\*|<<|>>|&|\||\^)?=$/.test(op) && op !== '==') {
      this.i += 2;
      const dir = this.atrib();
      const atual = this.valor(a);
      const v = op === '=' ? dir : this.binaria(op.slice(0, -1), atual, dir);
      this.gravar(a, String(v));
      return v;
    }
    return this.ternario();
  }
  private ternario(): number {
    const c = this.ou();
    if (this.come('?')) {
      const a = this.atrib();
      if (!this.come(':')) throw new Error('faltou o : no operador ternário');
      const b = this.atrib();
      return c ? a : b;
    }
    return c;
  }
  private binaria(op: string, a: number, b: number): number {
    switch (op) {
      case '+': return a + b;
      case '-': return a - b;
      case '*': return Math.imul(a, b) === a * b ? a * b : a * b;
      case '/': if (b === 0) throw new Error('divisão por zero'); return Math.trunc(a / b);
      case '%': if (b === 0) throw new Error('divisão por zero'); return a % b;
      case '**': return a ** b;
      case '<<': return a << b;
      case '>>': return a >> b;
      case '&': return a & b;
      case '|': return a | b;
      case '^': return a ^ b;
    }
    throw new Error(`operador desconhecido ${op}`);
  }
  private nivel(ops: string[], prox: () => number, f: (op: string, a: number, b: number) => number): number {
    let v = prox();
    for (;;) {
      const op = this.olha();
      if (!ops.includes(op)) return v;
      this.i++;
      v = f(op, v, prox());
    }
  }
  private ou(): number { return this.nivel(['||'], () => this.e(), (_, a, b) => (a || b ? 1 : 0)); }
  private e(): number { return this.nivel(['&&'], () => this.bitOu(), (_, a, b) => (a && b ? 1 : 0)); }
  private bitOu(): number { return this.nivel(['|'], () => this.bitXor(), (o, a, b) => this.binaria(o, a, b)); }
  private bitXor(): number { return this.nivel(['^'], () => this.bitE(), (o, a, b) => this.binaria(o, a, b)); }
  private bitE(): number { return this.nivel(['&'], () => this.igual(), (o, a, b) => this.binaria(o, a, b)); }
  private igual(): number { return this.nivel(['==', '!='], () => this.rel(), (o, a, b) => ((o === '==') === (a === b) ? 1 : 0)); }
  private rel(): number {
    return this.nivel(['<', '<=', '>', '>='], () => this.desloc(), (o, a, b) => (o === '<' ? a < b : o === '<=' ? a <= b : o === '>' ? a > b : a >= b) ? 1 : 0);
  }
  private desloc(): number { return this.nivel(['<<', '>>'], () => this.soma(), (o, a, b) => this.binaria(o, a, b)); }
  private soma(): number { return this.nivel(['+', '-'], () => this.mult(), (o, a, b) => this.binaria(o, a, b)); }
  private mult(): number { return this.nivel(['*', '/', '%'], () => this.pot(), (o, a, b) => this.binaria(o, a, b)); }
  private pot(): number {
    const b = this.unario();
    if (this.come('**')) return b ** this.pot();
    return b;
  }
  private unario(): number {
    const t = this.olha();
    if (t === '-') { this.i++; return -this.unario(); }
    if (t === '+') { this.i++; return this.unario(); }
    if (t === '!') { this.i++; return this.unario() ? 0 : 1; }
    if (t === '~') { this.i++; return ~this.unario(); }
    if (t === '++' || t === '--') {
      this.i++;
      const n = this.toks[this.i++];
      if (!n || !/^[A-Za-z_]\w*$/.test(n)) throw new Error(`${t} precisa de uma variável`);
      const v = this.valor(n) + (t === '++' ? 1 : -1);
      this.gravar(n, String(v));
      return v;
    }
    return this.posfixo();
  }
  private posfixo(): number {
    const t = this.toks[this.i++];
    if (t === undefined) throw new Error('expressão incompleta');
    if (t === '(') {
      const v = this.virgula();
      if (!this.come(')')) throw new Error('faltou fechar o parêntese');
      return v;
    }
    if (/^\d+$/.test(t)) return Number(t);
    if (/^[A-Za-z_]\w*$/.test(t)) {
      const v = this.valor(t);
      if (this.olha() === '++' || this.olha() === '--') {
        this.gravar(t, String(v + (this.olha() === '++' ? 1 : -1)));
        this.i++;
      }
      return v;
    }
    throw new Error(`erro de sintaxe na expressão (perto de "${t}")`);
  }
}

/* ============================================================== execução */

class Saida extends Error { codigo: number; constructor(codigo: number) { super('exit'); this.codigo = codigo; } }
class Retorno extends Error { codigo: number; constructor(codigo: number) { super('return'); this.codigo = codigo; } }
class Quebra extends Error {
  tipo: 'break' | 'continue';
  n: number;
  constructor(tipo: 'break' | 'continue', n: number) { super(tipo); this.tipo = tipo; this.n = n; }
}
class Limite extends Error {}

interface ES {
  entrada: { texto: string; pos: number };
  out: (s: string) => void;
  err: (s: string) => void;
}

interface Campo { texto: string; padrao: string | null }

/** Converte um glob (*, ?, [abc]) em RegExp. */
function globRegex(glob: string, inteiro = true): RegExp {
  let r = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '\u0000') { r += glob[++i].replace(/[.*+?^${}()|[\]\\/]/g, '\\$&'); continue; }
    if (c === '*') r += '.*';
    else if (c === '?') r += '.';
    else if (c === '[') {
      const f = glob.indexOf(']', i + 1);
      if (f < 0) { r += '\\['; continue; }
      let classe = glob.slice(i + 1, f);
      if (classe.startsWith('!')) classe = '^' + classe.slice(1);
      r += `[${classe.replace(/\\/g, '\\\\')}]`;
      i = f;
    } else r += c.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
  }
  return new RegExp(inteiro ? `^${r}$` : r, 's');
}

const temGlob = (padrao: string) => /(^|[^\u0000])[*?[]/.test(padrao);

const EXPLICACOES: Record<string, string> = {
  'Erro de sintaxe': 'O script não segue as regras do shell. Confira se todo if termina em fi, todo for/while em done, se há ; ou quebra de linha antes de then/do e se as aspas estão fechadas.',
  'Comando não encontrado': 'O shell não conhece esse comando: confira a grafia (maiúsculas contam). Lembre que, para guardar um valor numa variável, não pode haver espaço em volta do = (nome=valor).',
  'Tempo esgotado': 'O script demorou demais: provavelmente um laço que nunca termina (confira se a condição do while muda).',
  'Erro de expressão': 'A conta dentro de $(( )) ou (( )) tem um problema: confira os operadores e se as variáveis têm números.',
};

class Shell {
  fs = new SistemaArquivos();
  vars = new Map<string, string>([['HOME', HOME], ['USER', 'aluno'], ['PWD', HOME], ['SHELL', '/bin/bash'], ['PATH', '/usr/local/bin:/usr/bin:/bin']]);
  exportadas = new Set(['HOME', 'USER', 'PWD', 'SHELL', 'PATH']);
  locais: Map<string, string | undefined>[] = [];
  funcoes = new Map<string, Comando>();
  posicionais: string[] = [];
  cwd = HOME;
  status = 0;
  passos = 0;
  inicio = Date.now();
  linhaAtual = 0;
  primeiroErro: ErroShell | null = null;
  /** a entrada digitada pelo aluno (campo de entradas); o read ecoa o que leu dela, como num terminal */
  entradaTeclado: ES['entrada'] | null = null;

  /* ------------------------------------------------------------ variáveis */

  ler(nome: string): string {
    if (nome === '?') return String(this.status);
    if (nome === '#') return String(this.posicionais.length);
    if (nome === '@' || nome === '*') return this.posicionais.join(' ');
    if (nome === '$') return '4242';
    if (nome === '!') return '';
    if (nome === '0') return 'script.sh';
    if (/^\d+$/.test(nome)) return this.posicionais[Number(nome) - 1] ?? '';
    if (nome === 'RANDOM') return String(Math.floor(Math.random() * 32768));
    if (nome === 'PWD') return this.cwd;
    return this.vars.get(nome) ?? '';
  }

  gravar(nome: string, valor: string) {
    this.vars.set(nome, valor);
  }

  /* ------------------------------------------------------------ expansão */

  async valorParte(p: Extract<Parte, { t: 'var' }>, es: ES): Promise<string> {
    if (p.nome.length > 1 && p.nome.startsWith('#')) return String(this.ler(p.nome.slice(1)).length);
    const v = this.ler(p.nome);
    const definido = p.nome.length > 1 || /[A-Za-z_]/.test(p.nome) ? this.vars.has(p.nome) || /^\d+$/.test(p.nome) && Number(p.nome) <= this.posicionais.length : true;
    if (!p.padrao) return v;
    const { op, arg } = p.padrao;
    const argTxt = async () => (await this.expandir(arg, es, false)).map((c) => c.texto).join(' ');
    if (op === ':-') return v ? v : argTxt();
    if (op === '-') return definido ? v : argTxt();
    if (op === ':=' || op === '=') {
      if (op === ':=' ? v : definido) return v;
      const a = await argTxt();
      this.gravar(p.nome, a);
      return a;
    }
    const pad = await argTxt();
    if (op === '#') {
      const re = globRegex(pad, false);
      for (let i = 0; i <= v.length; i++) if (new RegExp(`^(?:${re.source})$`, 's').test(v.slice(0, i))) return v.slice(i);
      return v;
    }
    if (op === '%') {
      const re = new RegExp(`^(?:${globRegex(pad, false).source})$`, 's');
      for (let i = v.length; i >= 0; i--) if (re.test(v.slice(i))) return v.slice(0, i);
      return v;
    }
    if (op === '/') {
      const [de, para = ''] = pad.split('/');
      const todos = de.startsWith('/');
      const re = new RegExp(globRegex(todos ? de.slice(1) : de, false).source, todos ? 'g' : '');
      return v.replace(re, () => para);
    }
    return v;
  }

  /** Expande uma palavra em campos (divide os $var sem aspas, expande globs). */
  async expandir(w: Palavra, es: ES, globs = true): Promise<Campo[]> {
    const campos: Campo[] = [];
    let atual = '';
    let padrao = '';
    let tem = false;
    const soltar = () => {
      if (tem) campos.push({ texto: atual, padrao: padrao });
      atual = '';
      padrao = '';
      tem = false;
    };
    const literal = (s: string, q: boolean) => {
      atual += s;
      padrao += q ? s.replace(/[\s\S]/g, (c) => '\u0000' + c) : s;
      tem = true;
    };
    const dividir = (s: string, q: boolean) => {
      if (q) { literal(s, true); return; }
      const pedacos = s.split(/[ \t\n]+/);
      pedacos.forEach((p, i) => {
        if (i > 0) soltar();
        if (p) literal(p, true);
      });
    };
    for (const p of w.partes) {
      if (p.t === 'lit') {
        if (p.q) literal(p.v, true);
        else literal(p.v, false);
      } else if (p.t === 'var') {
        if ((p.nome === '@' || p.nome === '*') && p.q && p.nome === '@') {
          this.posicionais.forEach((a, i) => {
            if (i > 0) soltar();
            literal(a, true);
          });
          if (!this.posicionais.length) {/* "$@" vazio: nenhum campo */}
          continue;
        }
        const v = await this.valorParte(p, es);
        if (p.q) literal(v, true);
        else dividir(v, false);
      } else if (p.t === 'cmd') {
        const v = (await this.capturar(p.src, es, p.linha)).replace(/\n+$/, '');
        dividir(v, p.q);
      } else {
        const sub = await this.expandirTexto(p.src, es);
        dividir(String(this.aritmetica(sub)), p.q);
      }
    }
    soltar();
    if (!globs) return campos;
    const out: Campo[] = [];
    for (const c of campos) {
      if (c.padrao && temGlob(c.padrao)) {
        const achados = this.glob(c.padrao);
        if (achados.length) { achados.forEach((a) => out.push({ texto: a, padrao: null })); continue; }
      }
      out.push(c);
    }
    return out;
  }

  /** Expande $var e $(cmd) dentro de um texto (usado na aritmética). */
  async expandirTexto(src: string, es: ES): Promise<string> {
    if (!src.includes('$') && !src.includes('`')) return src;
    const w = new Lexico(src).palavraSolta();
    const campos = await this.expandir(w, es, false);
    return campos.map((c) => c.texto).join(' ');
  }

  async palavras(ws: Palavra[], es: ES): Promise<string[]> {
    const out: string[] = [];
    for (const w of ws) out.push(...(await this.expandir(w, es)).map((c) => c.texto));
    return out;
  }

  async umaPalavra(w: Palavra, es: ES): Promise<string> {
    return (await this.expandir(w, es, false)).map((c) => c.texto).join(' ');
  }

  glob(padrao: string): string[] {
    const absoluto = padrao.startsWith('/');
    const partes = padrao.split('/').filter((p, i) => p || i > 0);
    let candidatos: string[] = [absoluto ? '/' : ''];
    for (const parte of partes.filter(Boolean)) {
      const proximos: string[] = [];
      for (const base of candidatos) {
        const dirAbs = SistemaArquivos.normalizar(base || '.', this.cwd);
        const no = this.fs.obter(dirAbs);
        if (!temGlob(parte)) {
          const nome = parte.replace(/\u0000/g, '');
          const cam = base === '/' ? `/${nome}` : base ? `${base}/${nome}` : nome;
          if (this.fs.obter(SistemaArquivos.normalizar(cam, this.cwd))) proximos.push(cam);
          continue;
        }
        if (!no || no.tipo !== 'dir') continue;
        const re = globRegex(parte);
        const nomes = [...no.filhos.keys()].filter((n) => re.test(n) && (!n.startsWith('.') || parte.replace(/\u0000/g, '').startsWith('.'))).sort(comparar);
        for (const n of nomes) proximos.push(base === '/' ? `/${n}` : base ? `${base}/${n}` : n);
      }
      candidatos = proximos;
    }
    return candidatos.filter((c) => c !== '' && c !== '/');
  }

  aritmetica(src: string): number {
    try {
      return new Aritmetica(src, (n) => this.ler(n), (n, v) => this.gravar(n, v)).avaliar();
    } catch (e) {
      throw new ErroExecucao('Erro de expressão', `$(( ${src.trim()} )): ${(e as Error).message}`, this.linhaAtual);
    }
  }

  /* ----------------------------------------------------------- execução */

  passo() {
    if (++this.passos > LIMITE_PASSOS || Date.now() - this.inicio > LIMITE_MS) throw new Limite();
  }

  async capturar(src: string, es: ES, linha: number): Promise<string> {
    const lista = analisar(src, linha);
    let out = '';
    const salvo = this.status;
    try {
      await this.lista(lista, { entrada: es.entrada, out: (s) => (out += s), err: es.err });
    } catch (e) {
      if (!(e instanceof Saida)) throw e;
    }
    void salvo;
    return out;
  }

  async lista(l: Lista, es: ES): Promise<number> {
    for (const item of l) {
      let st = await this.tubo(item.primeiro, es);
      for (const r of item.resto) {
        if ((r.op === '&&' && st === 0) || (r.op === '||' && st !== 0)) st = await this.tubo(r.tubo, es);
      }
      this.status = st;
    }
    return this.status;
  }

  async tubo(t: Tubo, es: ES): Promise<number> {
    let st = 0;
    if (t.cmds.length === 1) {
      st = await this.comando(t.cmds[0], es);
    } else {
      let entrada = es.entrada;
      for (let i = 0; i < t.cmds.length; i++) {
        const ultimo = i === t.cmds.length - 1;
        let buf = '';
        st = await this.comando(t.cmds[i], { entrada, out: ultimo ? es.out : (s) => (buf += s), err: es.err });
        entrada = { texto: buf, pos: 0 };
      }
    }
    if (t.negar) st = st ? 0 : 1;
    this.status = st;
    return st;
  }

  async comRedirs(redirs: Redir[], es: ES, f: (es: ES) => Promise<number>): Promise<number> {
    if (!redirs.length) return f(es);
    let nova: ES = { ...es };
    const arquivos: { cam: string; buf: { s: string }; anexar: boolean }[] = [];
    for (const r of redirs) {
      if (r.op === '2>&1') { nova = { ...nova, err: nova.out }; continue; }
      const alvo = await this.umaPalavra(r.alvo, es);
      if (r.op === '<') {
        const no = this.fs.obter(SistemaArquivos.normalizar(alvo, this.cwd));
        if (!no || no.tipo !== 'arq') {
          es.err(`bash: ${alvo}: ${no ? 'É um diretório' : 'Arquivo ou diretório inexistente'}\n`);
          return 1;
        }
        nova = { ...nova, entrada: { texto: no.conteudo, pos: 0 } };
        continue;
      }
      if (alvo === '/dev/null') {
        if (r.op.startsWith('2')) nova = { ...nova, err: () => {} };
        else if (r.op === '&>') nova = { ...nova, out: () => {}, err: () => {} };
        else nova = { ...nova, out: () => {} };
        continue;
      }
      const cam = SistemaArquivos.normalizar(alvo, this.cwd);
      const anexar = r.op.endsWith('>>');
      const erro = this.fs.escrever(cam, '', true);
      if (erro) { es.err(`bash: ${alvo}: ${erro}\n`); return 1; }
      if (!anexar) this.fs.escrever(cam, '', false);
      const buf = { s: '' };
      arquivos.push({ cam, buf, anexar: true });
      const escrever = (s: string) => { buf.s += s; this.fs.escrever(cam, s, true); };
      if (r.op === '&>') nova = { ...nova, out: escrever, err: escrever };
      else if (r.op.startsWith('2')) nova = { ...nova, err: escrever };
      else nova = { ...nova, out: escrever };
    }
    return f(nova);
  }

  async comando(c: Comando, es: ES): Promise<number> {
    this.passo();
    this.linhaAtual = c.linha;
    switch (c.k) {
      case 'simples': return this.simples(c, es);
      case 'arit': {
        const v = this.aritmetica(await this.expandirTexto(c.src, es));
        return v ? 0 : 1;
      }
      case 'teste2': return this.teste2(c, es);
      case 'funcao':
        this.funcoes.set(c.nome, c.corpo);
        return 0;
      case 'grupo': return this.comRedirs(c.redirs, es, (e) => this.lista(c.corpo, e));
      case 'se':
        return this.comRedirs(c.redirs, es, async (e) => {
          for (const r of c.ramos) {
            if ((await this.lista(r.cond, e)) === 0) return this.lista(r.corpo, e);
          }
          return c.senao ? this.lista(c.senao, e) : 0;
        });
      case 'para':
        return this.comRedirs(c.redirs, es, async (e) => {
          const itens = c.itens ? await this.palavras(c.itens, e) : [...this.posicionais];
          let st = 0;
          for (const it of itens) {
            this.passo();
            this.gravar(c.var, it);
            const r = await this.corpoLaco(c.corpo, e);
            st = r.st;
            if (r.sair) break;
          }
          return st;
        });
      case 'paraC':
        return this.comRedirs(c.redirs, es, async (e) => {
          let st = 0;
          if (c.ini.trim()) this.aritmetica(await this.expandirTexto(c.ini, e));
          while (!c.cond.trim() || this.aritmetica(await this.expandirTexto(c.cond, e))) {
            this.passo();
            const r = await this.corpoLaco(c.corpo, e);
            st = r.st;
            if (r.sair) break;
            if (c.passo.trim()) this.aritmetica(await this.expandirTexto(c.passo, e));
          }
          return st;
        });
      case 'enquanto':
        return this.comRedirs(c.redirs, es, async (e) => {
          let st = 0;
          for (;;) {
            this.passo();
            const cond = await this.lista(c.cond, e);
            if ((cond === 0) === c.ate) break;
            const r = await this.corpoLaco(c.corpo, e);
            st = r.st;
            if (r.sair) break;
          }
          return st;
        });
      case 'caso':
        return this.comRedirs(c.redirs, es, async (e) => {
          const v = await this.umaPalavra(c.palavra, e);
          for (const r of c.ramos) {
            for (const p of r.padroes) {
              const campos = await this.expandir(p, e, false);
              const pad = campos.map((x) => x.padrao ?? '').join(' ');
              if (globRegex(pad).test(v)) return this.lista(r.corpo, e);
            }
          }
          return 0;
        });
    }
  }

  nivelLaco = 0;
  async corpoLaco(corpo: Lista, es: ES): Promise<{ st: number; sair: boolean }> {
    this.nivelLaco++;
    try {
      return { st: await this.lista(corpo, es), sair: false };
    } catch (e) {
      if (e instanceof Quebra) {
        if (e.n > 1) { e.n--; throw e; }
        return { st: 0, sair: e.tipo === 'break' };
      }
      throw e;
    } finally {
      this.nivelLaco--;
    }
  }

  async simples(c: Extract<Comando, { k: 'simples' }>, es: ES): Promise<number> {
    const args = await this.palavras(c.palavras, es);
    const valores: [string, string, boolean][] = [];
    for (const a of c.atribs) valores.push([a.nome, await this.umaPalavra(a.valor, es), a.anexar]);
    if (!args.length) {
      for (const [n, v, anexar] of valores) this.gravar(n, anexar ? this.ler(n) + v : v);
      return this.comRedirs(c.redirs, es, async () => 0);
    }
    // VAR=x comando: vale só para aquele comando
    const antigos = valores.map(([n]) => [n, this.vars.get(n)] as const);
    for (const [n, v] of valores) this.gravar(n, v);
    try {
      return await this.comRedirs(c.redirs, es, (e) => this.rodar(args, e, c.linha));
    } finally {
      for (const [n, v] of antigos) { if (v === undefined) this.vars.delete(n); else this.vars.set(n, v); }
    }
  }

  async rodar(args: string[], es: ES, linha: number): Promise<number> {
    const [nome, ...resto] = args;
    const f = this.funcoes.get(nome);
    if (f) {
      const salvos = this.posicionais;
      this.posicionais = resto;
      this.locais.push(new Map());
      try {
        return await this.comando(f, es);
      } catch (e) {
        if (e instanceof Retorno) return e.codigo;
        throw e;
      } finally {
        this.posicionais = salvos;
        const loc = this.locais.pop()!;
        for (const [n, v] of loc) { if (v === undefined) this.vars.delete(n); else this.vars.set(n, v); }
      }
    }
    const cmd = COMANDOS[nome];
    if (!cmd) {
      es.err(`bash: linha ${linha}: ${nome}: comando não encontrado\n`);
      if (!this.primeiroErro) {
        const sugestao = sugerir(nome);
        let dica: string | null = sugestao ? `Você quis dizer ${sugestao}?` : null;
        if (/^[A-Za-z_]\w*$/.test(nome) && resto[0]?.startsWith('=')) dica = `Para criar a variável, tire os espaços em volta do =: ${nome}=${resto[0].slice(1) || resto[1] || 'valor'}`;
        this.primeiroErro = erroShell('Comando não encontrado', `${nome}: comando não encontrado`, linha, dica);
      }
      return 127;
    }
    try {
      return await cmd(this, resto, es);
    } catch (e) {
      if (e instanceof ErroUso) {
        es.err(`${nome}: ${e.message}\n`);
        return e.codigo;
      }
      throw e;
    }
  }

  async teste2(c: Extract<Comando, { k: 'teste2' }>, es: ES): Promise<number> {
    // [[ ]]: sem divisão de palavras; && || ! e ( ) lógicos; == com padrão; =~ com regex
    const itens: { texto: string; campo: Campo | null; op: boolean }[] = [];
    for (const a of c.args) {
      if (!a.p) { itens.push({ texto: a.texto, campo: null, op: true }); continue; }
      const campos = await this.expandir(a.p, es, false);
      const campo = { texto: campos.map((x) => x.texto).join(' '), padrao: campos.map((x) => x.padrao ?? '').join(' ') };
      const lit = a.p.partes.length === 1 && a.p.partes[0].t === 'lit' && !a.p.partes[0].q;
      itens.push({ texto: campo.texto, campo, op: lit && ['!', '(', ')', '==', '=', '!=', '=~', '-eq', '-ne', '-lt', '-le', '-gt', '-ge', '-z', '-n', '-f', '-d', '-e', '-s', '-r', '-w', '-x'].includes(a.texto) });
    }
    let i = 0;
    const olha = () => itens[i];
    const ou = (): boolean => {
      let v = e();
      while (olha()?.op && olha().texto === '||') { i++; const d = e(); v = v || d; }
      return v;
    };
    const e = (): boolean => {
      let v = nao();
      while (olha()?.op && olha().texto === '&&') { i++; const d = nao(); v = v && d; }
      return v;
    };
    const nao = (): boolean => {
      if (olha()?.op && olha().texto === '!') { i++; return !nao(); }
      if (olha()?.op && olha().texto === '(') {
        i++;
        const v = ou();
        if (olha()?.texto === ')') i++;
        return v;
      }
      return prim();
    };
    const prim = (): boolean => {
      const a = itens[i];
      if (!a) throw new ErroUso('[[: expressão incompleta', 2);
      if (a.op && /^-[zndfesrwx]$/.test(a.texto) && itens[i + 1] && !(itens[i + 1].op && ['&&', '||', ')'].includes(itens[i + 1].texto))) {
        i += 2;
        return testeUnario(this, a.texto, itens[i - 1].texto);
      }
      const op = itens[i + 1];
      if (op?.op && ['==', '=', '!=', '=~', '<', '>', '-eq', '-ne', '-lt', '-le', '-gt', '-ge'].includes(op.texto)) {
        const b = itens[i + 2];
        if (!b) throw new ErroUso(`[[: faltou o valor depois de ${op.texto}`, 2);
        i += 3;
        if (op.texto === '==' || op.texto === '=' || op.texto === '!=') {
          const ok = globRegex(b.campo?.padrao ?? b.texto).test(a.texto);
          return op.texto === '!=' ? !ok : ok;
        }
        if (op.texto === '=~') {
          try {
            const m = a.texto.match(new RegExp(b.texto));
            return !!m;
          } catch {
            throw new ErroUso(`[[: regex inválida: ${b.texto}`, 2);
          }
        }
        if (op.texto === '<') return a.texto < b.texto;
        if (op.texto === '>') return a.texto > b.texto;
        const x = this.aritmetica(a.texto), y = this.aritmetica(b.texto);
        return compararNum(op.texto, x, y);
      }
      i++;
      return a.texto !== '';
    };
    try {
      const v = ou();
      return v ? 0 : 1;
    } catch (err) {
      if (err instanceof ErroUso) { es.err(`bash: linha ${c.linha}: ${err.message}\n`); return 2; }
      throw err;
    }
  }
}

class ErroExecucao extends Error {
  tipo: string;
  linha: number;
  constructor(tipo: string, msg: string, linha: number) { super(msg); this.tipo = tipo; this.linha = linha; }
}
class ErroUso extends Error {
  codigo: number;
  constructor(msg: string, codigo = 1) { super(msg); this.codigo = codigo; }
}

function erroShell(tipo: string, mensagem: string, linha: number | null, dica: string | null = null): ErroShell {
  return { tipo, mensagem, linha, explicacao: EXPLICACOES[tipo] ?? '', dica, traceback: `${tipo}: ${mensagem}${linha ? ` (linha ${linha})` : ''}` };
}

function analisar(src: string, linhaBase = 1): Lista {
  const lex = new Lexico(src);
  lex.linha = linhaBase;
  return new Sintaxe(lex.tokens()).programa();
}

const comparar = (a: string, b: string) => a.localeCompare(b, 'pt-BR');

function compararNum(op: string, x: number, y: number) {
  switch (op) {
    case '-eq': return x === y;
    case '-ne': return x !== y;
    case '-lt': return x < y;
    case '-le': return x <= y;
    case '-gt': return x > y;
    case '-ge': return x >= y;
  }
  return false;
}

function testeUnario(sh: Shell, op: string, v: string): boolean {
  if (op === '-z') return v === '';
  if (op === '-n') return v !== '';
  const no = sh.fs.obter(SistemaArquivos.normalizar(v, sh.cwd));
  if (op === '-f') return no?.tipo === 'arq';
  if (op === '-d') return no?.tipo === 'dir';
  if (op === '-s') return no?.tipo === 'arq' && no.conteudo.length > 0;
  if (op === '-x') return no?.tipo === 'dir';
  return !!no;
}

function numero(s: string, cmd: string): number {
  if (!/^\s*[-+]?\d+\s*$/.test(s)) throw new ErroUso(`${cmd}: ${s}: esperava um número inteiro`, 2);
  return Number(s);
}

/* ============================================================== comandos */

type Cmd = (sh: Shell, args: string[], es: ES) => number | Promise<number>;

/** Separa as opções curtas (-n, -la, -n 3) dos argumentos. */
function opcoes(args: string[], comValor = ''): { o: Map<string, string>; resto: string[] } {
  const o = new Map<string, string>();
  const resto: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--') { resto.push(...args.slice(i + 1)); break; }
    if (a.startsWith('-') && a.length > 1 && !/^-\d/.test(a)) {
      for (let j = 1; j < a.length; j++) {
        const l = a[j];
        if (comValor.includes(l)) {
          const v = a.slice(j + 1) || args[++i];
          if (v === undefined) throw new ErroUso(`a opção -${l} precisa de um valor`, 2);
          o.set(l, v);
          break;
        }
        o.set(l, '');
      }
    } else resto.push(a);
  }
  return { o, resto };
}

function lerEntradas(sh: Shell, arqs: string[], es: ES, cmd: string): { textos: { nome: string; texto: string }[]; falhou: boolean } {
  if (!arqs.length || (arqs.length === 1 && arqs[0] === '-')) {
    const texto = es.entrada.texto.slice(es.entrada.pos);
    es.entrada.pos = es.entrada.texto.length;
    return { textos: [{ nome: '', texto }], falhou: false };
  }
  const textos: { nome: string; texto: string }[] = [];
  let falhou = false;
  for (const a of arqs) {
    const no = sh.fs.obter(SistemaArquivos.normalizar(a, sh.cwd));
    if (!no) { es.err(`${cmd}: ${a}: Arquivo ou diretório inexistente\n`); falhou = true; continue; }
    if (no.tipo === 'dir') { es.err(`${cmd}: ${a}: É um diretório\n`); falhou = true; continue; }
    textos.push({ nome: a, texto: no.conteudo });
  }
  return { textos, falhou };
}

const linhasDe = (t: string) => (t === '' ? [] : t.replace(/\n$/, '').split('\n'));

function escapes(s: string): string {
  return s.replace(/\\(n|t|\\|e|a|r|0[0-7]{0,3}|c)/g, (_, c: string) =>
    c === 'n' ? '\n' : c === 't' ? '\t' : c === '\\' ? '\\' : c === 'r' ? '\r' : c === 'e' ? '\x1b' : c === 'a' ? '' : c === 'c' ? '\u0001FIM' : String.fromCharCode(parseInt(c.slice(1) || '0', 8)));
}

function formatar(fmt: string, args: string[]): string {
  let out = '';
  let k = 0;
  const um = () => {
    out += escapes(fmt).replace(/%([-+ 0#]*)(\d*)(?:\.(\d+))?([sdifxXoc%b])/g, (_, flags: string, larg: string, prec: string | undefined, tipo: string) => {
      if (tipo === '%') return '%';
      const a = args[k++] ?? '';
      let s: string;
      if (tipo === 's') s = prec !== undefined ? a.slice(0, Number(prec)) : a;
      else if (tipo === 'b') s = escapes(a);
      else if (tipo === 'c') s = a[0] ?? '';
      else if (tipo === 'f') s = (Number(a) || 0).toFixed(prec !== undefined ? Number(prec) : 6);
      else {
        const n = a === '' ? 0 : Number(a.replace(/^'(.)/, (_m, c: string) => String(c.charCodeAt(0))));
        if (Number.isNaN(n)) throw new ErroUso(`printf: ${a}: número inválido`);
        const i = Math.trunc(n);
        s = tipo === 'x' ? i.toString(16) : tipo === 'X' ? i.toString(16).toUpperCase() : tipo === 'o' ? i.toString(8) : String(i);
        if (flags.includes('+') && i >= 0) s = '+' + s;
      }
      const w = Number(larg || 0);
      if (s.length < w) s = flags.includes('-') ? s.padEnd(w) : flags.includes('0') && tipo !== 's' ? s.padStart(w, '0') : s.padStart(w);
      return s;
    });
  };
  const usa = /%[-+ 0#]*\d*(?:\.\d+)?[sdifxXocb]/.test(fmt);
  do um(); while (usa && k < args.length);
  const corte = out.indexOf('\u0001FIM');
  return corte >= 0 ? out.slice(0, corte) : out;
}

function regexBasica(p: string, estendida: boolean, flags: string): RegExp {
  let src = p;
  if (!estendida) {
    // BRE: + ? | ( ) { } são literais; \+ \? \| \( \) \{ \} são especiais
    src = p.replace(/\\([+?|(){}])|([+?|(){}])/g, (_, esc: string | undefined, lit: string | undefined) => (esc ? esc : '\\' + lit));
  }
  src = src.replace(/\[\[:(alpha|digit|alnum|upper|lower|space|punct):\]\]/g, (_, c: string) => ({ alpha: '[A-Za-zÀ-ÿ]', digit: '[0-9]', alnum: '[A-Za-z0-9À-ÿ]', upper: '[A-ZÀ-Þ]', lower: '[a-zß-ÿ]', space: '\\s', punct: '[!-/:-@[-`{-~]' })[c]!);
  src = src.replace(/\[:(alpha|digit|alnum|upper|lower|space):\]/g, (_, c: string) => ({ alpha: 'A-Za-zÀ-ÿ', digit: '0-9', alnum: 'A-Za-z0-9À-ÿ', upper: 'A-ZÀ-Þ', lower: 'a-zß-ÿ', space: '\\s' })[c]!);
  try {
    return new RegExp(src, flags);
  } catch {
    throw new ErroUso(`expressão regular inválida: ${p}`, 2);
  }
}

function conjuntoTr(s: string): string {
  s = s.replace(/\[:(upper|lower|digit|alpha|space|alnum|punct):\]/g, (_, c: string) => ({
    upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', lower: 'abcdefghijklmnopqrstuvwxyz', digit: '0123456789',
    alpha: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', space: ' \t\n\r\f\v',
    alnum: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789', punct: '!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~',
  })[c]!);
  s = escapes(s);
  let out = '';
  for (let i = 0; i < s.length; i++) {
    if (s[i + 1] === '-' && i + 2 < s.length) {
      for (let c = s.charCodeAt(i); c <= s.charCodeAt(i + 2); c++) out += String.fromCharCode(c);
      i += 2;
    } else out += s[i];
  }
  return out;
}

function listaCampos(spec: string, cmd: string): (n: number) => boolean {
  const faixas = spec.split(',').map((p) => {
    const m = p.match(/^(\d*)(-?)(\d*)$/);
    if (!m || (!m[1] && !m[3])) throw new ErroUso(`${cmd}: lista de campos inválida: ${spec}`, 2);
    const a = m[1] ? Number(m[1]) : 1;
    const b = m[2] ? (m[3] ? Number(m[3]) : Infinity) : a;
    return [a, b] as const;
  });
  return (n) => faixas.some(([a, b]) => n >= a && n <= b);
}

function sugerir(nome: string): string | null {
  const nomes = Object.keys(COMANDOS);
  let melhor: string | null = null;
  let dist = 3;
  for (const n of nomes) {
    const d = levenshtein(nome.toLowerCase(), n);
    if (d < dist) { dist = d; melhor = n; }
  }
  return melhor;
}

function levenshtein(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

function tamanhoNo(n: No): number {
  return n.tipo === 'arq' ? new TextEncoder().encode(n.conteudo).length : 4096;
}

const COMANDOS: Record<string, Cmd> = {
  echo(_sh, args, es) {
    let n = false, e = false;
    while (args[0] && /^-[neE]+$/.test(args[0])) {
      if (args[0].includes('n')) n = true;
      if (args[0].includes('e')) e = true;
      args = args.slice(1);
    }
    let s = args.join(' ');
    if (e) {
      s = escapes(s);
      const corte = s.indexOf('\u0001FIM');
      if (corte >= 0) { es.out(s.slice(0, corte)); return 0; }
    }
    es.out(s + (n ? '' : '\n'));
    return 0;
  },
  printf(_sh, args, es) {
    if (!args.length) throw new ErroUso('uso: printf FORMATO [ARGUMENTOS...]', 2);
    es.out(formatar(args[0], args.slice(1)));
    return 0;
  },
  pwd(sh, _a, es) { es.out(sh.cwd + '\n'); return 0; },
  cd(sh, args, es) {
    const alvo = args[0] === undefined || args[0] === '~' ? HOME : args[0] === '-' ? sh.vars.get('OLDPWD') ?? sh.cwd : args[0];
    const abs = SistemaArquivos.normalizar(alvo, sh.cwd);
    const no = sh.fs.obter(abs);
    if (!no) { es.err(`bash: cd: ${alvo}: Arquivo ou diretório inexistente\n`); return 1; }
    if (no.tipo !== 'dir') { es.err(`bash: cd: ${alvo}: Não é um diretório\n`); return 1; }
    sh.vars.set('OLDPWD', sh.cwd);
    sh.cwd = abs;
    if (args[0] === '-') es.out(abs + '\n');
    return 0;
  },
  ls(sh, args, es) {
    const { o, resto } = opcoes(args);
    const todos = o.has('a'), longo = o.has('l'), um = true;
    void um;
    const alvos = resto.length ? resto : ['.'];
    let st = 0;
    const arquivos: string[] = [];
    const dirs: string[] = [];
    for (const a of alvos) {
      const no = sh.fs.obter(SistemaArquivos.normalizar(a, sh.cwd));
      if (!no) { es.err(`ls: não foi possível acessar '${a}': Arquivo ou diretório inexistente\n`); st = 2; continue; }
      if (no.tipo === 'arq' || o.has('d')) arquivos.push(a);
      else dirs.push(a);
    }
    const linha = (nome: string, no: No) =>
      longo ? `${no.tipo === 'dir' ? 'drwxr-xr-x' : '-rw-r--r--'} 1 aluno aluno ${String(tamanhoNo(no)).padStart(5)} ${nome}${o.has('F') && no.tipo === 'dir' ? '/' : ''}` : `${nome}${o.has('F') && no.tipo === 'dir' ? '/' : ''}`;
    for (const a of arquivos.sort(comparar)) es.out(linha(a, sh.fs.obter(SistemaArquivos.normalizar(a, sh.cwd))!) + '\n');
    dirs.sort(comparar).forEach((d, i) => {
      const no = sh.fs.obter(SistemaArquivos.normalizar(d, sh.cwd)) as Extract<No, { tipo: 'dir' }>;
      if (alvos.length > 1) es.out(`${i > 0 || arquivos.length ? '\n' : ''}${d}:\n`);
      let nomes = [...no.filhos.keys()].filter((n) => todos || !n.startsWith('.'));
      nomes.sort(comparar);
      if (o.has('r')) nomes.reverse();
      if (o.has('S')) nomes = nomes.sort((x, y) => tamanhoNo(no.filhos.get(y)!) - tamanhoNo(no.filhos.get(x)!));
      if (todos) { es.out(linha('.', no) + '\n'); es.out(linha('..', no) + '\n'); }
      if (longo) es.out(`total ${nomes.length * 4}\n`);
      for (const n of nomes) es.out(linha(n, no.filhos.get(n)!) + '\n');
    });
    return st;
  },
  mkdir(sh, args, es) {
    const { o, resto } = opcoes(args);
    if (!resto.length) throw new ErroUso('falta o nome do diretório', 1);
    let st = 0;
    for (const a of resto) {
      const erro = sh.fs.mkdir(SistemaArquivos.normalizar(a, sh.cwd), o.has('p'));
      if (erro) { es.err(`mkdir: não foi possível criar o diretório "${a}": ${erro}\n`); st = 1; }
    }
    return st;
  },
  touch(sh, args, es) {
    let st = 0;
    for (const a of args) {
      const cam = SistemaArquivos.normalizar(a, sh.cwd);
      if (sh.fs.obter(cam)) continue;
      const erro = sh.fs.escrever(cam, '', false);
      if (erro) { es.err(`touch: não foi possível tocar '${a}': ${erro}\n`); st = 1; }
    }
    return st;
  },
  cat(sh, args, es) {
    const { o, resto } = opcoes(args);
    const { textos, falhou } = lerEntradas(sh, resto, es, 'cat');
    let n = 1;
    for (const t of textos) {
      if (o.has('n')) {
        const ls = t.texto.split('\n');
        const fim = t.texto.endsWith('\n');
        if (fim) ls.pop();
        es.out(ls.map((l) => `${String(n++).padStart(6)}\t${l}`).join('\n') + (fim ? '\n' : ''));
      } else es.out(t.texto);
    }
    return falhou ? 1 : 0;
  },
  rm(sh, args, es) {
    const { o, resto } = opcoes(args);
    if (!resto.length) throw new ErroUso('falta o operando', 1);
    let st = 0;
    for (const a of resto) {
      const cam = SistemaArquivos.normalizar(a, sh.cwd);
      const no = sh.fs.obter(cam);
      if (!no) { if (!o.has('f')) { es.err(`rm: não foi possível remover '${a}': Arquivo ou diretório inexistente\n`); st = 1; } continue; }
      if (no.tipo === 'dir' && !o.has('r') && !o.has('R')) { es.err(`rm: não foi possível remover '${a}': É um diretório\n`); st = 1; continue; }
      if (cam === '/' || cam === HOME) { es.err(`rm: recusando remover '${a}'\n`); st = 1; continue; }
      sh.fs.remover(cam);
    }
    return st;
  },
  rmdir(sh, args, es) {
    let st = 0;
    for (const a of args) {
      const cam = SistemaArquivos.normalizar(a, sh.cwd);
      const no = sh.fs.obter(cam);
      if (!no) { es.err(`rmdir: falhou em remover '${a}': Arquivo ou diretório inexistente\n`); st = 1; continue; }
      if (no.tipo !== 'dir') { es.err(`rmdir: falhou em remover '${a}': Não é um diretório\n`); st = 1; continue; }
      if (no.filhos.size) { es.err(`rmdir: falhou em remover '${a}': Diretório não vazio\n`); st = 1; continue; }
      sh.fs.remover(cam);
    }
    return st;
  },
  cp(sh, args, es) { return copiarMover(sh, args, es, false); },
  mv(sh, args, es) { return copiarMover(sh, args, es, true); },
  head(sh, args, es) { return cabecaCauda(sh, args, es, 'head'); },
  tail(sh, args, es) { return cabecaCauda(sh, args, es, 'tail'); },
  wc(sh, args, es) {
    const { o, resto } = opcoes(args);
    const quais = ['l', 'w', 'c', 'm'].filter((x) => o.has(x));
    const mostrar = quais.length ? quais : ['l', 'w', 'c'];
    const { textos, falhou } = lerEntradas(sh, resto, es, 'wc');
    const linhas: number[][] = [];
    for (const t of textos) {
      const conta: Record<string, number> = {
        l: (t.texto.match(/\n/g) ?? []).length,
        w: t.texto.split(/\s+/).filter(Boolean).length,
        c: new TextEncoder().encode(t.texto).length,
        m: [...t.texto].length,
      };
      linhas.push(mostrar.map((x) => conta[x]));
    }
    if (textos.length > 1) linhas.push(mostrar.map((_, i) => linhas.reduce((s, l) => s + l[i], 0)));
    const nomes = [...textos.map((t) => t.nome), 'total'];
    const largura = textos.length === 1 && !textos[0].nome && mostrar.length > 1 ? 7 : Math.max(...linhas.flat().map((n) => String(n).length));
    linhas.forEach((l, i) => {
      const nums = mostrar.length === 1 && textos.length === 1 ? String(l[0]) : l.map((n) => String(n).padStart(largura)).join(' ');
      es.out(nums + (nomes[i] ? ` ${nomes[i]}` : '') + '\n');
    });
    return falhou ? 1 : 0;
  },
  sort(sh, args, es) {
    const { o, resto } = opcoes(args, 'kt');
    const { textos, falhou } = lerEntradas(sh, resto, es, 'sort');
    let ls = textos.flatMap((t) => linhasDe(t.texto));
    const sep = o.get('t');
    const chave = o.has('k') ? Number(o.get('k')!.split(',')[0].replace(/\D.*$/, '')) : 0;
    const campo = (l: string) => {
      if (!chave) return l;
      const partes = sep !== undefined ? l.split(sep) : l.trim().split(/\s+/);
      return partes.slice(chave - 1).join(sep ?? ' ');
    };
    const num = (s: string) => parseFloat(s) || 0;
    ls.sort((a, b) => {
      const x = campo(a), y = campo(b);
      let r = o.has('n') ? num(x) - num(y) : o.has('f') ? comparar(x.toLowerCase(), y.toLowerCase()) : comparar(x, y);
      if (r === 0 && !chave) r = a < b ? -1 : a > b ? 1 : 0;
      return r;
    });
    if (o.has('r')) ls.reverse();
    if (o.has('u')) ls = ls.filter((l, i) => i === 0 || (o.has('n') ? num(campo(l)) !== num(campo(ls[i - 1])) : campo(l) !== campo(ls[i - 1])));
    if (ls.length) es.out(ls.join('\n') + '\n');
    return falhou ? 2 : 0;
  },
  uniq(sh, args, es) {
    const { o, resto } = opcoes(args);
    const { textos, falhou } = lerEntradas(sh, resto.slice(0, 1), es, 'uniq');
    const ls = textos.flatMap((t) => linhasDe(t.texto));
    const grupos: [string, number][] = [];
    for (const l of ls) {
      const ult = grupos[grupos.length - 1];
      const igual = ult && (o.has('i') ? ult[0].toLowerCase() === l.toLowerCase() : ult[0] === l);
      if (igual) ult[1]++;
      else grupos.push([l, 1]);
    }
    for (const [l, n] of grupos) {
      if (o.has('d') && n < 2) continue;
      if (o.has('u') && n > 1) continue;
      es.out(o.has('c') ? `${String(n).padStart(7)} ${l}\n` : `${l}\n`);
    }
    return falhou ? 1 : 0;
  },
  grep(sh, args, es) {
    const { o, resto } = opcoes(args, 'em');
    const padrao = o.get('e') ?? resto.shift();
    if (padrao === undefined) throw new ErroUso('uso: grep [OPÇÃO]... PADRÕES [ARQUIVO]...', 2);
    const re = o.has('F')
      ? new RegExp(padrao.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), o.has('i') ? 'i' : '')
      : regexBasica(o.has('w') ? `\\b(${padrao})\\b` : padrao, o.has('E') || o.has('w'), o.has('i') ? 'i' : '');
    let arqs = resto;
    if (o.has('r') || o.has('R')) {
      arqs = [];
      for (const a of resto.length ? resto : ['.']) {
        const visitar = (cam: string) => {
          const no = sh.fs.obter(SistemaArquivos.normalizar(cam, sh.cwd));
          if (!no) return;
          if (no.tipo === 'arq') arqs.push(cam);
          else [...no.filhos.keys()].sort(comparar).forEach((n) => visitar(`${cam}/${n}`));
        };
        visitar(a);
      }
    }
    const { textos, falhou } = lerEntradas(sh, arqs, es, 'grep');
    const prefixo = textos.length > 1 || o.has('r') || o.has('R');
    let achou = 0;
    const limite = o.has('m') ? Number(o.get('m')) : Infinity;
    for (const t of textos) {
      let n = 0;
      let qtd = 0;
      for (const l of linhasDe(t.texto)) {
        n++;
        const bate = re.test(l) !== o.has('v');
        if (!bate || qtd >= limite) continue;
        qtd++;
        achou++;
        if (o.has('c') || o.has('l') || o.has('q')) continue;
        const pre = (prefixo ? `${t.nome}:` : '') + (o.has('n') ? `${n}:` : '');
        if (o.has('o') && !o.has('v')) {
          const g = new RegExp(re.source, re.flags + 'g');
          for (const m of l.matchAll(g)) if (m[0]) es.out(pre + m[0] + '\n');
        } else es.out(pre + l + '\n');
      }
      if (o.has('c')) es.out((prefixo ? `${t.nome}:` : '') + qtd + '\n');
      if (o.has('l') && qtd) es.out(t.nome + '\n');
    }
    return falhou ? 2 : achou ? 0 : 1;
  },
  cut(sh, args, es) {
    const { o, resto } = opcoes(args, 'dfc');
    const { textos, falhou } = lerEntradas(sh, resto, es, 'cut');
    for (const t of textos) {
      for (const l of linhasDe(t.texto)) {
        if (o.has('c')) {
          const sel = listaCampos(o.get('c')!, 'cut');
          es.out([...l].filter((_, i) => sel(i + 1)).join('') + '\n');
        } else if (o.has('f')) {
          const sep = o.get('d') ?? '\t';
          if (sep.length !== 1) throw new ErroUso('o delimitador deve ser um único caractere', 1);
          const sel = listaCampos(o.get('f')!, 'cut');
          const partes = l.split(sep);
          if (partes.length === 1) { if (!o.has('s')) es.out(l + '\n'); continue; }
          es.out(partes.filter((_, i) => sel(i + 1)).join(sep) + '\n');
        } else throw new ErroUso('você deve especificar uma lista de bytes, caracteres ou campos (-c ou -f)', 1);
      }
    }
    return falhou ? 1 : 0;
  },
  tr(_sh, args, es) {
    const { o, resto } = opcoes(args);
    const texto = es.entrada.texto.slice(es.entrada.pos);
    es.entrada.pos = es.entrada.texto.length;
    const a = conjuntoTr(resto[0] ?? '');
    if (o.has('d')) {
      let s = [...texto].filter((c) => !a.includes(c)).join('');
      if (o.has('s') && resto[1]) { const b = conjuntoTr(resto[1]); s = s.replace(/(.)\1+/gs, (m, c: string) => (b.includes(c) ? c : m)); }
      es.out(s);
      return 0;
    }
    if (o.has('s') && resto.length === 1) {
      es.out(texto.replace(/(.)\1+/gs, (m, c: string) => (a.includes(c) ? c : m)));
      return 0;
    }
    if (resto.length < 2) throw new ErroUso('falta o segundo conjunto (ex.: tr a-z A-Z)', 1);
    const b = conjuntoTr(resto[1]);
    let s = [...texto].map((c) => { const i = a.indexOf(c); return i < 0 ? c : b[Math.min(i, b.length - 1)] ?? c; }).join('');
    if (o.has('s')) s = s.replace(/(.)\1+/gs, (m, c: string) => (b.includes(c) ? c : m));
    es.out(s);
    return 0;
  },
  sed(sh, args, es) {
    const { o, resto } = opcoes(args, 'e');
    const scripts: string[] = [];
    if (o.has('e')) scripts.push(o.get('e')!);
    else if (resto.length) scripts.push(resto.shift()!);
    else throw new ErroUso('uso: sed [-n] SCRIPT [ARQUIVO]...', 1);
    const cmds = scripts.flatMap((s) => s.split(/;|\n/).map((x) => x.trim()).filter(Boolean)).map((s) => comandoSed(s, o.has('E') || o.has('r')));
    const { textos, falhou } = lerEntradas(sh, resto, es, 'sed');
    const ls = textos.flatMap((t) => linhasDe(t.texto));
    let saida = '';
    ls.forEach((linhaOrig, idx) => {
      let l = linhaOrig;
      let apagar = false;
      for (const c of cmds) {
        if (!c.bate(l, idx + 1, idx === ls.length - 1)) continue;
        if (c.tipo === 'd') { apagar = true; break; }
        if (c.tipo === 'p') saida += l + '\n';
        if (c.tipo === 's') {
          const novo = l.replace(c.re!, c.troca!);
          if (novo !== l && c.imprimir) saida += novo + '\n';
          l = novo;
        }
      }
      if (!apagar && !o.has('n')) saida += l + '\n';
    });
    if (o.has('i') && resto.length) {
      sh.fs.escrever(SistemaArquivos.normalizar(resto[0], sh.cwd), saida, false);
      return falhou ? 1 : 0;
    }
    es.out(saida);
    return falhou ? 1 : 0;
  },
  find(sh, args, es) {
    const inicio: string[] = [];
    let i = 0;
    while (i < args.length && !args[i].startsWith('-')) inicio.push(args[i++]);
    const filtros: ((cam: string, no: No) => boolean)[] = [];
    let maxProf = Infinity;
    for (; i < args.length; i++) {
      const op = args[i], v = args[i + 1];
      if (op === '-name' || op === '-iname') { const re = globRegex(v, true); const ci = op === '-iname'; filtros.push((cam) => (ci ? new RegExp(re.source, 'i') : re).test(cam.split('/').pop()!)); i++; }
      else if (op === '-type') { filtros.push((_c, no) => (v === 'd' ? no.tipo === 'dir' : no.tipo === 'arq')); i++; }
      else if (op === '-maxdepth') { maxProf = Number(v); i++; }
      else if (op === '-empty') filtros.push((_c, no) => (no.tipo === 'arq' ? !no.conteudo : !no.filhos.size));
      else throw new ErroUso(`find: opção desconhecida ${op} (suportadas: -name, -iname, -type, -maxdepth, -empty)`, 1);
    }
    let st = 0;
    for (const raiz of inicio.length ? inicio : ['.']) {
      const no = sh.fs.obter(SistemaArquivos.normalizar(raiz, sh.cwd));
      if (!no) { es.err(`find: '${raiz}': Arquivo ou diretório inexistente\n`); st = 1; continue; }
      const visitar = (cam: string, n: No, prof: number) => {
        if (filtros.every((f) => f(cam, n))) es.out(cam + '\n');
        if (n.tipo === 'dir' && prof < maxProf) for (const k of [...n.filhos.keys()].sort(comparar)) visitar(`${cam.replace(/\/$/, '')}/${k}`, n.filhos.get(k)!, prof + 1);
      };
      visitar(raiz, no, 0);
    }
    return st;
  },
  seq(_sh, args, es) {
    const { o, resto } = opcoes(args.map((a) => (/^-\d/.test(a) ? a : a)), 's');
    const ns = resto.map((a) => numero(a, 'seq'));
    const [ini, passo, fim] = ns.length === 1 ? [1, 1, ns[0]] : ns.length === 2 ? [ns[0], 1, ns[1]] : [ns[0], ns[1], ns[2]];
    if (!passo) throw new ErroUso('o incremento não pode ser zero', 1);
    const out: string[] = [];
    for (let v = ini; passo > 0 ? v <= fim : v >= fim; v += passo) out.push(String(v));
    if (out.length) es.out(out.join(o.get('s') ?? '\n') + '\n');
    return 0;
  },
  basename(_sh, args, es) {
    let b = (args[0] ?? '').replace(/\/+$/, '').split('/').pop() ?? '';
    if (args[1] && b.endsWith(args[1]) && b !== args[1]) b = b.slice(0, -args[1].length);
    es.out(b + '\n');
    return 0;
  },
  dirname(_sh, args, es) {
    const a = (args[0] ?? '').replace(/\/+$/, '');
    const i = a.lastIndexOf('/');
    es.out((i < 0 ? '.' : i === 0 ? '/' : a.slice(0, i)) + '\n');
    return 0;
  },
  read(sh, args, es) {
    const { o, resto } = opcoes(args, 'pa');
    // como no terminal: a pergunta do -p e o que foi digitado aparecem, mas não contam como saída
    if (o.has('p')) es.err(o.get('p')!);
    const ent = es.entrada;
    if (ent.pos >= ent.texto.length) return 1;
    let fim = ent.texto.indexOf('\n', ent.pos);
    if (fim < 0) fim = ent.texto.length;
    let linha = ent.texto.slice(ent.pos, fim);
    ent.pos = fim + 1;
    if (ent === sh.entradaTeclado) es.err(linha + '\n');
    if (!o.has('r')) linha = linha.replace(/\\(.)/g, '$1');
    const nomes = resto.length ? resto : ['REPLY'];
    if (o.has('a')) {
      sh.gravar(o.get('a')!, linha.trim().split(/\s+/).join(' '));
      return 0;
    }
    const partes = linha.trim().split(/[ \t]+/);
    nomes.forEach((n, i) => sh.gravar(n, i === nomes.length - 1 ? partes.slice(i).join(' ') : partes[i] ?? ''));
    if (nomes.length === 1) sh.gravar(nomes[0], nomes[0] === 'REPLY' ? linha : linha.trim());
    return 0;
  },
  test(sh, args) { return testar(sh, args); },
  '['(sh, args) {
    if (args[args.length - 1] !== ']') throw new ErroUso("faltou o ']' no fim (e lembre dos espaços: [ \"$a\" = \"$b\" ])", 2);
    return testar(sh, args.slice(0, -1));
  },
  true() { return 0; },
  false() { return 1; },
  ':'() { return 0; },
  exit(sh, args) { throw new Saida(args[0] ? numero(args[0], 'exit') & 255 : sh.status); },
  return(sh, args) { throw new Retorno(args[0] ? numero(args[0], 'return') & 255 : sh.status); },
  break(sh, args) {
    if (!sh.nivelLaco) throw new ErroUso('só faz sentido dentro de um laço (for, while, until)', 0);
    throw new Quebra('break', args[0] ? numero(args[0], 'break') : 1);
  },
  continue(sh, args) {
    if (!sh.nivelLaco) throw new ErroUso('só faz sentido dentro de um laço (for, while, until)', 0);
    throw new Quebra('continue', args[0] ? numero(args[0], 'continue') : 1);
  },
  shift(sh, args) {
    const n = args[0] ? numero(args[0], 'shift') : 1;
    if (n > sh.posicionais.length) return 1;
    sh.posicionais = sh.posicionais.slice(n);
    return 0;
  },
  export(sh, args) {
    for (const a of args) {
      const m = a.match(/^([A-Za-z_]\w*)(?:=(.*))?$/s);
      if (!m) throw new ErroUso(`\`${a}': não é um identificador válido`, 1);
      if (m[2] !== undefined) sh.gravar(m[1], m[2]);
      sh.exportadas.add(m[1]);
    }
    return 0;
  },
  local(sh, args) {
    const escopo = sh.locais[sh.locais.length - 1];
    if (!escopo) throw new ErroUso('só pode ser usado dentro de uma função', 1);
    for (const a of args) {
      const m = a.match(/^([A-Za-z_]\w*)(?:=(.*))?$/s);
      if (!m) throw new ErroUso(`\`${a}': não é um identificador válido`, 1);
      if (!escopo.has(m[1])) escopo.set(m[1], sh.vars.get(m[1]));
      sh.gravar(m[1], m[2] ?? '');
    }
    return 0;
  },
  readonly(sh, args) { return COMANDOS.export(sh, args, null as unknown as ES); },
  declare(sh, args) { return COMANDOS.export(sh, args.filter((a) => !a.startsWith('-')), null as unknown as ES); },
  unset(sh, args) { for (const a of args) { sh.vars.delete(a); sh.funcoes.delete(a); } return 0; },
  env(sh, _a, es) {
    for (const n of [...sh.exportadas].sort()) if (sh.vars.has(n)) es.out(`${n}=${sh.ler(n)}\n`);
    return 0;
  },
  expr(_sh, args, es) {
    if (args.length === 3) {
      const [a, op, b] = args;
      const x = Number(a), y = Number(b);
      let r: number | string;
      if (['+', '-', '*', '/', '%'].includes(op)) {
        if (Number.isNaN(x) || Number.isNaN(y)) throw new ErroUso('argumento não inteiro', 2);
        if ((op === '/' || op === '%') && y === 0) throw new ErroUso('divisão por zero', 2);
        r = op === '+' ? x + y : op === '-' ? x - y : op === '*' ? x * y : op === '/' ? Math.trunc(x / y) : x % y;
      } else if (['<', '<=', '>', '>=', '=', '!='].includes(op)) {
        const c = Number.isNaN(x) || Number.isNaN(y) ? comparar(a, b) : x - y;
        r = (op === '<' ? c < 0 : op === '<=' ? c <= 0 : op === '>' ? c > 0 : op === '>=' ? c >= 0 : op === '=' ? c === 0 : c !== 0) ? 1 : 0;
      } else throw new ErroUso(`operador não suportado: ${op}`, 2);
      es.out(r + '\n');
      return r === 0 ? 1 : 0;
    }
    if (args[0] === 'length' && args.length === 2) { es.out(args[1].length + '\n'); return 0; }
    throw new ErroUso('uso: expr NÚMERO OPERADOR NÚMERO (ex.: expr 2 + 3); prefira $(( 2 + 3 ))', 2);
  },
  tee(sh, args, es) {
    const { o, resto } = opcoes(args);
    const texto = es.entrada.texto.slice(es.entrada.pos);
    es.entrada.pos = es.entrada.texto.length;
    for (const a of resto) sh.fs.escrever(SistemaArquivos.normalizar(a, sh.cwd), texto, o.has('a'));
    es.out(texto);
    return 0;
  },
  paste(sh, args, es) {
    const { o, resto } = opcoes(args, 'd');
    const seps = escapes(o.get('d') ?? '\t');
    const { textos, falhou } = lerEntradas(sh, resto, es, 'paste');
    const juntar = (ls: string[]) => ls.reduce((acc, l, i) => (i ? acc + seps[(i - 1) % seps.length] : '') + l, '');
    if (o.has('s')) for (const t of textos) es.out(juntar(linhasDe(t.texto)) + '\n');
    else {
      const cols = textos.map((t) => linhasDe(t.texto));
      const n = Math.max(0, ...cols.map((c) => c.length));
      for (let i = 0; i < n; i++) es.out(juntar(cols.map((c) => c[i] ?? '')) + '\n');
    }
    return falhou ? 1 : 0;
  },
  rev(sh, args, es) {
    const { textos } = lerEntradas(sh, args, es, 'rev');
    for (const t of textos) for (const l of linhasDe(t.texto)) es.out([...l].reverse().join('') + '\n');
    return 0;
  },
  nl(sh, args, es) {
    const { textos } = lerEntradas(sh, args, es, 'nl');
    let n = 1;
    for (const t of textos) for (const l of linhasDe(t.texto)) es.out(l ? `${String(n++).padStart(6)}\t${l}\n` : '\n');
    return 0;
  },
  chmod(sh, args, es) {
    const alvos = args.slice(1);
    for (const a of alvos) if (!sh.fs.obter(SistemaArquivos.normalizar(a, sh.cwd))) { es.err(`chmod: não foi possível acessar '${a}': Arquivo ou diretório inexistente\n`); return 1; }
    return 0;
  },
  whoami(_sh, _a, es) { es.out('aluno\n'); return 0; },
  hostname(_sh, _a, es) { es.out('sala-de-aula\n'); return 0; },
  date(_sh, args, es) {
    const d = new Date();
    if (args[0]?.startsWith('+')) {
      const p = (n: number) => String(n).padStart(2, '0');
      es.out(args[0].slice(1).replace(/%([YmdHMS%])/g, (_, c: string) => ({ Y: String(d.getFullYear()), m: p(d.getMonth() + 1), d: p(d.getDate()), H: p(d.getHours()), M: p(d.getMinutes()), S: p(d.getSeconds()), '%': '%' })[c]!) + '\n');
    } else es.out(d.toString() + '\n');
    return 0;
  },
  sleep() { return 0; },
  clear() { return 0; },
  history() { return 0; },
  type(sh, args, es) {
    let st = 0;
    for (const a of args) {
      if (sh.funcoes.has(a)) es.out(`${a} é uma função\n`);
      else if (['echo', 'printf', 'cd', 'pwd', 'read', 'test', '[', 'exit', 'export', 'local', 'return', 'break', 'continue', 'shift', 'unset', 'type', 'true', 'false', ':'].includes(a)) es.out(`${a} é um comando interno do shell\n`);
      else if (COMANDOS[a]) es.out(`${a} é /usr/bin/${a}\n`);
      else { es.err(`bash: type: ${a}: não encontrado\n`); st = 1; }
    }
    return st;
  },
  which(_sh, args, es) {
    let st = 0;
    for (const a of args) { if (COMANDOS[a]) es.out(`/usr/bin/${a}\n`); else st = 1; }
    return st;
  },
  man(_sh, args, es) {
    es.out(`(Aqui não há manual. No Linux, "man ${args[0] ?? 'comando'}" abre a documentação; tente também "${args[0] ?? 'comando'} --help".)\n`);
    return 0;
  },
  source() { throw new ErroUso('source/. não é suportado aqui', 1); },
  sudo(_sh, _a, es) { es.err('sudo: aqui você já pode tudo dentro da sua pasta; não é preciso (nem possível) virar administrador.\n'); return 1; },
};

function testar(sh: Shell, a: string[]): number {
  // test / [ ]: ! , -a, -o, unários, binários
  const avaliar = (x: string[]): boolean => {
    const o = x.indexOf('-o');
    if (o > 0) return avaliar(x.slice(0, o)) || avaliar(x.slice(o + 1));
    const e = x.indexOf('-a');
    if (e > 0) return avaliar(x.slice(0, e)) && avaliar(x.slice(e + 1));
    if (x[0] === '!') return !avaliar(x.slice(1));
    if (x.length === 0) return false;
    if (x.length === 1) return x[0] !== '';
    if (x.length === 2) {
      if (!/^-[zndfesrwx]$/.test(x[0])) throw new ErroUso(`[: ${x[0]}: esperava um operador unário (-z, -n, -f, -d, -e)`, 2);
      return testeUnario(sh, x[0], x[1]);
    }
    if (x.length === 3) {
      const [p, op, q] = x;
      if (op === '=' || op === '==') return p === q;
      if (op === '!=') return p !== q;
      if (/^-(eq|ne|lt|le|gt|ge)$/.test(op)) {
        if (!/^\s*-?\d+\s*$/.test(p) || !/^\s*-?\d+\s*$/.test(q)) throw new ErroUso(`[: ${/^\s*-?\d+\s*$/.test(p) ? q : p}: esperava uma expressão de número inteiro`, 2);
        return compararNum(op, Number(p), Number(q));
      }
      if (op === '<') return p < q;
      if (op === '>') return p > q;
      throw new ErroUso(`[: ${op}: esperava um operador binário (=, !=, -eq, -lt, ...)`, 2);
    }
    throw new ErroUso('[: argumentos demais (coloque as variáveis entre aspas: [ "$nome" = "Ana" ])', 2);
  };
  return avaliar(a) ? 0 : 1;
}

async function copiarMover(sh: Shell, args: string[], es: ES, mover: boolean): Promise<number> {
  const nome = mover ? 'mv' : 'cp';
  const { o, resto } = opcoes(args);
  if (resto.length < 2) throw new ErroUso(`falta o destino (uso: ${nome} ORIGEM DESTINO)`, 1);
  const destino = resto.pop()!;
  const destAbs = SistemaArquivos.normalizar(destino, sh.cwd);
  const destNo = sh.fs.obter(destAbs);
  if (resto.length > 1 && destNo?.tipo !== 'dir') { es.err(`${nome}: o destino '${destino}' não é um diretório\n`); return 1; }
  let st = 0;
  for (const origem of resto) {
    const abs = SistemaArquivos.normalizar(origem, sh.cwd);
    const no = sh.fs.obter(abs);
    if (!no) { es.err(`${nome}: não foi possível obter estado de '${origem}': Arquivo ou diretório inexistente\n`); st = 1; continue; }
    if (no.tipo === 'dir' && !mover && !o.has('r') && !o.has('R')) { es.err(`cp: -r não especificado; omitindo o diretório '${origem}'\n`); st = 1; continue; }
    const final = destNo?.tipo === 'dir' ? `${destAbs === '/' ? '' : destAbs}/${abs.split('/').pop()}` : destAbs;
    if (final === abs) continue;
    if (no.tipo === 'dir' && (final + '/').startsWith(abs + '/')) { es.err(`${nome}: não é possível ${mover ? 'mover' : 'copiar'} um diretório para dentro dele mesmo\n`); st = 1; continue; }
    const { dir, nome: n } = sh.fs.pai(final);
    if (!dir || dir.tipo !== 'dir') { es.err(`${nome}: não foi possível criar '${destino}': Arquivo ou diretório inexistente\n`); st = 1; continue; }
    if (o.has('n') && dir.filhos.has(n)) continue;
    dir.filhos.set(n, mover ? no : copiarNo(no));
    if (mover) sh.fs.remover(abs);
  }
  return st;
}

function cabecaCauda(sh: Shell, args: string[], es: ES, nome: 'head' | 'tail'): number {
  args = args.map((a) => (/^-\d+$/.test(a) ? `-n${a.slice(1)}` : a));
  const { o, resto } = opcoes(args, 'nc');
  const bruto = o.get('n') ?? '10';
  const desde = nome === 'tail' && bruto.startsWith('+');
  const n = Math.abs(numero(bruto.replace(/^\+/, ''), nome));
  const { textos, falhou } = lerEntradas(sh, resto, es, nome);
  textos.forEach((t, i) => {
    if (textos.length > 1) es.out(`${i ? '\n' : ''}==> ${t.nome} <==\n`);
    if (o.has('c')) {
      const c = Number(o.get('c'));
      es.out(nome === 'head' ? t.texto.slice(0, c) : t.texto.slice(-c));
      return;
    }
    const ls = linhasDe(t.texto);
    const sel = nome === 'head' ? (bruto.startsWith('-') ? ls.slice(0, -n) : ls.slice(0, n)) : desde ? ls.slice(n - 1) : n ? ls.slice(-n) : [];
    if (sel.length) es.out(sel.join('\n') + '\n');
  });
  return falhou ? 1 : 0;
}

interface CmdSed { tipo: 's' | 'd' | 'p'; bate: (l: string, n: number, ultima: boolean) => boolean; re?: RegExp; troca?: string; imprimir?: boolean }

function comandoSed(s: string, estendida: boolean): CmdSed {
  let i = 0;
  let bate: CmdSed['bate'] = () => true;
  const m = s.match(/^(\d+|\$|\/(?:[^/\\]|\\.)*\/)(?:,(\d+|\$|\/(?:[^/\\]|\\.)*\/))?/);
  if (m) {
    const end = (a: string) => (a === '$' ? (_l: string, _n: number, u: boolean) => u : a.startsWith('/') ? ((re) => (l: string) => re.test(l))(regexBasica(a.slice(1, -1), estendida, '')) : (_l: string, n: number) => n === Number(a));
    const a = end(m[1]);
    if (m[2]) {
      const b = end(m[2]);
      let dentro = false;
      bate = (l, n, u) => {
        if (!dentro) { if (a(l, n, u)) { dentro = true; return true; } return false; }
        if (b(l, n, u) || (/^\d+$/.test(m[2]!) && n >= Number(m[2]))) dentro = false;
        return true;
      };
    } else bate = a;
    i = m[0].length;
  }
  const c = s[i];
  if (c === 'd' || c === 'p') return { tipo: c, bate };
  if (c === 's') {
    const sep = s[i + 1];
    const partes: string[] = [];
    let atual = '';
    for (let j = i + 2; j < s.length; j++) {
      if (s[j] === '\\' && s[j + 1] === sep) { atual += sep; j++; continue; }
      if (s[j] === '\\') { atual += s[j] + (s[j + 1] ?? ''); j++; continue; }
      if (s[j] === sep) { partes.push(atual); atual = ''; continue; }
      atual += s[j];
    }
    partes.push(atual);
    if (partes.length < 3) throw new ErroUso(`comando s incompleto: use s/procura/troca/ (em "${s}")`, 1);
    const [pad, troca, flags] = partes;
    const re = regexBasica(pad, estendida, (flags.includes('g') ? 'g' : '') + (/[iI]/.test(flags) ? 'i' : ''));
    const trocaJs = troca.replace(/\$/g, '$$$$').replace(/\\(\d)/g, '$$$1').replace(/(^|[^\\])&/g, '$1$$&').replace(/\\&/g, '&').replace(/\\n/g, '\n').replace(/\\(.)/g, '$1');
    return { tipo: 's', bate, re, troca: trocaJs, imprimir: flags.includes('p') };
  }
  throw new ErroUso(`comando não suportado: "${s}" (aqui o sed aceita s/procura/troca/g, d e p, com endereços como 2, $, /regex/)`, 1);
}

/* ============================================================== entrada */

export const COMANDOS_SHELL = Object.keys(COMANDOS).filter((c) => /^[a-z]/.test(c));

export async function executarShell(d: DadosShell): Promise<ResultadoShell> {
  const sh = new Shell();
  let saida = '';
  let terminal = '';
  const escrever = (s: string, conta: boolean) => {
    terminal += s;
    if (conta) saida += s;
    if (terminal.length > LIMITE_SAIDA) throw new Limite();
  };
  const entradaTexto = (d.entradas ?? []).length ? (d.entradas ?? []).join('\n') + '\n' : '';
  const es: ES = { entrada: { texto: entradaTexto, pos: 0 }, out: (s) => escrever(s, true), err: (s) => escrever(s, false) };
  let erro: ErroShell | null = null;

  const rodarScript = async (src: string, e: ES) => {
    const prog = analisar(src);
    try {
      await sh.lista(prog, e);
    } catch (x) {
      if (!(x instanceof Saida)) throw x;
      sh.status = x.codigo;
    }
  };

  try {
    if (d.preparo) {
      await rodarScript(d.preparo, { entrada: { texto: '', pos: 0 }, out: () => {}, err: () => {} });
      sh.cwd = HOME;
      sh.vars = new Map([...sh.vars].filter(([k]) => sh.exportadas.has(k) || k === 'OLDPWD'));
      sh.funcoes.clear();
      sh.status = 0;
      sh.primeiroErro = null;
      sh.passos = 0;
      sh.inicio = Date.now();
    }
    sh.entradaTeclado = es.entrada;
    await rodarScript(d.codigo, es);
    erro = sh.primeiroErro;
  } catch (x) {
    if (x instanceof ErroSintaxe) {
      erro = erroShell('Erro de sintaxe', x.message, x.linha);
      const dica = /esperava "then"/.test(x.message) ? 'Antes do then vem ; ou uma quebra de linha: if [ "$a" -gt 0 ]; then' : /esperava "do"/.test(x.message) ? 'Antes do do vem ; ou uma quebra de linha: for x in a b c; do' : /esperava "(fi|done)"/.test(x.message) ? 'Todo if termina com fi e todo for/while termina com done.' : /"(fi|done|then|do)" fora do lugar/.test(x.message) ? 'Confira se há ; ou quebra de linha antes do then (no if) e antes do do (no for/while): if [ "$x" -gt 3 ]; then' : null;
      erro.dica = dica;
      terminal += `bash: linha ${x.linha}: erro de sintaxe: ${x.message}\n`;
    } else if (x instanceof Limite) {
      erro = erroShell('Tempo esgotado', terminal.length > LIMITE_SAIDA ? 'o script imprimiu texto demais' : 'o script passou do limite de tempo', sh.linhaAtual || null);
      terminal += `\n[${erro.mensagem}]\n`;
    } else if (x instanceof ErroExecucao) {
      erro = erroShell(x.tipo, x.message, x.linha);
      terminal += `bash: linha ${x.linha}: ${x.message}\n`;
    } else if (x instanceof Quebra || x instanceof Retorno) {
      // break/return fora de laço/função: ignora como o bash
    } else {
      throw x;
    }
  }

  let retorno: string | null = null;
  if (d.chamada && !erro) {
    try {
      const w = new Lexico(d.chamada).palavraSolta();
      retorno = (await sh.expandir(w, { entrada: { texto: '', pos: 0 }, out: () => {}, err: () => {} }, false)).map((c) => c.texto).join(' ');
    } catch {
      retorno = '';
    }
  }
  return { saida, terminal, erro, retorno };
}

/** Só confere a sintaxe (para marcar o erro no editor enquanto o aluno digita). */
export function checarSintaxeShell(codigo: string): { linha: number; mensagem: string } | null {
  try {
    analisar(codigo);
    return null;
  } catch (e) {
    if (e instanceof ErroSintaxe) return { linha: e.linha, mensagem: e.message };
    return null;
  }
}

/**
 * Um exemplo de shell da aula pode ganhar o botão "Experimentar"? Só se a
 * sintaxe for aceita e todos os comandos forem do shell didático (exemplos
 * com git, apt, docker, ./script.sh... ficam só para ler).
 */
export function shellExecutavel(codigo: string): boolean {
  if (/^\s*\$\s/m.test(codigo)) return false; // transcrição de terminal ($ comando + saída)
  let prog: Lista;
  try {
    prog = analisar(codigo);
  } catch {
    return false;
  }
  const funcoes = new Set<string>();
  const nomes: string[] = [];
  const lista = (l: Lista) => l.forEach((e) => [e.primeiro, ...e.resto.map((r) => r.tubo)].forEach((t) => t.cmds.forEach(cmd)));
  const palavra = (w: Palavra) => w.partes.forEach((p) => { if (p.t === 'cmd') { try { lista(analisar(p.src)); } catch { nomes.push('?'); } } });
  const cmd = (c: Comando) => {
    switch (c.k) {
      case 'simples': {
        c.palavras.forEach(palavra);
        c.atribs.forEach((a) => palavra(a.valor));
        const p0 = c.palavras[0]?.partes;
        if (p0) nomes.push(p0.length === 1 && p0[0].t === 'lit' ? p0[0].v : '?');
        break;
      }
      case 'se': c.ramos.forEach((r) => { lista(r.cond); lista(r.corpo); }); if (c.senao) lista(c.senao); break;
      case 'para': c.itens?.forEach(palavra); lista(c.corpo); break;
      case 'paraC': lista(c.corpo); break;
      case 'enquanto': lista(c.cond); lista(c.corpo); break;
      case 'caso': c.ramos.forEach((r) => lista(r.corpo)); break;
      case 'grupo': lista(c.corpo); break;
      case 'funcao': funcoes.add(c.nome); cmd(c.corpo); break;
    }
  };
  lista(prog);
  return nomes.every((n) => (n in COMANDOS && n !== 'sudo' && n !== 'source') || funcoes.has(n));
}
