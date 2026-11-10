import { Fragment } from 'react';
import type { Cor, Estado, EstadoArray, EstadoGrafo, EstadoLista, EstadoPilhaFila, Ponteiro } from '../../lib/visual/passos';

/** Desenha o estado de um passo. Cada tipo de estrutura tem o seu palco; as cores vêm dos tokens --st-*. */
export default function Palco({ estado }: { estado: Estado }) {
  switch (estado.tipo) {
    case 'pilha':
    case 'fila':
      return <PalcoPilhaFila e={estado} />;
    case 'lista':
      return <PalcoLista e={estado} />;
    case 'array':
      return <PalcoArray e={estado} />;
    case 'grafo':
      return <PalcoGrafo e={estado} />;
  }
}

const cls = (cor: Cor) => `vs-cor-${cor}`;

function Ponteiros({ lista, idx }: { lista: Ponteiro[]; idx: number }) {
  const aqui = lista.filter((p) => p.idx === idx);
  return (
    <div className="vs-ptrs">
      {aqui.map((p) => <span key={p.nome} className={`vs-ptr vs-ptr-${p.nome}`}>{p.nome}</span>)}
    </div>
  );
}

function PalcoPilhaFila({ e }: { e: EstadoPilhaFila }) {
  const pilha = e.tipo === 'pilha';
  return (
    <div className="vs-pf">
      {!pilha && <div className="vs-pf-ponta">início<br />(sai)</div>}
      <div className={pilha ? 'vs-pilha' : 'vs-fila'} aria-label={`${e.tipo}: ${e.itens.join(', ') || 'vazia'}`}>
        {e.itens.map((v, i) => (
          <div key={`${i}-${v}`} className={`vs-item ${cls(e.cores[i])}`}>{v}</div>
        ))}
        {!e.itens.length && <div className="vs-vazio">vazia</div>}
      </div>
      {!pilha && <div className="vs-pf-ponta">fim<br />(entra)</div>}
      <div className="vs-pf-info">
        {pilha && <span className="vs-pf-topo">topo ↑ entra e sai por cima</span>}
        {e.saiu != null && <span className="vs-saiu">saiu: <b>{e.saiu}</b></span>}
        {e.aviso && <span className="vs-aviso">⚠ {e.aviso}</span>}
      </div>
    </div>
  );
}

function PalcoLista({ e }: { e: EstadoLista }) {
  // índice do último nó que ainda está na lista (o que aponta para None)
  const naLista = e.nos.map((n, i) => (n.fora ? -1 : i)).filter((i) => i >= 0);
  const ultimo = naLista[naLista.length - 1];
  return (
    <div className="vs-lista" aria-label={`lista: ${e.nos.filter((n) => !n.fora).map((n) => n.valor).join(' → ') || 'vazia'}`}>
      {e.cabeca == null && !e.nos.length && <div className="vs-vazio">cabeca → None</div>}
      {e.nos.map((n, i) => (
        <Fragment key={i}>
          <div className={`vs-no-col${n.fora ? ' vs-fora' : ''}`}>
            <div className="vs-cabeca">{e.cabeca === i ? 'cabeca ↓' : ''}</div>
            <div className={`vs-no ${cls(n.cor)}`}>
              <span className="vs-no-valor">{n.valor}</span>
              <span className="vs-no-prox">{e.setas[i] === 'nao' ? '∅' : '●'}</span>
            </div>
            <Ponteiros lista={e.ptrs} idx={i} />
          </div>
          {e.setas[i] === 'sim' && <div className={`vs-seta${n.fora ? ' vs-fora' : ''}`} aria-hidden>→</div>}
          {e.setas[i] === 'pula' && <div className="vs-seta vs-seta-pula" aria-hidden>→</div>}
          {e.setas[i] === 'nao' && i === ultimo && <div className="vs-none">None</div>}
          {e.setas[i] === 'nao' && i !== ultimo && !n.fora && <div className="vs-seta vs-seta-solta" aria-hidden />}
        </Fragment>
      ))}
    </div>
  );
}

function PalcoArray({ e }: { e: EstadoArray }) {
  const max = Math.max(1, ...e.a.map(Math.abs));
  return (
    <div className="vs-array-palco">
      <div className={`vs-array${e.barras ? ' vs-barras' : ''}`} aria-label={`array: ${e.a.join(', ')}`}>
        {e.a.map((v, i) => (
          <div key={i} className={`vs-cel ${cls(e.cores[i])}`}>
            {e.barras ? (
              <div className="vs-barra-area">
                <div className="vs-barra" style={{ height: `${12 + (88 * Math.abs(v)) / max}%` }}><span>{v}</span></div>
              </div>
            ) : (
              <div className="vs-caixa">{v}</div>
            )}
            <div className="vs-idx">{i}</div>
            <Ponteiros lista={e.ptrs} idx={i} />
          </div>
        ))}
      </div>
      {e.aux && (
        <div className="vs-aux">
          <span className="vs-aux-rotulo">resultado</span>
          <div className="vs-array">
            {e.aux.map((v, i) => (
              <div key={i} className="vs-cel"><div className={`vs-caixa vs-caixa-aux${v == null ? ' vs-caixa-vazia' : ''}`}>{v ?? ''}</div></div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PalcoGrafo({ e }: { e: EstadoGrafo }) {
  const W = 320, H = 200, R = 15;
  const P = new Map(e.vertices.map((v) => [v.id, { x: 20 + (v.x / 100) * (W - 40) * 1.08, y: 10 + (v.y / 100) * (H - 20) }]));
  return (
    <div className="vs-grafo">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="grafo">
        <defs>
          <marker id="vs-ponta" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="context-stroke" />
          </marker>
        </defs>
        {e.arestas.map((a, k) => {
          const p = P.get(a.de)!, q = P.get(a.para)!;
          const dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy) || 1;
          return (
            <line key={k} x1={p.x + (dx / d) * R} y1={p.y + (dy / d) * R} x2={q.x - (dx / d) * (R + 2)} y2={q.y - (dy / d) * (R + 2)}
              className={`vs-aresta${a.destaque ? ' vs-aresta-arvore' : ''}`} markerEnd={e.dirigido ? 'url(#vs-ponta)' : undefined} />
          );
        })}
        {e.vertices.map((v) => {
          const p = P.get(v.id)!;
          return (
            <g key={v.id} className={`vs-vertice ${cls(v.cor)}`}>
              <circle cx={p.x} cy={p.y} r={R} />
              <text x={p.x} y={p.y} dy=".35em" textAnchor="middle">{v.id}</text>
              {v.rotulo && <text x={p.x} y={p.y + R + 11} textAnchor="middle" className="vs-vertice-rotulo">{v.rotulo}</text>}
            </g>
          );
        })}
      </svg>
      <div className="vs-estrutura">
        <span className="vs-aux-rotulo">{e.estrutura.nome}</span>
        <div className="vs-estrutura-itens">
          {e.estrutura.itens.length ? e.estrutura.itens.map((v, i) => <span key={i} className="vs-chip">{v}</span>) : <span className="vs-vazio">vazia</span>}
        </div>
      </div>
    </div>
  );
}
