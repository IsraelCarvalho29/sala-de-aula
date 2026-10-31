/**
 * Linguagens que o app sabe executar no navegador, sem servidor:
 *   python      Pyodide (CPython compilado para WebAssembly)
 *   javascript  o próprio motor do navegador, num Web Worker
 *   typescript  tipos removidos com Sucrase, depois roda como JavaScript
 *   c / cpp     JSCPP (interpretador de C/C++ em JavaScript, subconjunto didático)
 *   sql         SQLite compilado para WebAssembly (sql.js)
 *   html        página renderizada num iframe (HTML, CSS e o JavaScript da página)
 */
export type Linguagem = 'python' | 'javascript' | 'typescript' | 'c' | 'cpp' | 'sql' | 'html';

export interface InfoLinguagem {
  nome: string;
  arquivo: string;
  /** espaços por nível de indentação exigidos na correção (0 = não confere) */
  recuo: number;
  /** como o programa lê a entrada (mostrado no campo de entradas) */
  leitura?: string;
  comentario: string;
}

export const LINGUAGENS: Record<Linguagem, InfoLinguagem> = {
  python: { nome: 'Python', arquivo: 'main.py', recuo: 4, leitura: 'input()', comentario: '#' },
  javascript: { nome: 'JavaScript', arquivo: 'main.js', recuo: 2, leitura: 'prompt()', comentario: '//' },
  typescript: { nome: 'TypeScript', arquivo: 'main.ts', recuo: 2, leitura: 'prompt()', comentario: '//' },
  c: { nome: 'C', arquivo: 'main.c', recuo: 4, leitura: 'scanf()', comentario: '//' },
  cpp: { nome: 'C++', arquivo: 'main.cpp', recuo: 4, leitura: 'cin', comentario: '//' },
  sql: { nome: 'SQL (SQLite)', arquivo: 'consulta.sql', recuo: 0, comentario: '--' },
  html: { nome: 'HTML/CSS', arquivo: 'index.html', recuo: 0, comentario: '<!--' },
};

const APELIDOS: Record<string, Linguagem> = {
  python: 'python', py: 'python', python3: 'python',
  javascript: 'javascript', js: 'javascript',
  typescript: 'typescript', ts: 'typescript',
  c: 'c', cpp: 'cpp', 'c++': 'cpp',
  sql: 'sql', sqlite: 'sql',
  html: 'html',
};

/** Como reconhecer, no código, que o programa lê a entrada (para mostrar o campo de entradas só quando precisa). */
const LE_ENTRADA: Partial<Record<Linguagem, RegExp>> = {
  python: /\binput\s*\(/,
  javascript: /\bprompt\s*\(/,
  typescript: /\bprompt\s*\(/,
  c: /\b(scanf|getchar|fgets|gets)\s*\(/,
  cpp: /\bcin\b|\b(scanf|getline|getchar)\s*\(/,
};

export const codigoLeEntrada = (linguagem: Linguagem, codigo: string) => !!LE_ENTRADA[linguagem]?.test(codigo);

/** O texto do campo de entradas parece código (ex.: o aluno escreveu o programa no lugar errado)? */
export function pareceCodigo(texto: string) {
  return /\b(print|input|console\.log|printf|scanf|def|return|import|SELECT)\b|\w+\s*\(.*\)|^\s*\w+\s*=[^=]/im.test(texto);
}

export function normalizarLinguagem(nome?: string): Linguagem | undefined {
  return nome ? APELIDOS[nome.toLowerCase()] : undefined;
}

export interface Problema {
  linha: number;
  mensagem: string;
}

export interface Analise {
  indentacao: Problema[];
  sintaxe: Problema | null;
  faltando: string[];
}

/** Tira strings e comentários de uma linha (para contar chaves e achar palavras com segurança). */
function limparLinha(linha: string, estado: { bloco: boolean }, comentario: string) {
  let out = '';
  for (let i = 0; i < linha.length; i++) {
    if (estado.bloco) {
      if (linha.startsWith('*/', i)) { estado.bloco = false; i++; }
      continue;
    }
    if (comentario === '//' && linha.startsWith('/*', i)) { estado.bloco = true; i++; continue; }
    if (linha.startsWith(comentario, i)) break;
    const c = linha[i];
    if (c === '"' || c === "'" || c === '`') {
      const fim = linha.indexOf(c, i + 1);
      out += '""';
      i = fim < 0 ? linha.length : fim;
      continue;
    }
    out += c;
  }
  return out;
}

/**
 * Indentação de linguagens com chaves (JS, TS, C): cada `{`, `(` ou `[` aberto
 * soma um nível; a linha que começa fechando volta um nível. Linhas de
 * continuação (ex.: `.then(...)`, `&&`, depois de `case x:`) podem ter um nível a mais.
 */
function conferirRecuoChaves(codigo: string, unidade: number, comentario: string): Problema[] {
  const problemas: Problema[] = [];
  const estado = { bloco: false };
  let nivel = 0;
  let anterior = '';
  codigo.split('\n').forEach((bruta, i) => {
    const estavaEmBloco = estado.bloco;
    const limpa = limparLinha(bruta, estado, comentario).trim();
    if (!bruta.trim()) return;
    const recuo = bruta.match(/^[ \t]*/)![0];
    if (recuo.includes('\t')) {
      problemas.push({ linha: i + 1, mensagem: 'Use espaços, não TAB, para indentar.' });
    } else if (!estavaEmBloco && !bruta.trim().startsWith('#')) {
      const fecha = limpa.match(/^[}\])]+/)?.[0].length ?? 0;
      const esperado = Math.max(0, nivel - fecha) * unidade;
      const continuacao =
        (anterior && !/[;{}]$/.test(anterior) && !/^\s*$/.test(anterior)) || /^(\.|&&|\|\||\?|:)/.test(limpa);
      if (recuo.length !== esperado && !(continuacao && recuo.length === esperado + unidade)) {
        problemas.push({
          linha: i + 1,
          mensagem: `Esta linha deveria ter ${esperado} espaço(s) de recuo (tem ${recuo.length}). Cada bloco { } entra ${unidade} espaços.`,
        });
      }
    }
    for (const c of limpa) {
      if ('{(['.includes(c)) nivel++;
      else if ('})]'.includes(c)) nivel = Math.max(0, nivel - 1);
    }
    if (limpa) anterior = limpa;
  });
  return problemas;
}

/** Análise para as linguagens que não são Python (o Python é analisado pelo próprio Python, no worker). */
export function analisarSemPython(linguagem: Linguagem, codigo: string, usa: string[] = []): Analise {
  const info = LINGUAGENS[linguagem];
  const indentacao =
    info.recuo && linguagem !== 'sql' && linguagem !== 'html' ? conferirRecuoChaves(codigo, info.recuo, info.comentario) : [];
  const estado = { bloco: false };
  const limpo = codigo.split('\n').map((l) => limparLinha(l, estado, info.comentario)).join('\n');
  const faltando = usa.filter((u) => {
    const padrao = u.trim().split(/\s+/).map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s+');
    return !new RegExp(`(^|[^\\w])${padrao}($|[^\\w])`, linguagem === 'sql' ? 'i' : '').test(limpo);
  });
  return { indentacao, sintaxe: null, faltando };
}
