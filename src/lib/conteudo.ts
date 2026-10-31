import { parse as parseYaml } from 'yaml';

/**
 * Carrega todo o conteúdo de content/trilhas em tempo de build.
 *
 *   content/trilhas/<NN-trilha>/_trilha.md   metadados da trilha + lista de módulos planejados
 *   content/trilhas/<NN-trilha>/<COD>-*.md   uma aula (um módulo do currículo), ex.: ED-01-big-o.md
 *
 * Um módulo listado em _trilha.md sem arquivo de aula aparece como "em breve".
 */
const arquivos = import.meta.glob('../../content/trilhas/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

export type Nivel = 'basico' | 'intermediario' | 'avancado';

export interface ModuloPlanejado {
  codigo: string;
  titulo: string;
  nivel?: Nivel;
  prerequisitos?: string[];
  carga?: string;
}

export interface MetaTrilha {
  titulo: string;
  descricao?: string;
  ordem?: number;
  modulos?: ModuloPlanejado[];
}

/** Front matter de uma aula (ver docs/curriculo/modelo-de-aula.md). */
export interface MetaAula {
  codigo?: string;
  titulo: string;
  nivel?: Nivel;
  prerequisitos?: string[];
  duracao_min?: number;
  objetivos?: string[];
  tags?: string[];
  /** cursos externos para aprofundar (ver docs/curriculo/ossu-mapeamento.md) */
  aprofundar?: { nome: string; url: string; trecho?: string }[];
}

export interface Aula {
  slug: string;
  trilha: string;
  meta: MetaAula;
  corpo: string;
}

export interface Modulo extends ModuloPlanejado {
  aula?: Aula;
}

export interface Trilha {
  slug: string;
  meta: MetaTrilha;
  modulos: Modulo[];
}

export const NOME_NIVEL: Record<Nivel, string> = {
  basico: '🟢 básico',
  intermediario: '🟡 intermediário',
  avancado: '🔴 avançado',
};

function separarFrontMatter<T>(texto: string): { meta: T; corpo: string } {
  const m = texto.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { meta: {} as T, corpo: texto };
  // o título já aparece no cabeçalho da página, então removemos um "# Título" inicial
  return { meta: parseYaml(m[1]) as T, corpo: m[2].replace(/^\s*# .*\n/, '') };
}

function montar(): Trilha[] {
  const trilhas = new Map<string, Trilha>();
  const aulas: Aula[] = [];

  for (const [caminho, texto] of Object.entries(arquivos)) {
    const [trilha, arquivo] = caminho.split('content/trilhas/')[1].split('/');
    if (!arquivo) continue;
    if (arquivo === '_trilha.md') {
      const { meta } = separarFrontMatter<MetaTrilha>(texto);
      trilhas.set(trilha, { slug: trilha, meta, modulos: [] });
    } else {
      const { meta, corpo } = separarFrontMatter<MetaAula>(texto);
      const slug = arquivo.replace(/\.md$/, '');
      aulas.push({ slug, trilha, meta: { ...meta, titulo: meta.titulo ?? slug }, corpo });
    }
  }

  for (const t of trilhas.values()) {
    t.modulos = (t.meta.modulos ?? []).map((m) => ({ ...m }));
  }
  for (const a of aulas.sort((x, y) => x.slug.localeCompare(y.slug))) {
    let t = trilhas.get(a.trilha);
    if (!t) trilhas.set(a.trilha, (t = { slug: a.trilha, meta: { titulo: a.trilha }, modulos: [] }));
    const planejado = a.meta.codigo && t.modulos.find((m) => m.codigo === a.meta.codigo);
    if (planejado) planejado.aula = a;
    else t.modulos.push({ codigo: a.meta.codigo ?? a.slug, titulo: a.meta.titulo, nivel: a.meta.nivel, aula: a });
  }

  return [...trilhas.values()].sort(
    (a, b) => (a.meta.ordem ?? 999) - (b.meta.ordem ?? 999) || a.slug.localeCompare(b.slug),
  );
}

export const trilhas = montar();

/** Chave estável do progresso: o código do módulo (ex.: ED-01). */
export const idAula = (a: Aula) => a.meta.codigo ?? `${a.trilha}/${a.slug}`;
export const linkAula = (a: Aula) => `/aula/${a.trilha}/${a.slug}`;

export const aulasDaTrilha = (t: Trilha) => t.modulos.flatMap((m) => (m.aula ? [m.aula] : []));

export function acharAula(trilha: string, slug: string) {
  const t = trilhas.find((x) => x.slug === trilha);
  if (!t) return undefined;
  const todas = aulasDaTrilha(t);
  const i = todas.findIndex((a) => a.slug === slug);
  if (i < 0) return undefined;
  return { trilha: t, aula: todas[i], anterior: todas[i - 1], proxima: todas[i + 1] };
}

/** Procura um módulo pelo código em qualquer trilha (para links de pré-requisitos). */
export function acharModulo(codigo: string) {
  for (const t of trilhas) {
    const m = t.modulos.find((x) => x.codigo === codigo);
    if (m) return { trilha: t, modulo: m };
  }
  return undefined;
}
