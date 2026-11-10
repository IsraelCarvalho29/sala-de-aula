import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { acharAula, acharModulo, idAula, linkAula, NOME_NIVEL } from '../lib/conteudo';
import { marcarConcluida, useProgresso } from '../lib/progresso';
import Markdown from '../components/Markdown';
import { dominioAula, DOMINIO_MINIMO, prerequisitosPendentes } from '../lib/dominio';
import { perguntasDaAula } from '../lib/banco';
import { definirModoLivre } from '../lib/progresso';

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
  const pendentes = prerequisitosPendentes(progresso, { prerequisitos: m.prerequisitos, aula: a });
  const dominio = dominioAula(progresso, a);
  const nPerguntas = perguntasDaAula(id).length;

  return (
    <article>
      <nav className="migalhas">
        <Link to="/">Início</Link> / <Link to={`/trilha/${t.slug}`}>{t.meta.titulo}</Link> / {m.codigo}
      </nav>
      <h1>{m.titulo}</h1>
      <p className="meta">
        {[m.codigo, m.nivel && NOME_NIVEL[m.nivel], m.duracao_min && `${m.duracao_min} min`].filter(Boolean).join(' · ')}
      </p>

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

      {pendentes.length > 0 ? (
        <div className="bloqueio">
          <p className="grande">🔒 Aula bloqueada</p>
          <p>
            Para estudar esta aula com base, primeiro domine os pré-requisitos: acerte pelo menos {DOMINIO_MINIMO}% das
            perguntas do quiz de cada um. Respostas certas no <Link to="/treino">Treino</Link> também contam.
          </p>
          <ul>
            {pendentes.map((p) => (
              <li key={p.codigo}>
                <Link to={linkAula(p.aula)}>{p.codigo} {p.titulo}</Link>
                <div className="barra"><div className="barra-cheia" style={{ width: `${p.dominio}%` }} /><span>{p.dominio}% de {DOMINIO_MINIMO}%</span></div>
              </li>
            ))}
          </ul>
          <button className="link" onClick={() => definirModoLivre(true)}>
            Já sei esse conteúdo: ligar o modo livre (desbloqueia todas as aulas)
          </button>
        </div>
      ) : (
        <>
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

      {nPerguntas > 0 && (
        <div className="dominio-aula">
          <strong>Domínio desta aula: {dominio}%</strong>
          <div className="barra"><div className="barra-cheia" style={{ width: `${dominio}%` }} /></div>
          <small>
            {dominio >= DOMINIO_MINIMO
              ? 'Pré-requisito cumprido: as aulas que dependem desta estão liberadas.'
              : `Acerte ${DOMINIO_MINIMO}% das ${nPerguntas} perguntas para liberar as aulas que dependem desta.`}
          </small>
        </div>
      )}
        </>
      )}

      <div className="rodape-aula">
        {pendentes.length === 0 && (
          <button className={concluida ? 'botao ok' : 'botao primario'} onClick={() => marcarConcluida(id, !concluida)}>
            {concluida ? '✓ Aula concluída' : 'Marcar como concluída'}
          </button>
        )}
        <div className="navegacao">
          {anterior ? <Link to={linkAula(anterior)}>← {anterior.meta.codigo} {anterior.meta.titulo}</Link> : <span />}
          {proxima && <Link to={linkAula(proxima)}>{proxima.meta.codigo} {proxima.meta.titulo} →</Link>}
        </div>
      </div>
    </article>
  );
}
