export default function BarraProgresso({ feitas, total, unidade = 'aulas' }: { feitas: number; total: number; unidade?: string }) {
  const pct = total ? Math.round((feitas / total) * 100) : 0;
  return (
    <div className="barra" title={`${feitas} de ${total} ${unidade}`}>
      <div className="barra-cheia" style={{ width: pct + '%' }} />
      <span>{pct}%</span>
    </div>
  );
}
