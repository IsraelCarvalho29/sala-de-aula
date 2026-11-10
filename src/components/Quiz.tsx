import { lazy, Suspense, useState } from 'react';
import { parse } from 'yaml';
import { registrarResposta, useProgresso } from '../lib/progresso';
import { quandoVolta, type Autoavaliacao } from '../lib/revisao';
import type { DadosQuiz, TesteYaml } from '../lib/banco';
import { MarkdownSimples } from './Markdown';
import { normalizarLinguagem } from '../lib/execucao/linguagens';
import type { Desafio, Teste } from './IdeCodigo';

// o editor e os executores só são baixados quando a aula tem desafio de código
const IdeCodigo = lazy(() => import('./IdeCodigo'));

/**
 * Pergunta embutida na aula. Formato (docs/curriculo/modelo-de-aula.md):
 *   id, tipo, pergunta, opcoes, resposta, explicacao, dificuldade, palavras_chave, dica
 * Tipos: multipla_escolha | verdadeiro_falso | resposta_curta | prever_saida | codigo
 * Os tipos abertos usam autoavaliação: o aluno escreve, vê a resposta modelo e diz se acertou.
 * `codigo` com `testes` abre a IDE e é corrigido automaticamente (ver docs/avaliacao/especificacao-quiz.md).
 */
const ROTULO: Record<string, string> = {
  multipla_escolha: 'Múltipla escolha',
  verdadeiro_falso: 'Verdadeiro ou falso',
  resposta_curta: 'Resposta curta',
  prever_saida: 'Prever a saída',
  codigo: 'Desafio de código',
};

/** Chamado depois de cada resposta (usado pelo modo de treino para liberar o "Próxima"). */
type AoResponder = (acertou: boolean) => void;

interface Props {
  /** bloco YAML da aula, ou `dados` já prontos (treino) */
  yaml?: string;
  dados?: DadosQuiz;
  idPadrao: string;
  /** no treino: sem "Tentar de novo", e avisa quando respondeu */
  treino?: boolean;
  onResponder?: AoResponder;
}

export default function Quiz({ yaml, dados, idPadrao, treino, onResponder }: Props) {
  let q: DadosQuiz;
  try {
    q = dados ?? parse(yaml ?? '');
  } catch (e) {
    return <div className="erro">Pergunta com YAML inválido: {(e as Error).message}</div>;
  }
  const id = q.id ?? idPadrao;
  const tipo = q.tipo ?? (typeof q.resposta === 'boolean' ? 'verdadeiro_falso' : 'multipla_escolha');
  const responder = (resultado: boolean | Autoavaliacao) => {
    registrarResposta(id, resultado);
    onResponder?.(resultado !== false && resultado !== 'errei');
  };
  const props = { q, id, tipo, treino, responder };
  return (
    <QuizCartao q={q} id={id} tipo={tipo}>
      {tipo === 'multipla_escolha' || tipo === 'verdadeiro_falso' ? (
        <Fechada {...props} />
      ) : tipo === 'codigo' && q.testes?.length ? (
        <DesafioCodigo {...props} />
      ) : (
        <Aberta {...props} />
      )}
    </QuizCartao>
  );
}

interface PropsTipo {
  q: DadosQuiz;
  id: string;
  tipo: string;
  treino?: boolean;
  responder: (resultado: boolean | Autoavaliacao) => void;
}

function QuizCartao({ q, id, tipo, children }: { q: DadosQuiz; id: string; tipo: string; children: React.ReactNode }) {
  const progresso = useProgresso().quiz[id];
  return (
    <div className="quiz">
      <div className="quiz-titulo">
        ❓ {ROTULO[tipo] ?? tipo}
        {q.dificuldade && <span className="dificuldade">{'●'.repeat(q.dificuldade)}</span>}
        {progresso?.acertou && <span className="selo">✓ já acertou</span>}
      </div>
      <div className="quiz-pergunta"><MarkdownSimples texto={q.pergunta} /></div>
      {children}
    </div>
  );
}

function Fechada({ q, id, tipo, treino, responder }: PropsTipo) {
  const [escolha, setEscolha] = useState<number | null>(null);
  const opcoes = tipo === 'verdadeiro_falso' ? ['Verdadeiro', 'Falso'] : q.opcoes ?? [];
  const certa = tipo === 'verdadeiro_falso' ? (q.resposta ? 0 : 1) : Number(q.resposta ?? q.correta);
  const respondeu = escolha !== null;

  return (
    <>
      <div className={tipo === 'verdadeiro_falso' ? 'opcoes vf' : 'opcoes'}>
        {opcoes.map((op, i) => {
          let cls = 'opcao';
          if (respondeu && i === certa) cls += ' certa';
          else if (respondeu && i === escolha) cls += ' errada';
          return (
            <button key={i} className={cls} disabled={respondeu} onClick={() => {
              setEscolha(i);
              responder(i === certa);
            }}>
              {tipo !== 'verdadeiro_falso' && <strong>{String.fromCharCode(65 + i)}.</strong>} {op}
            </button>
          );
        })}
      </div>
      {respondeu && (
        <Feedback id={id} ok={escolha === certa} explicacao={q.explicacao} onRefazer={treino ? undefined : () => setEscolha(null)} />
      )}
    </>
  );
}

