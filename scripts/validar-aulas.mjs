#!/usr/bin/env node
/**
 * Confere as aulas em content/trilhas antes de publicar:
 *
 *   - front matter: código do módulo existe no _trilha.md, pré-requisitos existem;
 *   - perguntas (```quiz): YAML válido, id único, campos obrigatórios por tipo,
 *     índice da resposta dentro das opções;
 *   - desafios de código: roda a `solucao` contra todos os `testes` com os mesmos
 *     executores do app (corretor.py no Python, Sucrase no JS/TS, sql.js no SQL,
 *     JSCPP no C/C++) e confere indentação e `usa`. Exige pelo menos um teste oculto.
 *
 * Uso: node scripts/validar-aulas.mjs [filtro]     (ex.: FP-02 para checar uma aula)
 * Precisa de python3 no PATH para os desafios em Python. HTML só é checado com Playwright instalado.
 */
import { readFileSync, readdirSync, writeFileSync, mkdtempSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { parse as parseYaml } from 'yaml';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const filtro = process.argv[2];
const erros = [];
const avisos = [];
const falhar = (onde, msg) => erros.push(`${onde}: ${msg}`);

const TIPOS = ['multipla_escolha', 'verdadeiro_falso', 'resposta_curta', 'prever_saida', 'codigo'];
const LINGS = { python: 'python', py: 'python', javascript: 'javascript', js: 'javascript', typescript: 'typescript', ts: 'typescript', c: 'c', cpp: 'cpp', 'c++': 'cpp', sql: 'sql', sqlite: 'sql', html: 'html' };
const RECUO = { python: 4, javascript: 2, typescript: 2, c: 4, cpp: 4, sql: 0, html: 0 };

const normalizar = (s) => s.replace(/\r\n/g, '\n').split('\n').map((l) => l.trimEnd()).join('\n').replace(/\n+$/, '');

function frontMatter(texto) {
  const m = texto.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  return m ? { meta: parseYaml(m[1]), corpo: m[2] } : { meta: {}, corpo: texto };
}

/** Mesmo recorte que src/components/Markdown.tsx: de ```quiz até a próxima linha só com ```. */
function blocosQuiz(corpo) {
  const blocos = [];
  let atual = null;
  corpo.split('\n').forEach((l, i) => {
    if (!atual && /^```quiz\s*$/.test(l)) atual = { linha: i + 1, linhas: [] };
    else if (atual && /^```\s*$/.test(l)) { blocos.push({ linha: atual.linha, yaml: atual.linhas.join('\n') }); atual = null; }
    else if (atual) atual.linhas.push(l);
  });
  return blocos;
}

/* ------------------------------------------------------------- conteúdo */

const dirTrilhas = join(raiz, 'content/trilhas');
const modulos = new Map();
const aulas = [];
for (const trilha of readdirSync(dirTrilhas)) {
  for (const arq of readdirSync(join(dirTrilhas, trilha))) {
    if (!arq.endsWith('.md')) continue;
    const texto = readFileSync(join(dirTrilhas, trilha, arq), 'utf8');
    const { meta, corpo } = frontMatter(texto);
    if (arq === '_trilha.md') (meta.modulos ?? []).forEach((m) => modulos.set(m.codigo, { ...m, trilha }));
    else aulas.push({ caminho: `${trilha}/${arq}`, meta, corpo });
  }
}

const desafios = [];
const ids = new Map();
for (const a of aulas) {
  if (filtro && !a.caminho.includes(filtro)) continue;
  const onde = a.caminho;
  if (!a.meta.codigo) falhar(onde, 'front matter sem codigo');
  else if (!modulos.has(a.meta.codigo)) falhar(onde, `codigo ${a.meta.codigo} não está em nenhum _trilha.md`);
  else if (!a.caminho.startsWith(modulos.get(a.meta.codigo).trilha + '/')) falhar(onde, `aula está fora da pasta da trilha de ${a.meta.codigo}`);
  for (const p of a.meta.prerequisitos ?? []) if (!modulos.has(p)) falhar(onde, `pré-requisito inexistente: ${p}`);
  if (!a.meta.titulo) falhar(onde, 'front matter sem titulo');
  if (!a.meta.objetivos?.length) avisos.push(`${onde}: sem objetivos`);

  for (const b of blocosQuiz(a.corpo)) {
    const aqui = `${onde}:${b.linha}`;
    let q;
    try {
      q = parseYaml(b.yaml);
    } catch (e) {
      falhar(aqui, `YAML inválido: ${e.message.split('\n')[0]}`);
      continue;
    }
    if (!q?.id) falhar(aqui, 'pergunta sem id');
    else if (ids.has(q.id)) falhar(aqui, `id repetido ${q.id} (também em ${ids.get(q.id)})`);
    else ids.set(q.id, aqui);
    const ref = `${aqui} ${q?.id ?? ''}`;
    if (!TIPOS.includes(q?.tipo)) { falhar(ref, `tipo inválido: ${q?.tipo}`); continue; }
    if (!q.pergunta) falhar(ref, 'sem pergunta');
    if (!q.explicacao && q.tipo !== 'resposta_curta') falhar(ref, 'sem explicacao');
    if (q.tipo === 'multipla_escolha') {
      if (!Array.isArray(q.opcoes) || q.opcoes.length < 2) falhar(ref, 'opcoes precisa ser uma lista');
      else if (!Number.isInteger(q.resposta) || q.resposta < 0 || q.resposta >= q.opcoes.length) falhar(ref, `resposta ${q.resposta} fora das opções`);
      else if (q.opcoes.some((o) => typeof o !== 'string')) falhar(ref, 'toda opção deve ser texto (use aspas)');
    }
    if (q.tipo === 'verdadeiro_falso' && typeof q.resposta !== 'boolean') falhar(ref, 'resposta deve ser true ou false');
    if ((q.tipo === 'resposta_curta' || q.tipo === 'prever_saida') && typeof q.resposta !== 'string') falhar(ref, 'resposta deve ser texto');
    if (q.tipo === 'codigo') {
      const ling = LINGS[(q.linguagem ?? 'python').toLowerCase()];
      if (!ling) { falhar(ref, `linguagem sem executor: ${q.linguagem}`); continue; }
      if (!q.testes?.length) { falhar(ref, 'desafio sem testes'); continue; }
      if (!q.solucao) { falhar(ref, 'desafio sem solucao'); continue; }
      if (!q.testes.some((t) => t.visivel === false)) falhar(ref, 'desafio sem teste oculto (visivel: false)');
      if (!q.dica) avisos.push(`${ref}: desafio sem dica`);
      const testes = q.testes.map((t) => {
        const bruto = t.entradas ?? t.entrada ?? [];
        return {
          entradas: Array.isArray(bruto) ? bruto.map(String) : String(bruto).split('\n'),
          esperado: String(t.esperado ?? t.saida ?? ''),
          chamada: t.chamada,
          verifica: t.verifica,
        };
      });
      desafios.push({ ref, ling, q, testes });
    }
  }
}

/* ------------------------------------------------------------ executores */

function rodarPython(lote) {
  if (!lote.length) return [];
  const pasta = mkdtempSync(join(tmpdir(), 'validar-'));
  const script = join(pasta, 'rodar.py');
  writeFileSync(script, `
import json, sys
sys.dont_write_bytecode = True
sys.path.insert(0, ${JSON.stringify(join(raiz, 'src/lib/execucao'))})
import corretor
import signal


class TempoEsgotado(BaseException):
    pass


def estourou(*_):
    raise TempoEsgotado("passou de 5 segundos")


signal.signal(signal.SIGALRM, estourou)
pedidos = json.load(sys.stdin)
saida = []
for p in pedidos:
    if p["acao"] == "analisar":
        saida.append(corretor.analisar(p))
    else:
        signal.setitimer(signal.ITIMER_REAL, 5)   # mesmo limite do app
        try:
            saida.append(corretor.executar(p))
        except TempoEsgotado as e:
            saida.append({"saida": "", "retorno": None, "erro": {"tipo": "Tempo esgotado", "mensagem": str(e)}})
        finally:
            signal.setitimer(signal.ITIMER_REAL, 0)
sys.__stdout__.write(json.dumps(saida))
`);
  const r = spawnSync('python3', ['-I', script], { input: JSON.stringify(lote), encoding: 'utf8', timeout: 900000, maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`python3 falhou: ${r.stderr}`);
  return JSON.parse(r.stdout);
}

function inspecionar(v, dentro = false, vistos = new Set()) {
  if (typeof v === 'string') return dentro ? `'${v}'` : v;
  if (typeof v === 'function') return `[Function: ${v.name || '(anônima)'}]`;
  if (typeof v === 'bigint') return `${v}n`;
  if (v === null || typeof v !== 'object') return String(v);
  if (vistos.has(v)) return '[Circular]';
  vistos.add(v);
  if (Array.isArray(v)) return v.length ? `[ ${v.map((x) => inspecionar(x, true, vistos)).join(', ')} ]` : '[]';
  if (v instanceof Map) return `Map(${v.size}) { ${[...v].map(([k, x]) => `${inspecionar(k, true, vistos)} => ${inspecionar(x, true, vistos)}`).join(', ')} }`;
  if (v instanceof Set) return `Set(${v.size}) { ${[...v].map((x) => inspecionar(x, true, vistos)).join(', ')} }`;
  if (v instanceof Error) return `${v.name}: ${v.message}`;
  const pares = Object.entries(v).map(([k, x]) => `${/^[A-Za-z_$][\w$]*$/.test(k) ? k : `'${k}'`}: ${inspecionar(x, true, vistos)}`);
  const nome = v.constructor && v.constructor.name !== 'Object' ? `${v.constructor.name} ` : '';
  return pares.length ? `${nome}{ ${pares.join(', ')} }` : `${nome}{}`;
}

async function rodarJS(codigo, t, ts) {
  const { transform } = await import('sucrase');
  const fonte = transform(codigo, { transforms: ts ? ['typescript'] : [] }).code;
  let saida = '';
  const fila = [...t.entradas];
  const linha = (a) => a.map((x) => inspecionar(x)).join(' ') + '\n';
  const ctx = vm.createContext({
    console: { log: (...a) => (saida += linha(a)), info: (...a) => (saida += linha(a)), table: (v) => (saida += linha([v])), warn() {}, error() {} },
    prompt: () => { if (!fila.length) throw new Error('prompt() sem entrada'); return fila.shift(); },
    setTimeout, Promise, Math, JSON, Date, Map, Set,
  });
  const sufixo = t.chamada ? `\n;globalThis.__retorno = (${t.chamada});` : '';
  vm.runInContext(fonte + sufixo, ctx, { timeout: 5000 });
  await new Promise((r) => setTimeout(r, 20));
  return { saida, retorno: t.chamada ? inspecionar(ctx.__retorno, true) : null };
}

let SQL;
async function rodarSQL(codigo, preparo) {
  SQL ??= await require('sql.js')();
  const db = new SQL.Database();
  try {
    if (preparo) db.run(preparo);
    const res = db.exec(codigo);
    const saida = res
      .map((r) => [r.columns.join(' | '), ...r.values.map((l) => l.map((v) => (v === null ? 'NULL' : String(v))).join(' | '))].join('\n') + '\n')
      .join('\n');
    return { saida, retorno: null };
  } finally {
    db.close();
  }
}

function rodarC(codigo, t) {
  const mod = require('JSCPP/lib/launcher');
  const jscpp = mod.default?.default ?? mod.default ?? mod;
  let saida = '';
  jscpp.run(codigo, t.entradas.join('\n'), { stdio: { write: (s) => (saida += s) }, maxTimeout: 4500 });
  return { saida, retorno: null };
}

/* ----------------------------------------------------------- correção */

const linguagensTs = await import(join(raiz, 'src/lib/execucao/linguagens.ts'));

const py = desafios.filter((d) => d.ling === 'python');
const pedidos = py.flatMap((d) => [
  { acao: 'analisar', codigo: d.q.solucao, usa: d.q.usa ?? [] },
  ...d.testes.map((t) => ({ acao: 'executar', codigo: d.q.solucao, entradas: t.entradas, chamada: t.chamada })),
]);
const respostas = rodarPython(pedidos);
let k = 0;
for (const d of py) {
  const an = respostas[k++];
  if (an.sintaxe) falhar(d.ref, `solução com erro de sintaxe: ${an.sintaxe.mensagem}`);
  if (d.q.indentacao !== false && an.indentacao.length) falhar(d.ref, `solução com indentação fora do padrão: ${JSON.stringify(an.indentacao)}`);
  if (an.faltando.length) falhar(d.ref, `solução não usa ${an.faltando.join(', ')} (campo usa)`);
  d.testes.forEach((t, i) => {
    const r = respostas[k++];
    if (r.erro) return falhar(d.ref, `teste ${i + 1}: a solução deu ${r.erro.tipo}: ${r.erro.mensagem}`);
    const obtido = t.chamada ? r.retorno ?? '' : r.saida;
    if (normalizar(obtido) !== normalizar(t.esperado)) falhar(d.ref, `teste ${i + 1}: esperado ${JSON.stringify(t.esperado)}, a solução deu ${JSON.stringify(obtido)}`);
  });
}

let playwright = null;
try { playwright = require('playwright'); } catch { /* sem HTML */ }
let navegador = null;

for (const d of desafios.filter((x) => x.ling !== 'python')) {
  const an = linguagensTs.analisarSemPython(d.ling, d.q.solucao, d.q.usa ?? []);
  if (d.q.indentacao !== false && RECUO[d.ling] && an.indentacao.length) falhar(d.ref, `solução com indentação fora do padrão: ${JSON.stringify(an.indentacao)}`);
  if (an.faltando.length) falhar(d.ref, `solução não usa ${an.faltando.join(', ')} (campo usa)`);
  for (const [i, t] of d.testes.entries()) {
    try {
      if (d.ling === 'html') {
        if (!playwright) { avisos.push(`${d.ref}: HTML não verificado (sem Playwright)`); break; }
        navegador ??= await playwright.chromium.launch();
        const pg = await navegador.newPage();
        await pg.setContent(d.q.solucao);
        const ok = await pg.evaluate((exp) => !!(0, eval)(exp), t.verifica);
        await pg.close();
        if (!ok) falhar(d.ref, `teste ${i + 1}: verifica falhou: ${t.verifica}`);
        continue;
      }
      const r = d.ling === 'sql' ? await rodarSQL(d.q.solucao, d.q.preparo)
        : d.ling === 'c' || d.ling === 'cpp' ? rodarC(d.q.solucao, t)
        : await rodarJS(d.q.solucao, t, d.ling === 'typescript');
      const obtido = t.chamada ? r.retorno ?? '' : r.saida;
      if (normalizar(obtido) !== normalizar(t.esperado)) falhar(d.ref, `teste ${i + 1}: esperado ${JSON.stringify(t.esperado)}, a solução deu ${JSON.stringify(obtido)}`);
    } catch (e) {
      falhar(d.ref, `teste ${i + 1}: a solução deu erro: ${e.message.split('\n')[0]}`);
    }
  }
}
/* O código inicial não pode passar nos testes: senão o aluno acerta sem escrever nada. */
const comInicial = desafios.filter((d) => d.q.codigo_inicial?.trim());
const pyIni = comInicial.filter((d) => d.ling === 'python');
const respIni = rodarPython(pyIni.flatMap((d) => d.testes.map((t) => ({ acao: 'executar', codigo: d.q.codigo_inicial, entradas: t.entradas, chamada: t.chamada }))));
let m = 0;
for (const d of comInicial) {
  let passa = true;
  for (const t of d.testes) {
    let ok = false;
    try {
      if (d.ling === 'python') {
        const r = respIni[m++];
        ok = !r.erro && normalizar(t.chamada ? r.retorno ?? '' : r.saida) === normalizar(t.esperado);
      } else if (d.ling === 'html') {
        if (!navegador) { passa = false; break; }
        const pg = await navegador.newPage();
        await pg.setContent(d.q.codigo_inicial);
        ok = await pg.evaluate((exp) => { try { return !!(0, eval)(exp); } catch { return false; } }, t.verifica);
        await pg.close();
      } else {
        const r = d.ling === 'sql' ? await rodarSQL(d.q.codigo_inicial, d.q.preparo)
          : d.ling === 'c' || d.ling === 'cpp' ? rodarC(d.q.codigo_inicial, t)
          : await rodarJS(d.q.codigo_inicial, t, d.ling === 'typescript');
        ok = normalizar(t.chamada ? r.retorno ?? '' : r.saida) === normalizar(t.esperado);
      }
    } catch {
      ok = false;
    }
    passa &&= ok;
  }
  if (passa) falhar(d.ref, 'o codigo_inicial já passa em todos os testes');
}
await navegador?.close();

const nAulas = aulas.filter((a) => !filtro || a.caminho.includes(filtro)).length;
avisos.forEach((a) => console.log(`aviso  ${a}`));
erros.forEach((e) => console.log(`ERRO   ${e}`));
console.log(`\n${nAulas} aula(s), ${ids.size} pergunta(s), ${desafios.length} desafio(s) de código, ${erros.length} erro(s).`);
process.exit(erros.length ? 1 : 0);
