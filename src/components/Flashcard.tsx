import { useState } from 'react';
import { parse } from 'yaml';
import { registrarFlashcard, useProgresso } from '../lib/progresso';
import { dominada, type Autoavaliacao } from '../lib/revisao';
import { idFlashcard, type DadosFlashcard } from '../lib/banco';
import { MarkdownSimples } from './Markdown';
import { Autoavaliar, ProximaRevisao } from './Quiz';

/** Bloco ```pergunta: pergunta aberta com resposta revelável (não entra na revisão). */
export default function Flashcard({ yaml }: { yaml: string }) {
  const [aberto, setAberto] = useState(false);
  const q = parse(yaml) as { pergunta: string; resposta: string };
  return (
    <div className="flashcard">
      <div className="quiz-titulo">🧠 Pense antes de revelar</div>
      <p className="quiz-pergunta">{q.pergunta}</p>
      {aberto ? (
        <div className="resposta">{q.resposta}</div>
      ) : (
        <button className="botao" onClick={() => setAberto(true)}>Mostrar resposta</button>
      )}
    </div>
  );
}

/**
 * Um flashcard: frente, virar, verso e autoavaliação (Errei / Difícil / Bom / Fácil),
 * que agenda a próxima revisão. Usado no baralho da aula e no modo de treino.
 */
export function CartaoFlashcard({ id, dados, onResponder }: { id: string; dados: DadosFlashcard; onResponder?: (acertou: boolean) => void }) {
  const [virado, setVirado] = useState(false);
  const [avaliou, setAvaliou] = useState<Autoavaliacao | null>(null);
  return (
    <div className={virado ? 'cartao-flash virado' : 'cartao-flash'}>
      <div className="cartao-frente"><MarkdownSimples texto={dados.frente} /></div>
      {!virado ? (
        <button className="botao primario" onClick={() => setVirado(true)}>Virar o cartão</button>
      ) : (
        <>
          <div className="cartao-verso"><MarkdownSimples texto={dados.verso} /></div>
          {avaliou === null ? (
            <Autoavaliar onAvaliar={(a) => {
              setAvaliou(a);
              registrarFlashcard(id, a);
              onResponder?.(a !== 'errei');
            }} />
          ) : (
            <ProximaRevisao id={id} />
          )}
        </>
      )}
    </div>
  );
}

/**
 * Bloco ```flashcards da aula: uma lista YAML de cartões { id?, frente, verso }.
 * `inicio` é quantos cartões vieram antes nesta aula (para o id padrão `ED-02#f3`).
 */
export function BaralhoFlashcards({ yaml, idAula, inicio }: { yaml: string; idAula: string; inicio: number }) {
  const revisao = useProgresso().revisao;
  const [atual, setAtual] = useState(0);
  let cartoes: DadosFlashcard[];
  try {
    cartoes = parse(yaml);
    if (!Array.isArray(cartoes)) throw new Error('o bloco deve ser uma lista de cartões');
  } catch (e) {
    return <div className="erro">Flashcards com YAML inválido: {(e as Error).message}</div>;
  }
  if (!cartoes.length) return null;
  const ids = cartoes.map((c, i) => c.id ?? idFlashcard(idAula, inicio + i));
  const vistos = ids.filter((id) => revisao[id]).length;
  const dominados = ids.filter((id) => dominada(revisao[id])).length;
  const i = Math.min(atual, cartoes.length - 1);

  return (
    <div className="flashcard baralho">
      <div className="quiz-titulo">
        🃏 Flashcards · {i + 1} de {cartoes.length}
        <span className="selo">{vistos} revisados{dominados ? ` · ${dominados} dominados` : ''}</span>
      </div>
      <CartaoFlashcard key={ids[i]} id={ids[i]} dados={cartoes[i]} />
      <div className="acoes baralho-nav">
        <button className="botao" disabled={i === 0} onClick={() => setAtual(i - 1)}>← Anterior</button>
        <button className="botao" disabled={i === cartoes.length - 1} onClick={() => setAtual(i + 1)}>Próximo →</button>
      </div>
      <p className="dica">Os cartões avaliados entram na revisão espaçada do <a href="#/treino">Treino</a>.</p>
    </div>
  );
}
