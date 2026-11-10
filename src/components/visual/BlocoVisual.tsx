import { useMemo, useRef, useState } from 'react';
import { parse as parseYaml } from 'yaml';
import { gerarVisual, type Config, type Visual } from '../../lib/visual/passos';
import VisualStep from './VisualStep';

/**
 * Bloco ```visual de uma aula (YAML). Exemplo:
 *
 *   tipo: ordenacao          # pilha | fila | lista-ligada | ordenacao | busca-binaria | bfs | dfs
 *   algoritmo: insercao      # só na ordenação: bolha | selecao | insercao | merge | quick
 *   valores: 5, 2, 4, 1, 3
 *
 * O aluno pode trocar os dados no cabeçalho e ver o algoritmo de novo (desligue com editavel: false).
 */
export default function BlocoVisual({ yaml }: { yaml: string }) {
  const original = useMemo<{ cfg?: Config; erro?: string }>(() => {
    try {
      const cfg = parseYaml(yaml);
      if (!cfg || typeof cfg !== 'object') return { erro: 'o bloco precisa ter pelo menos "tipo:"' };
      return { cfg };
    } catch (e) {
      return { erro: (e as Error).message };
    }
  }, [yaml]);
  const [mudancas, setMudancas] = useState<Record<string, string>>({});
  const [rascunho, setRascunho] = useState<Record<string, string>>({});

  const gerado = useMemo<{ visual?: Visual; erro?: string }>(() => {
    if (!original.cfg) return { erro: original.erro };
    try {
      return { visual: gerarVisual({ ...original.cfg, ...mudancas }) };
    } catch (e) {
      return { erro: (e as Error).message };
    }
  }, [original, mudancas]);

  // se os dados do aluno não geram nada válido, mostra o erro e mantém a última versão boa
  const ultimaBoa = useRef<Visual>(undefined);
  if (gerado.visual) ultimaBoa.current = gerado.visual;
  const visual = gerado.visual ?? (Object.keys(mudancas).length ? ultimaBoa.current : undefined);

  if (!visual) return <div className="erro">Erro na visualização: {gerado.erro}</div>;

  const editavel = original.cfg?.editavel !== false;
  const campos = visual.campos;
  const valor = (chave: string) => rascunho[chave] ?? mudancas[chave] ?? campos.find((c) => c.chave === chave)?.valor ?? '';

  const cabecalho = editavel ? (
    <form
      className="vs-form"
      onSubmit={(e) => {
        e.preventDefault();
        setMudancas((m) => ({ ...m, ...Object.fromEntries(campos.map((c) => [c.chave, valor(c.chave)])) }));
        setRascunho({});
      }}
    >
      {campos.map((c) => (
        <label key={c.chave} className={c.valor.length > 12 ? 'vs-campo-largo' : ''}>
          <span>{c.rotulo}</span>
          <input type="text" value={valor(c.chave)} spellCheck={false} autoCapitalize="off" autoComplete="off"
            onChange={(e) => setRascunho((r) => ({ ...r, [c.chave]: e.target.value }))} />
        </label>
      ))}
      <div className="vs-form-botoes">
        <button type="submit" className="vs-primario">Ver de novo</button>
        {(Object.keys(mudancas).length > 0 || Object.keys(rascunho).length > 0) && (
          <button type="button" onClick={() => { setMudancas({}); setRascunho({}); }}>Original</button>
        )}
      </div>
      {gerado.erro && <p className="vs-form-erro" role="alert">{gerado.erro}</p>}
    </form>
  ) : undefined;

  return <VisualStep visual={visual} cabecalho={cabecalho} />;
}
