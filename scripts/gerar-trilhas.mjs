// Gera content/trilhas/<trilha>/_trilha.md a partir de docs/curriculo/curriculo.md.
// Uso: node scripts/gerar-trilhas.mjs   (não sobrescreve _trilha.md existentes sem --forcar)
import fs from 'node:fs';
import path from 'node:path';

const raiz = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const md = fs.readFileSync(path.join(raiz, 'docs/curriculo/curriculo.md'), 'utf8');
const forcar = process.argv.includes('--forcar');
const nivel = { '🟢': 'basico', '🟡': 'intermediario', '🔴': 'avancado' };
const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const q = (s) => JSON.stringify(s);

// Projetos de trilha: | PJ-01 | Trilha 0 | Título | pré-requisitos | carga | inspiração |
// entram como o último módulo da trilha indicada (em "Trilhas 2-3", a 3), com tipo: projeto.
const projetos = [...md.matchAll(/^\| (PJ-\d+) \| Trilhas? (?:\d+-)?(\d+) \| (.+?) \| (.+?) \| (.+?) \| .+? \|$/gm)].map((m) => ({
  codigo: m[1], trilha: m[2], titulo: m[3],
  prerequisitos: m[4] === '—' ? [] : m[4].split(/,\s*/), carga: m[5],
}));

for (const bloco of md.split(/^## Trilha /m).slice(1)) {
  const [, num, nome] = bloco.match(/^(\d+): (.+)$/m);
  const modulos = [...bloco.matchAll(/^\| ([A-Z]{2}-\d+) \| (.+?) \| (\S+) \| (.+?) \| (.+?) \|$/gm)].map((m) => ({
    codigo: m[1], titulo: m[2], nivel: nivel[m[3]] ?? m[3],
    prerequisitos: m[4] === '—' ? [] : m[4].split(/,\s*/), carga: m[5],
  }));
  const objetivos = bloco.match(/^\*\*Objetivos[^*]*\*\*:?\s*(.+)$/m)?.[1] ?? '';
  const descricao = objetivos.charAt(0).toUpperCase() + objetivos.slice(1);
  const pasta = path.join(raiz, 'content/trilhas', `${num.padStart(2, '0')}-${slug(nome)}`);
  const arq = path.join(pasta, '_trilha.md');
  if (fs.existsSync(arq) && !forcar) continue;
  fs.mkdirSync(pasta, { recursive: true });
  const linhas = modulos.map((m) =>
    `  - { codigo: ${m.codigo}, titulo: ${q(m.titulo)}, nivel: ${m.nivel}, prerequisitos: [${m.prerequisitos.join(', ')}], carga: ${q(m.carga)} }`);
  for (const p of projetos.filter((x) => x.trilha === num)) {
    linhas.push(`  - { codigo: ${p.codigo}, titulo: ${q(p.titulo)}, tipo: projeto, prerequisitos: [${p.prerequisitos.join(', ')}], carga: ${q(p.carga)} }`);
  }
  fs.writeFileSync(arq, `---\ntitulo: ${q(nome)}\nordem: ${num}\ndescricao: ${q(descricao)}\nmodulos:\n${linhas.join('\n')}\n---\n`);
  console.log('criado', path.relative(raiz, arq), `(${modulos.length} módulos)`);
}
