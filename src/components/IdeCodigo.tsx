import { useEffect, useRef, useState } from 'react';
import EditorCodigo, { type EditorCodigoRef, type MarcaErro } from './EditorCodigo';
import {
  analisar, codigoLeEntrada, executar, LINGUAGENS, pareceCodigo, normalizarSaida, preparar, useEstadoRuntime,
  type ErroCodigo, type Linguagem, type ResultadoExecucao,
} from '../lib/execucao';

/**
 * Mini IDE da aula: editor + entrada do programa + executar + terminal.
 * Com `desafio`, também corrige: roda os testes, confere a indentação e se o
 * código usa o que foi pedido, e só aprova quando tudo passa.
 */

export interface Teste {
  /** linhas digitadas pelo usuário, na ordem em que o programa as lê */
  entradas: string[];
  /** saída esperada (ou o valor esperado de `chamada`) */
  esperado: string;
  /** expressão avaliada depois do programa, ex.: dobro(3) */
  chamada?: string;
  /** HTML: expressão JavaScript que precisa dar verdadeiro na página, ex.: document.querySelector('h1') !== null */
  verifica?: string;
  descricao?: string;
  visivel: boolean;
}

export interface Desafio {
  testes: Teste[];
  /** funções, palavras-chave ou estruturas que o código precisa usar, ex.: ["int", "if"] */
  usa?: string[];
  /** confere a indentação (padrão: sim) */
  indentacao?: boolean;
  solucao?: string;
}

interface Props {
  linguagem: Linguagem;
  codigoInicial: string;
  /** guarda o rascunho no navegador com esta chave */
  chaveRascunho?: string;
  /** SQL que cria as tabelas antes de cada execução */
  preparo?: string;
  desafio?: Desafio;
  onVerificado?: (ok: boolean) => void;
}

interface Verificacao {
  ok: boolean;
  testes: { teste: Teste; ok: boolean; obtido: string; erro: ErroCodigo | null }[];
  indentacao: { linha: number; mensagem: string }[];
  faltando: string[];
  conferiuIndentacao: boolean;
}

const PESO: Partial<Record<Linguagem, string>> = { python: '~12 MB', sql: '~1 MB', c: '~1 MB' };

const lerRascunho = (chave?: string) => (chave ? localStorage.getItem(`sala-de-aula:rascunho:${chave}`) : null);

