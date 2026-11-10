import { Link } from 'react-router-dom';
import { aulasDaTrilha, idAula, linkAula, projetos, trilhas } from '../lib/conteudo';
import { exportarProgresso, importarProgresso, useProgresso, zerarProgresso } from '../lib/progresso';
import BarraProgresso from '../components/BarraProgresso';

export default function Inicio() {
  const progresso = useProgresso();
  const acertos = Object.values(progresso.quiz).filter((q) => q.acertou).length;

  return (
    <>
      <section className="hero">
        <h1>Sua sala de aula</h1>
        <p>Escolha uma trilha, estude as aulas e treine com as perguntas. Seu progresso fica salvo neste navegador.</p>
        <p className="resumo">
          {Object.keys(progresso.concluidas).length} aulas concluídas · {acertos} perguntas acertadas
        </p>
      </section>

      <div className="grade">
        {trilhas.map((t) => {
          const aulas = aulasDaTrilha(t);
          const feitas = aulas.filter((a) => progresso.concluidas[idAula(a)]).length;
          return (
            <Link key={t.slug} to={`/trilha/${t.slug}`} className="cartao">
              <h2>{t.meta.titulo}</h2>
              <p>{t.meta.descricao}</p>
              <small>{t.modulos.length} módulos · {aulas.length} com aula pronta</small>
              <BarraProgresso feitas={feitas} total={aulas.length} />
            </Link>
          );
        })}
      </div>

      <section className="projetos">
        <h2>🛠️ Projetos de trilha</h2>
        <p className="desc">Ao terminar uma trilha, junte tudo num projeto de verdade, construído em etapas com desafios na IDE.</p>
        <ol className="lista-modulos">
          {projetos.map(({ trilha: t, modulo: m }) => {
            const feito = m.aula && progresso.concluidas[idAula(m.aula)];
            const conteudo = (
              <>
                <span className="codigo">{feito ? '✓' : m.codigo}</span>
                <span className="titulo-modulo">
                  {m.titulo}
                  <small>fim da trilha {t.meta.titulo}{m.carga ? ` · ${m.carga}` : ''}</small>
                </span>
                {!m.aula && <span className="em-breve">em breve</span>}
              </>
            );
            return (
              <li key={m.codigo} className={['projeto', feito ? 'feita' : m.aula ? '' : 'pendente'].filter(Boolean).join(' ')}>
                {m.aula ? <Link to={linkAula(m.aula)}>{conteudo}</Link> : <div>{conteudo}</div>}
              </li>
            );
          })}
        </ol>
      </section>

      <details className="ferramentas">
        <summary>Backup do progresso</summary>
        <button className="botao" onClick={() => {
          const blob = new Blob([exportarProgresso()], { type: 'application/json' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'progresso-sala-de-aula.json';
          a.click();
        }}>Exportar</button>
        <label className="botao">
          Importar
          <input type="file" accept="application/json" hidden onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) importarProgresso(await f.text());
          }} />
        </label>
        <button className="botao perigo" onClick={() => confirm('Apagar todo o progresso?') && zerarProgresso()}>Zerar</button>
      </details>
    </>
  );
}
