/// <reference lib="webworker" />
/**
 * Web Worker que executa o código do aluno fora da thread da página: se o
 * programa entrar num laço sem fim, a página encerra o worker e cria outro.
 * Cada linguagem tem seu próprio worker (ver index.ts); o runtime é carregado
 * sob demanda, na primeira execução.
 */
import corretorPython from './corretor.py?raw';
import type { Linguagem } from './linguagens';
import type { ErroCodigo, ResultadoExecucao } from './index';

interface Dados {
  codigo: string;
  entradas?: string[];
  chamada?: string;
  preparo?: string;
  usa?: string[];
}

interface Runtime {
  executar(d: Dados): ResultadoExecucao | Promise<ResultadoExecucao>;
  analisar?(d: Dados): unknown;
}

const LIMITE_SAIDA = 50_000;

function erro(tipo: string, mensagem: string, linha: number | null, explicacao = '', dica: string | null = null): ErroCodigo {
  return { tipo, mensagem, linha, explicacao, dica, traceback: `${tipo}: ${mensagem}${linha ? ` (linha ${linha})` : ''}` };
}

/* ------------------------------------------------------------------ Python */

async function criarPython(base: string): Promise<Runtime> {
  const url = `${base}pyodide/pyodide.mjs`;
  const { loadPyodide } = await import(/* @vite-ignore */ url);
  const py = await loadPyodide({ indexURL: `${base}pyodide/` });
  py.runPython(corretorPython);
  const chamar = (nome: string, d: Dados) => {
    const f = py.globals.get(nome);
    try {
      return JSON.parse(f(JSON.stringify(d)));
    } finally {
      f.destroy?.();
    }
  };
  return { executar: (d) => chamar('executar_json', d), analisar: (d) => chamar('analisar_json', d) };
}

/* --------------------------------------------------- JavaScript/TypeScript */

/** Formata valores como o console.log do Node: [ 1, 'a' ], { nome: 'Ana' }. */
function inspecionar(v: unknown, dentro = false, vistos = new Set<unknown>()): string {
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
  const nome = v.constructor && v.constructor !== Object ? `${v.constructor.name} ` : '';
  return pares.length ? `${nome}{ ${pares.join(', ')} }` : `${nome}{}`;
}

const EXPLICACAO_JS: Record<string, string> = {
  SyntaxError: 'Erro de sintaxe: o código não segue as regras da linguagem. Confira parênteses, chaves e aspas fechados.',
  ReferenceError: 'Nome não definido: você usou uma variável ou função que não existe (ou foi declarada depois, ou com outra grafia).',
  TypeError: 'Erro de tipo: você usou um valor de um jeito que o tipo dele não permite (ex.: chamar algo que não é função, ou ler propriedade de undefined).',
  RangeError: 'Valor fora do intervalo permitido (ex.: recursão sem fim ou tamanho de array inválido).',
  EOFError: 'O programa chamou prompt() mais vezes do que há linhas de entrada.',
  TSError: 'Erro ao ler o TypeScript: confira a sintaxe das anotações de tipo.',
};

function dicaJS(e: Error): string | null {
  if (e instanceof TypeError && /is not a function/.test(e.message)) return 'Confira a grafia do nome e se ele é mesmo uma função.';
  if (e instanceof TypeError && /Cannot read properties of (undefined|null)/.test(e.message)) return 'O valor antes do ponto é undefined/null: confira se a variável recebeu um valor.';
  if (e instanceof TypeError && /Assignment to constant/.test(e.message)) return 'Variáveis declaradas com const não podem receber outro valor. Use let se ela precisa mudar.';
  return null;
}

