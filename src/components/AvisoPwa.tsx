import { aplicarAtualizacao, baixarRuntimes, instalarApp, usePwa } from '../lib/pwa';

/** Faixa no topo: sem internet, ou versão nova pronta para atualizar. */
export function AvisoPwa() {
  const pwa = usePwa();
  if (pwa.atualizacao) {
    return (
      <div className="aviso-pwa" role="status">
        <span>Há uma versão nova da Sala de Aula.</span>
        <button className="botao primario" onClick={aplicarAtualizacao}>Atualizar</button>
      </div>
    );
  }
  if (!pwa.online) {
    return (
      <div className="aviso-pwa offline" role="status">
        Sem internet. {pwa.pronto ? 'As aulas continuam funcionando; o progresso é salvo neste aparelho.' : 'Abra o app uma vez com internet para ele funcionar offline.'}
      </div>
    );
  }
  return null;
}

/** Bloco da página inicial: instalar o app e baixar o necessário para estudar offline. */
export function EstudarOffline() {
  const pwa = usePwa();
  if (!pwa.suportado) return null;
  const r = pwa.runtimes;
  const completos = !!r && r.total > 0 && r.feitos === r.total;
  return (
    <details className="ferramentas">
      <summary>Estudar offline {pwa.pronto && <span className="selo-offline">✓ aulas disponíveis offline</span>}</summary>
      <p>
        Depois da primeira visita, as aulas, as perguntas e os visuais abrem mesmo sem internet. Para estudar no
        celular, use <b>Instalar app</b> (ou, no iPhone, <b>Compartilhar → Adicionar à Tela de Início</b>).
      </p>
      <p>
        Os desafios em <b>Python</b> e <b>SQL</b> precisam de um interpretador que só é baixado quando uma aula usa
        (cerca de 13 MB). Baixe agora para resolver desafios offline:
      </p>
      <div className="acoes">
        {pwa.podeInstalar && <button className="botao primario" onClick={instalarApp}>Instalar app</button>}
        <button className="botao" disabled={completos || r?.baixando || !pwa.online} onClick={baixarRuntimes}>
          {completos ? '✓ Python e SQL disponíveis offline' : r?.baixando ? `Baixando… ${r.feitos}/${r.total}` : 'Baixar Python e SQL (~13 MB)'}
        </button>
        {r?.erro && <span className="dica">Não deu para baixar agora ({r.erro}). Tente de novo com internet.</span>}
      </div>
    </details>
  );
}
