import { Link, useParams } from 'react-router-dom';
import { aulasDaTrilha, idAula, linkAula, NOME_NIVEL, trilhas } from '../lib/conteudo';
import { useProgresso } from '../lib/progresso';
import BarraProgresso from '../components/BarraProgresso';

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
          const detalhes = [m.nivel && NOME_NIVEL[m.nivel], m.carga, m.prerequisitos?.length ? `pré-req.: ${m.prerequisitos.join(', ')}` : '']
            .filter(Boolean).join(' · ');
          const conteudo = (
            <>
              <span className="codigo">{feita ? '✓' : m.codigo}</span>
              <span className="titulo-modulo">
                {m.titulo}
                <small>{detalhes}</small>
              </span>
              {!m.aula && <span className="em-breve">em breve</span>}
            </>
          );
          return (
            <li key={m.codigo} className={feita ? 'feita' : m.aula ? '' : 'pendente'}>
              {m.aula ? <Link to={linkAula(m.aula)}>{conteudo}</Link> : <div>{conteudo}</div>}
            </li>
          );
        })}
      </ol>
    </>
  );
}