function converterTeste(t: TesteYaml): Teste {
  const bruto = t.entradas ?? t.entrada ?? [];
  const entradas = Array.isArray(bruto) ? bruto.map(String) : String(bruto).split('\n');
  return {
    entradas,
    esperado: String(t.esperado ?? t.saida ?? ''),
    chamada: t.chamada,
    verifica: t.verifica,
    descricao: t.descricao,
    visivel: t.visivel !== false,
  };
}

function DesafioCodigo({ q, id, responder }: PropsTipo) {
  const [verDica, setVerDica] = useState(false);
  const [resultado, setResultado] = useState<boolean | null>(null);
  const linguagem = normalizarLinguagem(q.linguagem) ?? 'python';
  const desafio: Desafio = {
    testes: (q.testes ?? []).map(converterTeste),
    usa: q.usa,
    indentacao: q.indentacao,
    solucao: q.solucao ?? (typeof q.resposta === 'string' ? q.resposta : undefined),
  };
  return (
    <>
      {q.dica && (verDica ? <p className="dica">💡 {q.dica}</p> : <button className="link" onClick={() => setVerDica(true)}>Mostrar dica</button>)}
      <Suspense fallback={<p className="dica">Carregando o editor…</p>}>
        <IdeCodigo linguagem={linguagem} codigoInicial={q.codigo_inicial ?? ''} chaveRascunho={id} preparo={q.preparo}
          desafio={desafio}
          onVerificado={(ok) => { setResultado(ok); responder(ok); }} />
      </Suspense>
      {resultado && q.explicacao && (
        <div className="feedback ok"><MarkdownSimples texto={q.explicacao} /></div>
      )}
    </>
  );
}

function Aberta({ q, id, treino, responder }: PropsTipo) {
  const [texto, setTexto] = useState('');
  const [revelado, setRevelado] = useState(false);
  const [avaliou, setAvaliou] = useState<Autoavaliacao | null>(null);
  const [verDica, setVerDica] = useState(false);
  const termosUsados = (q.palavras_chave ?? []).filter((p) => texto.toLowerCase().includes(p.toLowerCase()));

  return (
    <>
      <textarea className="resposta-aluno" rows={q.tipo === 'codigo' ? 8 : 3} value={texto}
        placeholder="Escreva sua resposta antes de ver a correção…" onChange={(e) => setTexto(e.target.value)} />
      {!revelado ? (
        <div className="acoes">
          <button className="botao primario" onClick={() => setRevelado(true)}>Ver resposta</button>
          {q.dica && !verDica && <button className="link" onClick={() => setVerDica(true)}>Mostrar dica</button>}
          {verDica && <p className="dica">💡 {q.dica}</p>}
        </div>
      ) : (
        <>
          <div className="resposta">
            <strong>Resposta modelo:</strong>
            <MarkdownSimples texto={String(q.resposta ?? '')} />
            {!!q.palavras_chave?.length && (
              <p className="palavras">
                Termos esperados:{' '}
                {q.palavras_chave.map((p) => (
                  <span key={p} className={termosUsados.includes(p) ? 'termo usado' : 'termo'}>{p}</span>
                ))}
              </p>
            )}
          </div>
          {avaliou === null ? (
            <Autoavaliar onAvaliar={(a) => { setAvaliou(a); responder(a); }} />
          ) : (
            <Feedback id={id} ok={avaliou !== 'errei'} explicacao={q.explicacao}
              onRefazer={treino ? undefined : () => { setRevelado(false); setAvaliou(null); setTexto(''); }} />
          )}
        </>
      )}
    </>
  );
}

const AUTOAVALIACAO: { valor: Autoavaliacao; rotulo: string; dica: string; classe: string }[] = [
  { valor: 'errei', rotulo: 'Errei', dica: 'Volta amanhã', classe: 'botao perigo' },
  { valor: 'dificil', rotulo: 'Difícil', dica: 'Acertei com esforço: repete o intervalo atual', classe: 'botao' },
  { valor: 'bom', rotulo: 'Bom', dica: 'Acertei: sobe um degrau (1, 3, 7, 14, 30 dias)', classe: 'botao ok' },
  { valor: 'facil', rotulo: 'Fácil', dica: 'Acertei sem pensar: sobe dois degraus', classe: 'botao ok' },
];

/** Botões de autoavaliação (perguntas abertas e flashcards). */
export function Autoavaliar({ onAvaliar }: { onAvaliar: (a: Autoavaliacao) => void }) {
  return (
    <div className="acoes">
      <span>Como foi?</span>
      {AUTOAVALIACAO.map((a) => (
        <button key={a.valor} className={a.classe} title={a.dica} onClick={() => onAvaliar(a.valor)}>{a.rotulo}</button>
      ))}
    </div>
  );
}

/** "Volta em 3 dias": quando esta pergunta aparece de novo no treino. */
export function ProximaRevisao({ id }: { id: string }) {
  const r = useProgresso().revisao[id];
  if (!r) return null;
  return <p className="proxima-revisao">📅 Revisão: {quandoVolta(r)}</p>;
}

function Feedback({ id, ok, explicacao, onRefazer }: { id: string; ok: boolean; explicacao?: string; onRefazer?: () => void }) {
  return (
    <div className={ok ? 'feedback ok' : 'feedback nok'}>
      <strong>{ok ? 'Correto!' : 'Não foi dessa vez.'}</strong>
      {explicacao && <MarkdownSimples texto={explicacao} />}
      <ProximaRevisao id={id} />
      {onRefazer && <button className="link" onClick={onRefazer}>Tentar de novo</button>}
    </div>
  );
}