export default function IdeCodigo({ linguagem, codigoInicial, chaveRascunho, preparo, desafio, onVerificado }: Props) {
  const info = LINGUAGENS[linguagem];
  const editor = useRef<EditorCodigoRef>(null);
  const caixa = useRef<HTMLDivElement>(null);
  const iframe = useRef<HTMLIFrameElement>(null);
  const execucoesHtml = useRef(0);
  const [codigo, setCodigo] = useState(() => lerRascunho(chaveRascunho) ?? codigoInicial);
  const primeiroVisivel = desafio?.testes.find((t) => t.visivel && t.entradas.length);
  const [entrada, setEntrada] = useState(primeiroVisivel?.entradas.join('\n') ?? '');
  const [rodando, setRodando] = useState<'executar' | 'verificar' | null>(null);
  const [resultado, setResultado] = useState<ResultadoExecucao | null>(null);
  const [verificacao, setVerificacao] = useState<Verificacao | null>(null);
  const [tentativas, setTentativas] = useState(0);
  const [verSolucao, setVerSolucao] = useState(false);
  const [htmlDoc, setHtmlDoc] = useState('');
  const estado = useEstadoRuntime(linguagem);
  // o campo de entradas só aparece quando o código chama input()/prompt()/scanf
  const temEntrada = !!info.leitura && codigoLeEntrada(linguagem, codigo);
  const entradaPareceCodigo = temEntrada && pareceCodigo(entrada);

  // carrega o runtime quando a IDE aparece na tela, para a primeira execução ser rápida
  useEffect(() => {
    const el = caixa.current;
    if (!el) return;
    const obs = new IntersectionObserver((itens) => {
      if (itens.some((i) => i.isIntersecting)) {
        preparar(linguagem).catch(() => {});
        obs.disconnect();
      }
    }, { rootMargin: '200px' });
    obs.observe(el);
    return () => obs.disconnect();
  }, [linguagem]);

  function mudar(novo: string) {
    setCodigo(novo);
    if (chaveRascunho) localStorage.setItem(`sala-de-aula:rascunho:${chaveRascunho}`, novo);
  }

  function marcarErros(erro: ErroCodigo | null, extras: MarcaErro[] = []) {
    const marcas = [...extras];
    if (erro?.linha) marcas.unshift({ linha: erro.linha, mensagem: `${erro.tipo}: ${erro.mensagem}` });
    editor.current?.marcar(marcas);
  }

  /** HTML roda num iframe; captura console.log e erros da página. */
  function rodarHtml(fonte: string): Promise<ResultadoExecucao> {
    const espiao = `<script>window.__logs=[];window.__erros=[];['log','info'].forEach(function(k){var o=console[k];console[k]=function(){window.__logs.push([].map.call(arguments,String).join(' '));o.apply(console,arguments)}});addEventListener('error',function(e){window.__erros.push({m:e.message,l:e.lineno})});</script>`;
    return new Promise((ok) => {
      const f = iframe.current!;
      f.onload = () => {
        setTimeout(() => {
          const w = f.contentWindow as (Window & { __logs?: string[]; __erros?: { m: string; l: number }[] }) | null;
          const logs = w?.__logs ?? [];
          const e = w?.__erros?.[0];
          const erro: ErroCodigo | null = e
            ? { tipo: 'Erro no JavaScript da página', mensagem: e.m, linha: e.l || null, explicacao: '', dica: null, traceback: e.m }
            : null;
          const saida = logs.map((l) => l + '\n').join('');
          ok({ saida, terminal: saida + (erro ? `${erro.mensagem} (linha ${erro.linha})\n` : ''), erro, retorno: null });
        }, 50);
      };
      // o comentário no fim muda a cada execução, para o iframe recarregar mesmo sem mudança no código
      execucoesHtml.current += 1;
      setHtmlDoc(`${espiao}${fonte}\n<!-- execução ${execucoesHtml.current} -->`);
    });
  }

  async function rodar(entradas: string[], chamada?: string): Promise<ResultadoExecucao> {
    if (linguagem === 'html') return rodarHtml(codigo);
    try {
      return await executar(linguagem, { codigo, entradas, chamada, preparo });
    } catch (e) {
      const msg = (e as Error).message;
      const erro: ErroCodigo = { tipo: (e as Error).name === 'TempoEsgotado' ? 'Tempo esgotado' : 'Falha', mensagem: msg, linha: null, explicacao: '', dica: null, traceback: msg };
      return { saida: '', terminal: '', erro, retorno: null };
    }
  }

  async function onExecutar() {
    if (rodando) return;
    setRodando('executar');
    setVerificacao(null);
    const entradas = entrada === '' ? [] : entrada.replace(/\r\n/g, '\n').split('\n');
    const r = await rodar(entradas);
    setResultado(r);
    marcarErros(r.erro);
    setRodando(null);
  }

  async function onVerificar() {
    if (!desafio || rodando) return;
    setRodando('verificar');
    const conferiuIndentacao = desafio.indentacao !== false && info.recuo > 0;
    let analise = { indentacao: [] as { linha: number; mensagem: string }[], faltando: [] as string[] };
    try {
      analise = await analisar(linguagem, codigo, desafio.usa);
    } catch {
      // segue só com os testes
    }
    const testes: Verificacao['testes'] = [];
    const execucoes: ResultadoExecucao[] = [];
    for (const teste of desafio.testes) {
      const r = await rodar(teste.entradas, teste.chamada);
      let obtido = teste.chamada ? r.retorno ?? '' : r.saida;
      let ok: boolean;
      if (teste.verifica) {
        try {
          const w = iframe.current?.contentWindow as (Window & { eval(s: string): unknown }) | null;
          ok = !r.erro && !!w?.eval(teste.verifica);
        } catch {
          ok = false;
        }
        obtido = ok ? 'ok' : 'não atendeu';
      } else {
        ok = !r.erro && normalizarSaida(obtido) === normalizarSaida(teste.esperado);
      }
      testes.push({ teste, ok, obtido, erro: r.erro });
      execucoes.push(r);
      if (r.erro?.tipo === 'Tempo esgotado') break;
    }
    // no terminal, mostra a execução do primeiro teste visível que falhou (testes ocultos não revelam a entrada)
    const falho = testes.findIndex((t) => !t.ok && t.teste.visivel);
    const mostrar = execucoes[falho >= 0 ? falho : testes.findIndex((t) => t.teste.visivel)] ?? null;
    const indentacao = conferiuIndentacao ? analise.indentacao : [];
    const ok = testes.every((t) => t.ok) && indentacao.length === 0 && analise.faltando.length === 0;
    const v: Verificacao = { ok, testes, indentacao, faltando: analise.faltando, conferiuIndentacao };
    setVerificacao(v);
    setResultado(mostrar);
    marcarErros(mostrar?.erro ?? null, indentacao.map((p) => ({ ...p, severidade: 'warning' as const })));
    setTentativas((n) => n + 1);
    onVerificado?.(ok);
    setRodando(null);
  }

  function recomecar() {
    editor.current?.definir(codigoInicial);
    mudar(codigoInicial);
    setResultado(null);
    setVerificacao(null);
    editor.current?.marcar([]);
  }

  const status =
    estado === 'carregando' ? `⏳ carregando ${info.nome} no navegador${PESO[linguagem] ? ` (só na primeira vez, ${PESO[linguagem]})` : ''}…`
      : estado === 'falhou' ? '⚠️ não foi possível carregar o executor; confira a conexão e tente de novo'
        : estado === 'pronto' ? '● pronto' : '';

  return (
    <div className="ide" ref={caixa}>
      <div className="ide-topo">
        <span className="ide-arquivo">✏️ Escreva o código aqui · {info.arquivo}</span>
        <span className={`ide-status ${estado}`}>{status}</span>
      </div>

      <EditorCodigo ref={editor} linguagem={linguagem} valor={codigo} onChange={mudar} onExecutar={onExecutar} />

      {temEntrada && (
        <label className="ide-entrada">
          <span>
            ⌨️ <strong>O que a pessoa digita</strong> quando o programa chama {info.leitura}: um valor por linha. Não é código.
          </span>
          <textarea rows={Math.max(2, entrada.split('\n').length)} value={entrada} spellCheck={false}
            onChange={(e) => setEntrada(e.target.value)} placeholder="ex.: 26" />
          {entradaPareceCodigo && (
            <span className="ide-aviso">
              ⚠️ Isso parece código. O código vai no editor acima; aqui ficam só os valores que o {info.leitura} vai ler (por exemplo, uma idade).
            </span>
          )}
        </label>
      )}

      <div className="acoes">
        <button className="botao primario" onClick={onExecutar} disabled={!!rodando} title="Ctrl+Enter">
          {rodando === 'executar' ? 'Executando…' : '▶ Executar'}
        </button>
        {desafio && (
          <button className="botao ok" onClick={onVerificar} disabled={!!rodando}>
            {rodando === 'verificar' ? 'Corrigindo…' : '✓ Verificar resposta'}
          </button>
        )}
        <button className="link" onClick={recomecar}>↺ Recomeçar</button>
      </div>

      {linguagem === 'html' && (
        <iframe ref={iframe} className="ide-preview" title="Prévia da página" srcDoc={htmlDoc}
          sandbox="allow-scripts allow-same-origin allow-modals" />
      )}

      {resultado && <Terminal r={resultado} irParaLinha={(l) => editor.current?.irParaLinha(l)} />}

      {verificacao && <ResultadoVerificacao v={verificacao} linguagem={linguagem} irParaLinha={(l) => editor.current?.irParaLinha(l)} />}

      {desafio?.solucao && (tentativas >= 2 || verificacao?.ok) && (
        verSolucao ? (
          <div className="resposta">
            <strong>Uma solução possível:</strong>
            <pre className="bloco-codigo"><code>{desafio.solucao}</code></pre>
          </div>
        ) : (
          <button className="link" onClick={() => setVerSolucao(true)}>Ver uma solução</button>
        )
      )}
    </div>
  );
}

