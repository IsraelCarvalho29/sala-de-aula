import { Link, useParams } from 'react-router-dom';
import { aulasDaTrilha, idAula, linkAula, NOME_NIVEL, trilhas } from '../lib/conteudo';
import { useProgresso } from '../lib/progresso';
import BarraProgresso from '../components/BarraProgresso';
import { dominioAula, prerequisitosPendentes } from '../lib/dominio';

export default function TrilhaPage() {
  const { trilha } = useParams();
  const progresso = useProgresso();
  const t = trilhas.find((x) => x.slug === trilha);
  if (!t) return <p>Trilha não encontrada. <Link to="/">Voltar</Link></p>;
  const aulas = aulasDaTrilha(t);

  return (
    <>
      <nav className="migalhas"><Link to="/">Início</Link> / {t.meta.titulo}</nav>
      <h1>{t.meta.titulo}</h1>
      <p className="desc">{t.meta.descricao}</p>
      <BarraProgresso feitas={aulas.filter((a) => progresso.concluidas[idAula(a)]).length} total={aulas.length} />

      <ol className="lista-modulos">
        {t.modulos.map((m) => {
          const feita = m.aula && progresso.concluidas[idAula(m.aula)];
          const pendentes = m.aula ? prerequisitosPendentes(progresso, m) : [];
          const bloqueada = pendentes.length > 0;
          const dominio = m.aula ? dominioAula(progresso, m.aula) : undefined;
          const detalhes = [m.nivel && NOME_NIVEL[m.nivel], m.carga, m.prerequisitos?.length ? `pré-req.: ${m.prerequisitos.join(', ')}` : '']
            .filter(Boolean).join(' · ');
          const conteudo = (
            <>
              <span className="codigo">{bloqueada ? '🔒' : feita ? '✓' : m.codigo}</span>
              <span className="titulo-modulo">
                {m.titulo}
                <small>{detalhes}</small>
                {bloqueada && (
                  <small className="motivo-bloqueio">
                    Libera com 80% no quiz de {pendentes.map((p) => `${p.codigo} (hoje ${p.dominio}%)`).join(', ')}
                  </small>
                )}
              </span>
              {!m.aula && <span className="em-breve">em breve</span>}
              {!bloqueada && dominio !== undefined && dominio > 0 && (
                <span className={dominio >= 80 ? 'dominio ok' : 'dominio'} title="Domínio do quiz da aula">{dominio}%</span>
              )}
            </>
          );
          return (
            <li key={m.codigo} className={feita ? 'feita' : bloqueada ? 'bloqueada' : m.aula ? '' : 'pendente'}>
              {m.aula && !bloqueada ? <Link to={linkAula(m.aula)}>{conteudo}</Link> : <div>{conteudo}</div>}
            </li>
          );
        })}
      </ol>
    </>
  );
}
