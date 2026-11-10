import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Visual } from '../../lib/visual/passos';
import Palco from './Palco';

/** Narração com **negrito** e `código`, sem HTML solto. */
export function TextoRico({ texto }: { texto: string }) {
  return (
    <>
      {texto.split(/(\*\*[^*]+\*\*|`[^`]+`)/).map((t, i) =>
        t.startsWith('**') ? <b key={i}>{t.slice(2, -2)}</b> : t.startsWith('`') ? <code key={i}>{t.slice(1, -1)}</code> : t,
      )}
    </>
  );
}

type Aba = 'codigo' | 'vars' | 'custo';

/**
 * Motor genérico de explicação passo a passo (anatomia em docs/design/prototipo-visual.html):
 * cabeçalho, palco, pseudocódigo com a linha atual, variáveis, narração, controles,
 * previsão que trava o avanço e legenda. Teclado: ← → e espaço; no celular, deslizar o palco.
 */
export default function VisualStep({ visual, cabecalho }: { visual: Visual; cabecalho?: ReactNode }) {
  const { passos } = visual;
  const [i, setI] = useState(0);
  const [respondidas, setRespondidas] = useState<Set<number>>(new Set());
  const [escolhas, setEscolhas] = useState<Record<number, string[]>>({});
  const [tocando, setTocando] = useState(false);
  const [velocidade, setVelocidade] = useState(2);
  const [aba, setAba] = useState<Aba>('codigo');
  const toque = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setI(0);
    setRespondidas(new Set());
    setEscolhas({});
    setTocando(false);
  }, [visual]);

  const ultimo = passos.length - 1;
  const atual = Math.min(i, ultimo);
  const p = passos[atual];
  const travado = (k: number) => !!passos[k]?.prever && !respondidas.has(k);

  const ir = (n: number) => {
    n = Math.max(0, Math.min(ultimo, n));
    if (n > atual) for (let k = atual; k < n; k++) if (travado(k)) { n = k; break; }
    setI(n);
  };

  useEffect(() => {
    if (!tocando) return;
    if (atual >= ultimo || travado(atual)) { setTocando(false); return; }
    const t = setTimeout(() => setI(atual + 1), 1600 / velocidade);
    return () => clearTimeout(t);
  });

  const parar = () => setTocando(false);
  const tocar = () => {
    if (tocando) return parar();
    if (atual === ultimo) setI(0);
    setTocando(true);
  };

  const teclas = (e: React.KeyboardEvent) => {
    const alvo = e.target as HTMLElement;
    if (alvo.tagName === 'INPUT' || alvo.tagName === 'TEXTAREA') return;
    if (e.key === 'ArrowRight') { e.preventDefault(); parar(); ir(atual + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); parar(); ir(atual - 1); }
    else if (e.key === ' ' && alvo.tagName !== 'BUTTON') { e.preventDefault(); tocar(); }
  };

  const responder = (opcao: string) => {
    if (!p.prever) return;
    setEscolhas((es) => ({ ...es, [atual]: [...(es[atual] ?? []), opcao] }));
    if (opcao === p.prever.resposta) {
      setRespondidas((r) => new Set(r).add(atual));
    }
  };

  const linhas = visual.trechos[p.trecho] ?? [];
  const custo = visual.custo?.(p);
  const escolhidas = escolhas[atual] ?? [];
  const acertou = respondidas.has(atual);
  const errouUltima = escolhidas.length > 0 && !acertou;
  const abas: [Aba, string][] = [['codigo', 'Código'], ['vars', 'Variáveis'], ...(custo ? [['custo', 'Custo'] as [Aba, string]] : [])];

  return (
    <section className="vs" aria-label={visual.titulo} onKeyDown={teclas}>
      <div className="vs-cabecalho">
        <h3><span className="vs-selo">passo a passo</span>{visual.titulo}</h3>
        {cabecalho}
      </div>
      <div className="vs-corpo">
        <div
          className="vs-palco"
          onTouchStart={(e) => {
            if ((e.target as HTMLElement).closest('button')) return;
            toque.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
          }}
          onTouchEnd={(e) => {
            const t0 = toque.current;
            toque.current = null;
            if (!t0) return;
            const dx = e.changedTouches[0].clientX - t0.x, dy = e.changedTouches[0].clientY - t0.y;
            if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) { parar(); ir(dx < 0 ? atual + 1 : atual - 1); }
          }}
        >
          <Palco estado={p.estado} />
          <div className="vs-legenda">
            {visual.legenda.map((l) => <span key={l.cor} className={`vs-cor-${l.cor}`}>{l.nome}</span>)}
          </div>
          {p.prever && (
            <div className="vs-prever">
              <b>Antes de avançar:</b> <TextoRico texto={p.prever.pergunta} />
              <div className="vs-prever-opcoes">
                {p.prever.opcoes.map((o) => {
                  const marcada = escolhidas.includes(o);
                  const certa = o === p.prever!.resposta;
                  return (
                    <button key={o} type="button" disabled={acertou || marcada}
                      className={marcada ? (certa ? 'vs-ok' : 'vs-errado') : acertou && certa ? 'vs-ok' : ''}
                      onClick={() => responder(o)}>{o}</button>
                  );
                })}
              </div>
              <div className="vs-prever-fb" aria-live="polite">
                {acertou && <p className="vs-fb-ok">Isso! <TextoRico texto={p.prever.porque} /></p>}
                {errouUltima && <p className="vs-fb-errado">Ainda não. Pense de novo e tente outra opção.</p>}
              </div>
            </div>
          )}
        </div>
        <div className="vs-lado">
          <div className="vs-abas" role="tablist">
            {abas.map(([id, nome]) => (
              <button key={id} type="button" role="tab" aria-selected={aba === id} className={aba === id ? 'on' : ''} onClick={() => setAba(id)}>{nome}</button>
            ))}
          </div>
          <div className={`vs-painel${aba === 'codigo' ? ' on' : ''}`}>
            <div className="vs-rotulo">Código</div>
            <pre className="vs-codigo">
              {linhas.map((l, k) => <span key={k} className={k === p.linha ? 'hl' : ''}>{l || ' '}</span>)}
            </pre>
          </div>
          <div className={`vs-painel${aba === 'vars' ? ' on' : ''}`}>
            <div className="vs-rotulo">Variáveis</div>
            <div className="vs-vars">
              {Object.entries(p.vars).map(([k, v]) => <span key={k} className="vs-var">{k} = <b>{v}</b></span>)}
            </div>
          </div>
          {custo && (
            <div className={`vs-painel${aba === 'custo' ? ' on' : ''}`}>
              <div className="vs-rotulo">Custo</div>
              <pre className="vs-custo">{custo}</pre>
            </div>
          )}
        </div>
      </div>
      <div className="vs-narracao" aria-live="polite">
        <span className="vs-n">{atual + 1}/{passos.length}</span>
        <TextoRico texto={p.texto} />
      </div>
      <div className="vs-controles">
        <button type="button" onClick={() => { parar(); ir(0); }} disabled={atual === 0} aria-label="Primeiro passo" title="Primeiro passo">⏮</button>
        <button type="button" onClick={() => { parar(); ir(atual - 1); }} disabled={atual === 0} aria-label="Passo anterior" title="Passo anterior (←)">◀</button>
        <button type="button" className="vs-tocar" onClick={tocar} disabled={!tocando && travado(atual)} aria-label={tocando ? 'Pausar' : 'Reproduzir'} title="Reproduzir ou pausar (espaço)">
          {tocando ? '⏸' : '▶'}<span className="vs-so-desktop">{tocando ? ' Pausar' : ' Reproduzir'}</span>
        </button>
        <button type="button" onClick={() => { parar(); ir(atual + 1); }} disabled={atual === ultimo || travado(atual)} aria-label="Próximo passo" title="Próximo passo (→)">▶|</button>
        <button type="button" onClick={() => { parar(); ir(ultimo); }} disabled={atual === ultimo || travado(atual)} aria-label="Último passo" title="Último passo">⏭</button>
        <div className="vs-progresso" aria-hidden><i style={{ width: `${((atual + 1) / passos.length) * 100}%` }} /></div>
        <label className="vs-velocidade">Velocidade <input type="range" min={1} max={4} value={velocidade} onChange={(e) => setVelocidade(+e.target.value)} /></label>
      </div>
    </section>
  );
}
