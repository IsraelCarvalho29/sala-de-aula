import { lazy, Suspense, useState } from 'react';
import { parse } from 'yaml';
import { registrarResposta, useProgresso } from '../lib/progresso';
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
interface TesteYaml {
  entrada?: string | number | (string | number)[];
  entradas?: (string | number)[];
  saida?: string | number;
  esperado?: string | number;
  chamada?: string;
  verifica?: string;
  descricao?: string;
  visivel?: boolean;
}

interface DadosQuiz {
  id?: string;
  tipo?: string;
  pergunta: string;
  opcoes?: string[];
  resposta?: number | boolean | string;
  correta?: number; // alias antigo de `resposta`
  explicacao?: string;
  palavras_chave?: string[];
  dica?: string;
  dificuldade?: number;
  // desafio de código
  linguagem?: string;
  codigo_inicial?: string;
  testes?: TesteYaml[];
  usa?: string[];
  indentacao?: boolean;
  preparo?: string;
  solucao?: string;
}

const ROTULO: Record<string, string> = {
  multipla_escolha: 'Múltipla escolha',
  verdadeiro_falso: 'Verdadeiro ou falso',
  resposta_curta: 'Resposta curta',
  prever_saida: 'Prever a saída',
  codigo: 'Desafio de código',
};

export default function Quiz({ yaml, idPadrao }: { yaml: string; idPadrao: string }) {
  let q: DadosQuiz;
  try {
    q = parse(yaml);
  } catch (e) {
    return <div className="erro">Pergunta com YAML inválido: {(e as Error).message}</div>;
  }
  const id = q.id ?? idPadrao;
  const tipo = q.tipo ?? (typeof q.resposta === 'boolean' ? 'verdadeiro_falso' : 'multipla_escolha');
  return (
    <QuizCartao q={q} id={id} tipo={tipo}>
      {tipo === 'multipla_escolha' || tipo === 'verdadeiro_falso' ? (
        <Fechada q={q} id={id} tipo={tipo} />
      ) : tipo === 'codigo' && q.testes?.length ? (
        <DesafioCodigo q={q} id={id} />
      ) : (
        <Aberta q={q} id={id} />
      )}
    </QuizCartao>
  );
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

function Fechada({ q, id, tipo }: { q: DadosQuiz; id: string; tipo: string }) {
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
              registrarResposta(id, i === certa);
            }}>
              {tipo !== 'verdadeiro_falso' && <strong>{String.fromCharCode(65 + i)}.</strong>} {op}
            </button>
          );
        })}
      </div>
      {respondeu && (
        <Feedback ok={escolha === certa} explicacao={q.explicacao} onRefazer={() => setEscolha(null)} />
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

function DesafioCodigo({ q, id }: { q: DadosQuiz; id: string }) {
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
          onVerificado={(ok) => { setResultado(ok); registrarResposta(id, ok); }} />
      </Suspense>
      {resultado && q.explicacao && (
        <div className="feedback ok"><MarkdownSimples texto={q.explicacao} /></div>
      )}
    </>
  );
}

function Aberta({ q, id }: { q: DadosQuiz; id: string }) {
  const [texto, setTexto] = useState('');
  const [revelado, setRevelado] = useState(false);
  const [avaliou, setAvaliou] = useState<boolean | null>(null);
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
            <div className="acoes">
              <span>Como foi?</span>
              <button className="botao ok" onClick={() => { setAvaliou(true); registrarResposta(id, true); }}>Acertei</button>
              <button className="botao perigo" onClick={() => { setAvaliou(false); registrarResposta(id, false); }}>Errei</button>
            </div>
          ) : (
            <Feedback ok={avaliou} explicacao={q.explicacao}
              onRefazer={() => { setRevelado(false); setAvaliou(null); setTexto(''); }} />
          )}
        </>
      )}
    </>
  );
}

function Feedback({ ok, explicacao, onRefazer }: { ok: boolean; explicacao?: string; onRefazer: () => void }) {
  return (
    <div className={ok ? 'feedback ok' : 'feedback nok'}>
      <strong>{ok ? 'Correto!' : 'Não foi dessa vez.'}</strong>
      {explicacao && <MarkdownSimples texto={explicacao} />}
      <button className="link" onClick={onRefazer}>Tentar de novo</button>
    </div>
  );
}