async function criarJS(ts: boolean): Promise<Runtime> {
  const { transform } = await import('sucrase');
  const arquivo = ts ? 'main.ts' : 'main.js';
  return {
    async executar(d) {
      let terminal = '';
      let saida = '';
      const fila = [...(d.entradas ?? [])];
      const escrever = (s: string, contaComoSaida: boolean) => {
        terminal += s;
        if (contaComoSaida) saida += s;
        if (terminal.length > LIMITE_SAIDA) throw new Error('O programa imprimiu texto demais (laço sem fim?).');
      };
      const linha = (args: unknown[]) => args.map((a) => inspecionar(a)).join(' ') + '\n';
      const consoleFalso = {
        log: (...a: unknown[]) => escrever(linha(a), true),
        info: (...a: unknown[]) => escrever(linha(a), true),
        warn: (...a: unknown[]) => escrever(linha(a), false),
        error: (...a: unknown[]) => escrever(linha(a), false),
        table: (v: unknown) => escrever(linha([v]), true),
      };
      const prompt = (msg = '') => {
        escrever(String(msg), false);
        if (!fila.length) {
          const e = new Error('prompt() foi chamado, mas não há mais linhas de entrada');
          e.name = 'EOFError';
          throw e;
        }
        const v = fila.shift()!;
        escrever(v + '\n', false);
        return v;
      };

      // o Sucrase confere a sintaxe (com número da linha) e, no TypeScript, remove os tipos
      let fonte: string;
      try {
        fonte = transform(d.codigo, { transforms: ts ? ['typescript'] : [], filePath: arquivo }).code;
      } catch (e) {
        const err = e as Error & { loc?: { line: number } };
        const msg = err.message.replace(/^Error transforming .*?:\s*/, '').replace(/\s*\(\d+:\d+\)\s*$/, '');
        const r = erro('SyntaxError', msg, err.loc?.line ?? null, EXPLICACAO_JS.SyntaxError);
        return { saida: '', terminal: r.traceback, erro: r, retorno: null };
      }

      const g = globalThis as unknown as Record<string, unknown>;
      const consoleReal = g.console;
      g.console = consoleFalso;
      g.prompt = prompt;
      g.__retorno = undefined;
      let falha: ErroCodigo | null = null;
      try {
        // eval indireto: roda como script global e as linhas do erro batem com as do editor
        const sufixo = d.chamada ? `\n;globalThis.__retorno = (${d.chamada});` : '';
        (0, eval)(`${fonte}${sufixo}\n//# sourceURL=${arquivo}`);
        await new Promise((r) => setTimeout(r, 20)); // deixa rodar setTimeout/Promises curtos
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        const m = err.stack?.match(new RegExp(`${arquivo.replace('.', '\\.')}:(\\d+)`));
        const nome = err.name || 'Error';
        falha = erro(nome, err.message, m ? Number(m[1]) : null, EXPLICACAO_JS[nome] ?? '', dicaJS(err));
        terminal += `Uncaught ${falha.traceback}\n`;
      } finally {
        g.console = consoleReal;
      }
      return { saida, terminal, erro: falha, retorno: d.chamada && !falha ? inspecionar(g.__retorno, true) : null };
    },
  };
}

/* ------------------------------------------------------------------ C/C++ */

async function criarC(): Promise<Runtime> {
  const mod = (await import('JSCPP/lib/launcher')) as unknown as { default: { default?: unknown } & Record<string, unknown> };
  const jscpp = (mod.default.default ?? mod.default) as { run(codigo: string, entrada: string, config: object): number };
  return {
    executar(d) {
      let saida = '';
      try {
        const codigoSaida = jscpp.run(d.codigo, (d.entradas ?? []).join('\n'), {
          stdio: {
            write: (s: string) => {
              saida += s;
              if (saida.length > LIMITE_SAIDA) throw new Error('O programa imprimiu texto demais (laço sem fim?).');
            },
          },
          maxTimeout: 4500,
        });
        const fim = codigoSaida ? `\n[o programa terminou com código ${codigoSaida}]` : '';
        return { saida, terminal: saida + fim, erro: null, retorno: null };
      } catch (e) {
        const msg = (e as Error).message ?? String(e);
        const linha = Number(msg.match(/[Ll]ine (\d+)/)?.[1] ?? msg.match(/^(\d+):\d+/)?.[1] ?? 0) || null;
        let tipo = 'Erro de execução';
        let mensagem = msg.replace(/^\d+:\d+\s*/, '');
        let explicacao = '';
        let dica: string | null = null;
        if (/Parsing Failure/i.test(msg)) {
          tipo = 'Erro de sintaxe';
          const achou = msg.match(/but (.+) found/)?.[1];
          const coluna = msg.match(/column (\d+)/)?.[1];
          mensagem = `O compilador não esperava ${achou ?? 'isto'} na linha ${linha ?? '?'}${coluna ? `, coluna ${coluna}` : ''}.`;
          explicacao = 'O código não segue as regras do C. Confira ; no fim de cada instrução, chaves { } e parênteses fechados e as aspas.';
          if (/Expected[^\n]*";"/.test(msg) && linha && linha > 1) {
            dica = `Muito provavelmente falta um ; no fim da linha ${linha - 1} (o erro aparece na linha seguinte, onde o compilador percebeu).`;
          }
        } else if (/does not exist|not (been )?(defined|declared)|cannot find/i.test(msg)) {
          tipo = 'Nome não declarado';
          explicacao = 'Em C toda variável precisa ser declarada com o tipo antes do uso (ex.: int idade;). Confira a grafia e os #include.';
        } else if (/divi.*zero|zero.*divi/i.test(msg)) {
          tipo = 'Divisão por zero';
        } else if (/Time limit/i.test(msg)) {
          tipo = 'Tempo esgotado';
          explicacao = 'O programa demorou demais: provavelmente um laço que nunca termina.';
        } else if (/overflow/i.test(msg)) {
          tipo = 'Estouro de valor';
          explicacao = 'O resultado não cabe no tipo da variável (ex.: int tem limite). Use um tipo maior, como long long, ou confira a conta.';
        }
        // do erro do compilador, mantém só o trecho com a seta (^) que aponta o lugar
        const trecho = /Parsing Failure/i.test(msg) ? msg.split('\n').slice(1, 3).join('\n') : '';
        const r: ErroCodigo = { tipo, mensagem, linha, explicacao, dica, traceback: `${tipo}: ${mensagem}${trecho ? `\n${trecho}` : ''}` };
        return { saida, terminal: `${saida}${saida && !saida.endsWith('\n') ? '\n' : ''}${r.traceback}\n`, erro: r, retorno: null };
      }
    },
  };
}

