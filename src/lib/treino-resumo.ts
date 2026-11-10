import { useMemo } from 'react';
import { todosOsItens } from './banco';
import { useProgresso } from './progresso';
import { hoje } from './revisao';

/** Quantas perguntas e flashcards estão vencidos hoje (contador do cabeçalho e do início). */
export function useRevisoesHoje() {
  const { revisao } = useProgresso();
  return useMemo(() => {
    const dia = hoje();
    return todosOsItens().filter((i) => revisao[i.id] && revisao[i.id].proxima <= dia).length;
  }, [revisao]);
}
