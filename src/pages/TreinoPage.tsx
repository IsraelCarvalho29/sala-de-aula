import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { acharItem, todosOsItens, type ItemTreino } from '../lib/banco';
import { aulasDaTrilha, idAula, linkAula, trilhas, type Aula } from '../lib/conteudo';
import { prerequisitosPendentes } from '../lib/dominio';
import { useProgresso, type Progresso } from '../lib/progresso';
import { diasEntre, dominada, embaralhar, fraca, hoje, intercalar, INTERVALOS, vencida } from '../lib/revisao';
import Quiz from '../components/Quiz';
import { CartaoFlashcard } from '../components/Flashcard';

/**
 * Modo de treino: sessões curtas com as perguntas e flashcards das aulas e do banco geral,
 * agendadas por repetição espaçada (1, 3, 7, 14 e 30 dias; ver lib/revisao.ts).
 */

const LIMITE_SESSAO = 20;
const NOVAS_POR_SESSAO = 8;

type Modo = 'dia' | 'fracos' | 'flashcards' | 'aula';

const MODOS: { modo: Modo; titulo: string; descricao: string }[] = [
  { modo: 'dia', titulo: '📅 Revisão do dia', descricao: 'As revisões vencidas, mais atrasadas primeiro, e algumas perguntas novas das aulas que você já estudou.' },
  { modo: 'fracos', titulo: '🎯 Pontos fracos', descricao: 'Perguntas que você errou em alguma das últimas tentativas.' },
  { modo: 'flashcards', titulo: '🃏 Só flashcards', descricao: 'Os flashcards vencidos e novos, para revisar rápido no celular.' },
  { modo: 'aula', titulo: '📖 Praticar uma aula', descricao: 'Todas as perguntas e flashcards de uma aula, da mais fácil para a mais difícil.' },
];

/** Aula estudada = concluída ou com alguma pergunta respondida. Só delas saem perguntas novas. */
function aulasEstudadas(p: Progresso) {
  const ids = new Set(Object.keys(p.concluidas));
  for (const id of Object.keys(p.revisao)) {
    const aula = acharItem(id)?.aula;
    if (aula) ids.add(idAula(aula));
  }
  return ids;
}

/** Trilhas com pelo menos uma aula estudada: liberam as questões do banco geral daquela trilha. */
function trilhasEstudadas(estudadas: Set<string>) {
  return new Set(trilhas.filter((t) => aulasDaTrilha(t).some((a) => estudadas.has(idAula(a)))).map((t) => t.slug));
}

function disponivelComoNova(item: ItemTreino, aulas: Set<string>, trilhasOk: Set<string>) {
  return item.aula ? aulas.has(idAula(item.aula)) : trilhasOk.has(item.trilha);
}

function montarSessao(modo: Modo, p: Progresso, opcoes: { codigo: boolean; aula?: string }, semente: number) {
  const dia = hoje();
  const itens = todosOsItens().filter((i) => opcoes.codigo || !i.codigo);
  const grupo = (i: ItemTreino) => i.grupo;

  if (modo === 'aula') {
    return itens
      .filter((i) => i.aula && idAula(i.aula) === opcoes.aula)
      .sort((a, b) => a.dificuldade - b.dificuldade);
  }
  if (modo === 'fracos') {
    return intercalar(embaralhar(itens.filter((i) => fraca(p.revisao[i.id])), semente), grupo).slice(0, LIMITE_SESSAO);
  }

  const estudadas = aulasEstudadas(p);
  const trilhasOk = trilhasEstudadas(estudadas);
  const base = modo === 'flashcards' ? itens.filter((i) => i.tipo === 'flashcard') : itens;
  const vencidas = base
    .filter((i) => vencida(p.revisao[i.id], dia))
    .sort((a, b) => p.revisao[a.id].proxima.localeCompare(p.revisao[b.id].proxima));
  const novas = embaralhar(base.filter((i) => !p.revisao[i.id] && disponivelComoNova(i, estudadas, trilhasOk)), semente)
    .sort((a, b) => a.dificuldade - b.dificuldade)
    .slice(0, NOVAS_POR_SESSAO);
  return intercalar([...vencidas, ...novas].slice(0, LIMITE_SESSAO), grupo);
}

