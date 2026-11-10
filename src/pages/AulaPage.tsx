import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { acharAula, acharModulo, contarPerguntas, idAula, linkAula, NOME_NIVEL } from '../lib/conteudo';
import { marcarConcluida, useProgresso } from '../lib/progresso';
import Markdown from '../components/Markdown';
import BarraProgresso from '../components/BarraProgresso';

export default function AulaPage() {
  const { trilha = '', aula = '' } = useParams();
  const progresso = useProgresso();
  const achada = acharAula(trilha, aula);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [trilha, aula]);
  if (!achada) return <p>Aula não encontrada. <Link to="/">Voltar</Link></p>;

  const { trilha: t, aula: a, anterior, proxima } = achada;
  const id = idAula(a);
  const concluida = !!progresso.concluidas[id];
  const m = a.meta;
  const projeto = m.tipo === 'projeto';
  // nos projetos, cada pergunta é uma etapa: conta as que já foram acertadas (ids começam com o código)
  const etapas = projeto ? contarPerguntas(a) : 0;
  const etapasFeitas = projeto
    ? Object.entries(progresso.quiz).filter(([k, v]) => v.acertou && k.startsWith(`${id}-`)).length
    : 0;

  return (
    <article>
      <nav className="migalhas">
        <Link to="/">Início</Link> / <Link to={`/trilha/${t.slug}`}>{t.meta.titulo}</Link> / {m.codigo}
      </nav>
      <h1>{m.titulo}</h1>
      <p className="meta">
        {[m.codigo, projeto ? '🛠️ projeto guiado' : m.nivel && NOME_NIVEL[m.nivel], m.duracao_min && `${m.duracao_min} min`].filter(Boolean).join(' · ')}
      </p>
      {projeto && etapas > 0 && (
        <div className="progresso-projeto">
          <small>{Math.min(etapasFeitas, etapas)} de {etapas} etapas resolvidas</small>
          <BarraProgresso feitas={Math.min(etapasFeitas, etapas)} total={etapas} unidade="etapas" />
        </div>
      )}

      {!!m.prerequisitos?.length && (
        <p className="prereq">
          Antes desta aula:{' '}
          {m.prerequisitos.map((c, i) => {
            const pre = acharModulo(c);
            const ok = pre?.modulo.aula && progresso.concluidas[idAula(pre.modulo.aula)];
            return (
              <span key={c}>
                {i > 0 && ', '}
                {pre?.modulo.aula ? <Link to={linkAula(pre.modulo.aula)}>{c}</Link> : <span title={pre?.modulo.titulo}>{c}</span>}
                {ok && ' ✓'}
              </span>
            );
          })}
        </p>
      )}

      {!!m.objetivos?.length && (
        <div className="objetivos">
          <strong>Ao final você vai conseguir:</strong>
          <ul>{m.objetivos.map((o) => <li key={o}>{o}</li>)}</ul>
        </div>
      )}

      <Markdown texto={a.corpo} idAula={id} />

      {!!m.aprofundar?.length && (
        <div className="aprofundar">
          <strong>📚 Para aprofundar</strong>
          <ul>
            {m.aprofundar.map((c) => (
              <li key={c.url}>
                <a href={c.url} target="_blank" rel="noreferrer">{c.nome}</a>
                {c.trecho && <small> · {c.trecho}</small>}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rodape-aula">
        <button className={concluida ? 'botao ok' : 'botao primario'} onClick={() => marcarConcluida(id, !concluida)}>
          {concluida ? (projeto ? '✓ Projeto concluído' : '✓ Aula concluída') : 'Marcar como concluída'}
        </button>
        <div className="navegacao">
          {anterior ? <Link to={linkAula(anterior)}>← {anterior.meta.codigo} {anterior.meta.titulo}</Link> : <span />}
          {proxima && <Link to={linkAula(proxima)}>{proxima.meta.codigo} {proxima.meta.titulo} →</Link>}
        </div>
      </div>
    </article>
  );
}