function Terminal({ r, irParaLinha }: { r: ResultadoExecucao; irParaLinha: (l: number) => void }) {
  return (
    <div className="ide-saida">
      {r.tabelas?.length ? (
        r.tabelas.map((t, i) => (
          <div key={i} className="ide-tabela">
            <table>
              <thead><tr>{t.colunas.map((c) => <th key={c}>{c}</th>)}</tr></thead>
              <tbody>{t.linhas.map((l, j) => <tr key={j}>{l.map((v, k) => <td key={k}>{v}</td>)}</tr>)}</tbody>
            </table>
            <small>{t.linhas.length} linha(s)</small>
          </div>
        ))
      ) : (
        <pre className="ide-terminal" aria-label="Saída do programa">{r.terminal || '(o programa não imprimiu nada)'}</pre>
      )}
      {r.erro && (
        <div className="ide-erro" role="alert">
          <strong>
            {r.erro.tipo}
            {r.erro.linha && (
              <> na <button className="link-linha" onClick={() => irParaLinha(r.erro!.linha!)}>linha {r.erro.linha}</button></>
            )}
          </strong>
          <code>{r.erro.mensagem}</code>
          {r.erro.explicacao && <p>{r.erro.explicacao}</p>}
          {r.erro.dica && <p>💡 {r.erro.dica}</p>}
        </div>
      )}
    </div>
  );
}

