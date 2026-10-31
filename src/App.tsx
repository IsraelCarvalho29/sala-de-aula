import { Link, Route, Routes } from 'react-router-dom';
import Inicio from './pages/Inicio';
import TrilhaPage from './pages/TrilhaPage';
import AulaPage from './pages/AulaPage';

export default function App() {
  return (
    <div className="app">
      <header className="topo">
        <Link to="/" className="marca">🎓 Sala de Aula</Link>
        <span className="sub">CC · Engenharia de Software · Dev</span>
      </header>
      <main className="conteudo">
        <Routes>
          <Route path="/" element={<Inicio />} />
          <Route path="/trilha/:trilha" element={<TrilhaPage />} />
          <Route path="/aula/:trilha/:aula" element={<AulaPage />} />
          <Route path="*" element={<p>Página não encontrada. <Link to="/">Voltar</Link></p>} />
        </Routes>
      </main>
    </div>
  );
}