/* -------------------------------------------------------------------- SQL */

const EXPLICACAO_SQL: [RegExp, string][] = [
  [/no such table/i, 'Essa tabela não existe. Confira o nome (e a grafia) das tabelas disponíveis.'],
  [/no such column/i, 'Essa coluna não existe na tabela. Confira o nome da coluna.'],
  [/syntax error/i, 'Erro de sintaxe no SQL: confira vírgulas entre colunas, aspas simples nos textos e a ordem das cláusulas (SELECT, FROM, WHERE, GROUP BY, ORDER BY).'],
  [/ambiguous column/i, 'A coluna existe em mais de uma tabela do JOIN: escreva tabela.coluna.'],
];

async function criarSQL(base: string): Promise<Runtime> {
  const { default: initSqlJs } = await import('sql.js');
  const SQL = await initSqlJs({ locateFile: () => `${base}sqljs/sql-wasm.wasm` });
  return {
    executar(d) {
      const db = new SQL.Database();
      try {
        if (d.preparo) db.run(d.preparo);
        const resultados = db.exec(d.codigo);
        const tabelas = resultados.map((r) => ({
          colunas: r.columns,
          linhas: r.values.map((l) => l.map((v) => (v === null ? 'NULL' : v instanceof Uint8Array ? '<blob>' : String(v)))),
        }));
        const saida = tabelas.map((t) => [t.colunas.join(' | '), ...t.linhas.map((l) => l.join(' | '))].join('\n') + '\n').join('\n');
        const terminal = saida || 'Comando executado (nenhuma linha retornada).\n';
        return { saida, terminal, erro: null, retorno: null, tabelas };
      } catch (e) {
        const msg = (e as Error).message;
        const explicacao = EXPLICACAO_SQL.find(([re]) => re.test(msg))?.[1] ?? '';
        const r = erro('Erro de SQL', msg, null, explicacao);
        return { saida: '', terminal: r.traceback + '\n', erro: r, retorno: null };
      } finally {
        db.close();
      }
    },
  };
}

/* ---------------------------------------------------------------- despacho */

let runtime: Promise<Runtime> | null = null;

function carregar(linguagem: Linguagem, base: string) {
  runtime ??= (() => {
    switch (linguagem) {
      case 'python': return criarPython(base);
      case 'javascript': return criarJS(false);
      case 'typescript': return criarJS(true);
      case 'c':
      case 'cpp': return criarC();
      case 'sql': return criarSQL(base);
      default: return Promise.reject(new Error(`Linguagem sem executor: ${linguagem}`));
    }
  })();
  runtime.catch(() => (runtime = null));
  return runtime;
}

self.onmessage = async (ev: MessageEvent) => {
  const { id, linguagem, base, acao, dados } = ev.data as { id: number; linguagem: Linguagem; base: string; acao: string; dados: Dados };
  try {
    const rt = await carregar(linguagem, base);
    let resultado: unknown = null;
    if (acao === 'executar') resultado = await rt.executar(dados);
    else if (acao === 'analisar') resultado = rt.analisar ? rt.analisar(dados) : null;
    postMessage({ id, ok: true, resultado });
  } catch (e) {
    postMessage({ id, ok: false, erro: String((e as Error)?.message ?? e) });
  }
};