function ResultadoVerificacao({ v, linguagem, irParaLinha }: { v: Verificacao; linguagem: Linguagem; irParaLinha: (l: number) => void }) {
  const passaram = v.testes.filter((t) => t.ok).length;
  const info = LINGUAGENS[linguagem];
  return (
    <div className={v.ok ? 'feedback ok' : 'feedback nok'}>
      <strong>{v.ok ? '✅ Tudo certo! Resposta aceita.' : '❌ Ainda não. Veja o que falta:'}</strong>
      <ul className="ide-checks">
        {v.testes.map((t, i) => (
          <li key={i} className={t.ok ? 'passou' : 'falhou'}>
            {t.ok ? '✓' : '✗'} {t.teste.visivel ? `Teste ${i + 1}` : `Teste oculto ${i + 1}`}
            {t.teste.descricao && `: ${t.teste.descricao}`}
            {t.teste.visivel && !t.ok && (
              <div className="ide-diff">
                {t.teste.entradas.length > 0 && <div><span>Entrada</span><pre>{t.teste.entradas.join('\n')}</pre></div>}
                {t.teste.chamada && <div><span>Chamada</span><pre>{t.teste.chamada}</pre></div>}
                {!t.teste.verifica && <div><span>Esperado</span><pre>{t.teste.esperado || '(nada)'}</pre></div>}
                {!t.teste.verifica && <div><span>Seu programa</span><pre>{t.erro ? `${t.erro.tipo}: ${t.erro.mensagem}` : t.obtido || '(nada)'}</pre></div>}
              </div>
            )}
            {!t.teste.visivel && !t.ok && <small> (pense em outros valores de entrada, não só no exemplo)</small>}
          </li>
        ))}
        {v.conferiuIndentacao && (
          <li className={v.indentacao.length ? 'falhou' : 'passou'}>
            {v.indentacao.length ? '✗' : '✓'} Indentação com {info.recuo} espaços por nível, sem TAB
            {v.indentacao.map((p) => (
              <div key={p.linha} className="ide-problema">
                <button className="link-linha" onClick={() => irParaLinha(p.linha)}>linha {p.linha}</button> {p.mensagem}
              </div>
            ))}
          </li>
        )}
        {v.faltando.map((u) => (
          <li key={u} className="falhou">✗ O enunciado pede para usar <code>{u}</code></li>
        ))}
      </ul>
      {!v.ok && <small>{passaram} de {v.testes.length} teste(s) passaram.</small>}
    </div>
  );
}
