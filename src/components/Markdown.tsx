import { createContext, useContext } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Quiz from './Quiz';
import Flashcard from './Flashcard';
import Diagrama from './Diagrama';

/**
 * Renderiza uma aula. Blocos de código especiais:
 *   ```quiz      -> pergunta (YAML, formato em docs/curriculo/modelo-de-aula.md)
 *   ```pergunta  -> pergunta aberta com resposta revelável (YAML)
 *   ```mermaid   -> diagrama (fluxograma, sequência, estados...)
 */
const AulaAtual = createContext('');

function Codigo({ className, children }: { className?: string; children?: React.ReactNode }) {
  const idAula = useContext(AulaAtual);
  const conteudo = String(children).replace(/\n$/, '');
  const lang = /language-([\w-]+)/.exec(className ?? '')?.[1];
  if (lang?.startsWith('quiz-')) return <Quiz yaml={conteudo} idPadrao={`${idAula}#${lang.slice(5)}`} />;
  if (lang === 'pergunta') return <Flashcard yaml={conteudo} />;
  if (lang === 'mermaid') return <Diagrama codigo={conteudo} />;
  if (!className) return <code>{children}</code>;
  return (
    <pre className="bloco-codigo">
      <span className="lang">{lang}</span>
      <code>{conteudo}</code>
    </pre>
  );
}

// Definido fora do componente: se fosse recriado a cada render, o React
// remontaria os quizzes e perderia a resposta escolhida.
const componentes: Components = {
  pre: ({ children }) => <>{children}</>,
  code: Codigo,
};

/**
 * Prepara o texto antes do Markdown:
 * - numera os blocos ```quiz (para salvar o resultado de cada um);
 * - troca a cerca deles por ```` (4 crases), porque o enunciado pode conter
 *   blocos de código com ``` dentro, que fechariam o bloco cedo demais.
 */
function prepararQuizzes(texto: string) {
  const linhas = texto.split('\n');
  let n = 0;
  let dentro = false;
  for (let i = 0; i < linhas.length; i++) {
    if (!dentro && /^```quiz\s*$/.test(linhas[i])) {
      linhas[i] = '````quiz-' + n++;
      dentro = true;
    } else if (dentro && /^```\s*$/.test(linhas[i])) {
      linhas[i] = '````';
      dentro = false;
    }
  }
  return linhas.join('\n');
}

export default function Markdown({ texto, idAula }: { texto: string; idAula: string }) {
  return (
    <AulaAtual.Provider value={idAula}>
      <div className="markdown">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={componentes}>
          {prepararQuizzes(texto)}
        </ReactMarkdown>
      </div>
    </AulaAtual.Provider>
  );
}

/** Markdown simples (sem quizzes), usado dentro dos enunciados das perguntas. */
export function MarkdownSimples({ texto }: { texto: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={componentes}>
      {texto}
    </ReactMarkdown>
  );
}