export default function TreinoPage() {
  const progresso = useProgresso();
  const [sessao, setSessao] = useState<{ modo: Modo; fila: ItemTreino[] } | null>(null);
  const [codigo, setCodigo] = useState(false);
  const [aulaEscolhida, setAulaEscolhida] = useState('');

  const resumo = useMemo(() => resumir(progresso), [progresso]);
  const aulasLiberadas = useMemo(
    () => trilhas.flatMap((t) => t.modulos.flatMap((m) => (m.aula && !prerequisitosPendentes(progresso, m).length ? [{ trilha: t.meta.titulo, aula: m.aula }] : []))),
    [progresso],
  );

  if (sessao) {
    return <Sessao fila={sessao.fila} titulo={MODOS.find((m) => m.modo === sessao.modo)!.titulo} onSair={() => setSessao(null)} />;
  }

  const iniciar = (modo: Modo) => {
    const fila = montarSessao(modo, progresso, { codigo, aula: aulaEscolhida }, Date.now() % 100000);
    setSessao({ modo, fila });
  };
  const tamanho = (modo: Modo) => montarSessao(modo, progresso, { codigo, aula: aulaEscolhida }, 1).length;

  return (
    <>
      <nav className="migalhas"><Link to="/">Início</Link> / Treino</nav>
      <h1>Treino</h1>
      <p className="desc">
        Recuperar da memória fixa mais do que reler. Cada pergunta acertada volta depois de {INTERVALOS.join(', ')} dias;
        errou, volta amanhã. Depois de 30 dias com acerto, ela está dominada.
      </p>

      <div className="painel-treino">
        <Numero valor={resumo.vencidas} rotulo="para revisar hoje" destaque={resumo.vencidas > 0} />
        <Numero valor={resumo.emRevisao} rotulo="em revisão" />
        <Numero valor={resumo.dominadas} rotulo="dominadas" />
        <Numero valor={resumo.total} rotulo="no banco" />
      </div>

      {resumo.semana.some((n) => n > 0) && (
        <div className="previsao">
          <strong>Próximos 7 dias</strong>
          <div className="previsao-barras">
            {resumo.semana.map((n, i) => (
              <div key={i} className="previsao-dia" title={`${n} revisões`}>
                <span className="previsao-barra" style={{ height: `${Math.min(100, (n / Math.max(...resumo.semana)) * 100)}%` }} />
                <small>{i === 0 ? 'amanhã' : `+${i + 1}d`}</small>
                <small className="previsao-n">{n}</small>
              </div>
            ))}
          </div>
        </div>
      )}

      <label className="opcao-linha">
        <input type="checkbox" checked={codigo} onChange={(e) => setCodigo(e.target.checked)} />
        Incluir desafios de código (sessões mais longas)
      </label>

      <div className="modos">
        {MODOS.map(({ modo, titulo, descricao }) => {
          const n = modo === 'aula' && !aulaEscolhida ? 0 : tamanho(modo);
          return (
            <div key={modo} className="cartao modo">
              <h2>{titulo}</h2>
              <p>{descricao}</p>
              {modo === 'aula' && (
                <select value={aulaEscolhida} onChange={(e) => setAulaEscolhida(e.target.value)}>
                  <option value="">Escolha a aula…</option>
                  {aulasLiberadas.map(({ trilha, aula }) => (
                    <option key={idAula(aula)} value={idAula(aula)}>{trilha}: {aula.meta.codigo} {aula.meta.titulo}</option>
                  ))}
                </select>
              )}
              <button className="botao primario" disabled={!n} onClick={() => iniciar(modo)}>
                {n ? `Começar (${n})` : modo === 'aula' ? 'Começar' : 'Nada pendente'}
              </button>
            </div>
          );
        })}
      </div>

      {resumo.total > 0 && resumo.emRevisao === 0 && (
        <p className="dica">
          Ainda não há nada em revisão. Responda as perguntas de uma aula (ou conclua uma aula) e elas passam a aparecer aqui.
        </p>
      )}
    </>
  );
}

