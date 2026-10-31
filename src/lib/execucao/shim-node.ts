// O pacote `printf` (usado pelo JSCPP) importa os módulos `stream` e `util` do Node.
// No navegador basta isto: nenhum argumento é um Stream, e inspect só serve para %O.
export class Stream {}
export const inspect = (v: unknown) => JSON.stringify(v);
export default { Stream, inspect };
