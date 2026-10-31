// JSCPP não publica tipos; usamos só o launcher (o index.js importa módulos do Node).
declare module 'JSCPP/lib/launcher' {
  const launcher: { default: { run(codigo: string, entrada: string, config: object): number } };
  export = launcher;
}
