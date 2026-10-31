import { useState } from 'react';
import { parse } from 'yaml';

/** Pergunta aberta: pense na resposta e depois revele. */
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
