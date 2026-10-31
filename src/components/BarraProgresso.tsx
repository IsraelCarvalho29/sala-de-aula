export default function BarraProgresso({ feitas, total }: { feitas: number; total: number }) {
  const pct = total ? Math.round((feitas / total) * 100) : 0;
  return (
    <div className="barra" title={`${feitas} de ${total} aulas`}>
      <div className="barra-cheia" style={{ width: pct + '%' }} />
      <span>{pct}%</span>
    </div>
  );
}
