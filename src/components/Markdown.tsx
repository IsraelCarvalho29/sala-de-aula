import { createContext, lazy, Suspense, useContext, useState } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Quiz from './Quiz';
import Flashcard from './Flashcard';
import Diagrama from './Diagrama';
import { normalizarLinguagem, type Linguagem } from '../lib/execucao/linguagens';

const IdeCodigo = lazy(() => import('./IdeCodigo'));

/**
 * Renderiza uma aula. Blocos de código especiais:
 *   ```quiz      -> pergunta (YAML, formato em docs/curriculo/modelo-de-aula.md)
 *   ```pergunta  -> pergunta aberta com resposta revelável (YAML)
 *   ```mermaid   -> diagrama (fluxograma, sequência, estados...)
 * Blocos de linguagens executáveis (python, javascript, typescript, c, cpp, sql, html)
 * ganham o botão "Experimentar", que abre o exemplo na IDE da aula.
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
  const executavel = normalizarLinguagem(lang);
  if (executavel) return <BlocoExecutavel linguagem={executavel} lang={lang!} codigo={conteudo} />;
  return (
    <pre className="bloco-codigo">
      <span className="lang">{lang}</span>
      <code>{conteudo}</code>
    </pre>
  );
}

function BlocoExecutavel({ linguagem, lang, codigo }: { linguagem: Linguagem; lang: string; codigo: string }) {
  const [aberto, setAberto] = useState(false);
  if (aberto) {
    return (
      <Suspense fallback={<p className="dica">Carregando o editor…</p>}>
        <div className="ide-solta">
          <IdeCodigo linguagem={linguagem} codigoInicial={codigo} />
          <button className="link" onClick={() => setAberto(false)}>Fechar editor</button>
        </div>
      </Suspense>
    );
  }
  return (
    <pre className="bloco-codigo">
      <span className="lang">{lang}</span>
      <button className="experimentar" onClick={() => setAberto(true)} title="Abrir este código no editor e executar">▶ Experimentar</button>
      <code>{codigo}</code>
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