function Numero({ valor, rotulo, destaque }: { valor: number; rotulo: string; destaque?: boolean }) {
  return (
    <div className={destaque ? 'numero destaque' : 'numero'}>
      <strong>{valor}</strong>
      <span>{rotulo}</span>
    </div>
  );
}

function resumir(p: Progresso) {
  const dia = hoje();
  const itens = todosOsItens();
  const semana = Array.from({ length: 7 }, () => 0);
  let vencidas = 0, emRevisao = 0, dominadas = 0;
  for (const i of itens) {
    const r = p.revisao[i.id];
    if (!r) continue;
    emRevisao++;
    if (dominada(r)) dominadas++;
    if (r.proxima <= dia) vencidas++;
    else {
      const d = diasEntre(dia, r.proxima);
      if (d >= 1 && d <= 7) semana[d - 1]++;
    }
  }
  return { total: itens.length, vencidas, emRevisao, dominadas, semana };
}

/* ------------------------------------------------------------- sessão */

function Sessao({ fila: inicial, titulo, onSair }: { fila: ItemTreino[]; titulo: string; onSair: () => void }) {
  const [fila, setFila] = useState(inicial);
  const [pos, setPos] = useState(0);
  const [respondeu, setRespondeu] = useState<boolean | null>(null);
  const [placar, setPlacar] = useState({ certas: 0, erradas: 0 });
  // quem errou volta uma vez no fim da sessão (recuperação logo depois do feedback)
  const [repetidas] = useState(() => new Set<string>());

  if (pos >= fila.length) {
    const total = placar.certas + placar.erradas;
    return (
      <>
        <h1>{titulo}</h1>
        <div className="fim-sessao">
          <p className="grande">🎉 Sessão concluída</p>
          <p>{placar.certas} de {total} respostas certas{total ? ` (${Math.round((placar.certas / total) * 100)}%)` : ''}.</p>
          <p className="dica">As que você errou voltam amanhã; as certas, no próximo degrau (1, 3, 7, 14 ou 30 dias).</p>
          <button className="botao primario" onClick={onSair}>Voltar ao treino</button>
        </div>
      </>
    );
  }

  const item = fila[pos];
  const responder = (ok: boolean) => {
    if (respondeu !== null) return; // desafio de código pode verificar várias vezes: vale a primeira
    setRespondeu(ok);
    setPlacar((p) => (ok ? { ...p, certas: p.certas + 1 } : { ...p, erradas: p.erradas + 1 }));
    if (!ok && !repetidas.has(item.id)) {
      repetidas.add(item.id);
      setFila((f) => [...f, item]);
    }
  };
  const proxima = () => {
    setRespondeu(null);
    setPos(pos + 1);
  };

  return (
    <>
      <nav className="migalhas">
        <button className="link" onClick={onSair}>← Sair do treino</button>
      </nav>
      <h1>{titulo}</h1>
      <div className="sessao-topo">
        <span>{pos + 1} de {fila.length}</span>
        <span>✓ {placar.certas} · ✗ {placar.erradas}</span>
      </div>
      <div className="barra"><div className="barra-cheia" style={{ width: `${(pos / fila.length) * 100}%` }} /></div>

      <Origem aula={item.aula} />
      <div key={`${item.id}@${pos}`}>
        {item.tipo === 'quiz' ? (
          <Quiz dados={item.dados} idPadrao={item.id} treino onResponder={responder} />
        ) : (
          <div className="flashcard"><div className="quiz-titulo">🃏 Flashcard</div><CartaoFlashcard id={item.id} dados={item.dados} onResponder={responder} /></div>
        )}
      </div>

      <div className="acoes sessao-acoes">
        {respondeu !== null ? (
          <button className="botao primario" onClick={proxima}>{pos + 1 < fila.length ? 'Próxima →' : 'Ver resultado'}</button>
        ) : (
          <button className="link" onClick={proxima} title="Pula sem registrar resposta">Pular</button>
        )}
      </div>
    </>
  );
}

function Origem({ aula }: { aula?: Aula }) {
  if (!aula) return <p className="origem">Banco geral de questões</p>;
  return (
    <p className="origem">
      Da aula <Link to={linkAula(aula)} target="_blank">{aula.meta.codigo} {aula.meta.titulo}</Link>
    </p>
  );
}
