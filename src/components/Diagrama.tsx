import { useEffect, useId, useState } from 'react';

/** Diagrama Mermaid, carregado sob demanda para não pesar o app. */
export default function Diagrama({ codigo }: { codigo: string }) {
  const id = 'mmd' + useId().replace(/:/g, '');
  const [svg, setSvg] = useState('');
  const [erro, setErro] = useState('');

  useEffect(() => {
    let ativo = true;
    import('mermaid').then(async ({ default: mermaid }) => {
      mermaid.initialize({ startOnLoad: false, theme: 'dark' });
      try {
        const { svg } = await mermaid.render(id, codigo);
        if (ativo) setSvg(svg);
      } catch (e) {
        if (ativo) setErro((e as Error).message);
      }
    });
    return () => { ativo = false; };
  }, [codigo, id]);

  if (erro) return <div className="erro">Erro no diagrama: {erro}</div>;
  return <div className="diagrama" dangerouslySetInnerHTML={{ __html: svg || 'Carregando diagrama…' }} />;
}
