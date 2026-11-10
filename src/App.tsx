import { Link, Route, Routes } from 'react-router-dom';
import Inicio from './pages/Inicio';
import TrilhaPage from './pages/TrilhaPage';
import AulaPage from './pages/AulaPage';
import TreinoPage from './pages/TreinoPage';
import { useRevisoesHoje } from './lib/treino-resumo';

export default function App() {
  const pendentes = useRevisoesHoje();
  return (
    <div className="app">
      <header className="topo">
        <Link to="/" className="marca">🎓 Sala de Aula</Link>
        <span className="sub">CC · Engenharia de Software · Dev</span>
        <Link to="/treino" className="link-treino" title="Revisão espaçada">
          🧠 Treino{pendentes > 0 && <span className="contador">{pendentes}</span>}
        </Link>
      </header>
      <main className="conteudo">
        <Routes>
          <Route path="/" element={<Inicio />} />
          <Route path="/trilha/:trilha" element={<TrilhaPage />} />
          <Route path="/aula/:trilha/:aula" element={<AulaPage />} />
          <Route path="/treino" element={<TreinoPage />} />
          <Route path="*" element={<p>Página não encontrada. <Link to="/">Voltar</Link></p>} />
        </Routes>
      </main>
    </div>
  );
}
