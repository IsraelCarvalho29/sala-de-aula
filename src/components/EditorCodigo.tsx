import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { indentLess, indentMore, indentWithTab } from '@codemirror/commands';
import { HighlightStyle, indentUnit, syntaxHighlighting } from '@codemirror/language';
import { python } from '@codemirror/lang-python';
import { javascript } from '@codemirror/lang-javascript';
import { cpp } from '@codemirror/lang-cpp';
import { sql, SQLite } from '@codemirror/lang-sql';
import { html } from '@codemirror/lang-html';
import type { Extension } from '@codemirror/state';
import { linter, lintGutter, setDiagnostics, type Diagnostic } from '@codemirror/lint';
import { tags as t } from '@lezer/highlight';
import { analisar, LINGUAGENS, runtimePronto, type Linguagem } from '../lib/execucao';

/**
 * Editor de código no estilo IDE (CodeMirror 6): números de linha, destaque de
 * sintaxe da linguagem, indentação automática (4 espaços em Python e C, 2 em JS/TS;
 * em Python também depois de ':'),
 * Tab/Shift+Tab para indentar, fechamento automático de parênteses e aspas,
 * e marcação de erros na linha (sintaxe e indentação) enquanto você digita.
 */

export interface MarcaErro {
  linha: number;
  mensagem: string;
  severidade?: 'error' | 'warning';
}

export interface EditorCodigoRef {
  irParaLinha(linha: number): void;
  marcar(erros: MarcaErro[]): void;
  definir(codigo: string): void;
}

const destaque = HighlightStyle.define([
  { tag: [t.keyword, t.controlKeyword, t.definitionKeyword, t.operatorKeyword], color: 'var(--cod-palavra)', fontWeight: '600' },
  { tag: [t.string, t.special(t.string)], color: 'var(--cod-texto)' },
  { tag: [t.number, t.bool, t.null], color: 'var(--cod-numero)' },
  { tag: t.comment, color: 'var(--cod-comentario)', fontStyle: 'italic' },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: 'var(--cod-funcao)' },
  { tag: [t.standard(t.variableName), t.className], color: 'var(--cod-embutido)' },
  { tag: [t.operator, t.punctuation, t.bracket], color: 'var(--text-muted)' },
]);

const tema = EditorView.theme({
  '&': { backgroundColor: 'var(--bg)', color: 'var(--text)', fontSize: '14px', borderRadius: 'var(--r-md)' },
  '&.cm-focused': { outline: '2px solid var(--brand)' },
  '.cm-content': { fontFamily: 'var(--font-code)', caretColor: 'var(--brand)', padding: '8px 0' },
  '.cm-scroller': { fontFamily: 'var(--font-code)', lineHeight: '1.6' },
  '.cm-gutters': { backgroundColor: 'var(--surface-2)', color: 'var(--text-muted)', border: 'none', borderRadius: 'var(--r-md) 0 0 var(--r-md)' },
  '.cm-activeLine': { backgroundColor: 'var(--brand-soft)' },
  '.cm-activeLineGutter': { backgroundColor: 'var(--brand-soft)', color: 'var(--text)' },
  '.cm-cursor': { borderLeftColor: 'var(--brand)', borderLeftWidth: '2px' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': { backgroundColor: 'color-mix(in srgb, var(--brand) 35%, transparent) !important' },
  '.cm-tooltip': { backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' },
  '.cm-tooltip-autocomplete ul li[aria-selected]': { backgroundColor: 'var(--brand)', color: '#fff' },
  '.cm-lintRange-error': { backgroundImage: 'none', textDecoration: 'underline wavy var(--st-error)', textUnderlineOffset: '3px' },
  '.cm-lintRange-warning': { backgroundImage: 'none', textDecoration: 'underline wavy var(--st-active)', textUnderlineOffset: '3px' },
  '.cm-diagnostic-error': { borderLeftColor: 'var(--st-error)' },
  '.cm-diagnostic-warning': { borderLeftColor: 'var(--st-active)' },
});

function paraDiagnosticos(view: EditorView, erros: MarcaErro[]): Diagnostic[] {
  const doc = view.state.doc;
  return erros
    .filter((e) => e.linha >= 1 && e.linha <= doc.lines)
    .map((e) => {
      const l = doc.line(e.linha);
      const inicio = l.from + (l.text.length - l.text.trimStart().length);
      return { from: Math.min(inicio, l.to), to: l.to, severity: e.severidade ?? 'error', message: e.mensagem };
    });
}

const SUPORTE: Record<Linguagem, () => Extension> = {
  python: () => python(),
  javascript: () => javascript(),
  typescript: () => javascript({ typescript: true }),
  c: () => cpp(),
  cpp: () => cpp(),
  sql: () => sql({ dialect: SQLite, upperCaseKeywords: true }),
  html: () => html(),
};

/** Enquanto digita: confere sintaxe e indentação (só depois que o runtime da linguagem carregou). */
const verificarAoDigitar = (linguagem: Linguagem) => linter(
  async (view) => {
    if (!runtimePronto(linguagem)) return [];
    try {
      const a = await analisar(linguagem, view.state.doc.toString());
      const erros: MarcaErro[] = a.indentacao.map((p) => ({ ...p, severidade: 'warning' as const }));
      if (a.sintaxe) erros.push({ linha: a.sintaxe.linha, mensagem: a.sintaxe.mensagem });
      return paraDiagnosticos(view, erros);
    } catch {
      return [];
    }
  },
  { delay: 600 },
);

interface Props {
  linguagem: Linguagem;
  valor: string;
  onChange: (codigo: string) => void;
  onExecutar?: () => void;
  rotulo?: string;
}

const EditorCodigo = forwardRef<EditorCodigoRef, Props>(function EditorCodigo({ linguagem, valor, onChange, onExecutar, rotulo }, ref) {
  const caixa = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const callbacks = useRef({ onChange, onExecutar });
  callbacks.current = { onChange, onExecutar };

  useEffect(() => {
    const v = new EditorView({
      parent: caixa.current!,
      state: EditorState.create({
        doc: valor,
        extensions: [
          basicSetup,
          SUPORTE[linguagem](),
          indentUnit.of(' '.repeat(LINGUAGENS[linguagem].recuo || 2)),
          EditorState.tabSize.of(LINGUAGENS[linguagem].recuo || 2),
          keymap.of([
            { key: 'Mod-Enter', run: () => { callbacks.current.onExecutar?.(); return true; } },
            indentWithTab,
          ]),
          syntaxHighlighting(destaque),
          tema,
          lintGutter(),
          verificarAoDigitar(linguagem),
          EditorView.contentAttributes.of({ 'aria-label': rotulo ?? `Editor de código ${LINGUAGENS[linguagem].nome}`, autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false' }),
          EditorView.updateListener.of((u) => {
            if (u.docChanged) callbacks.current.onChange(u.state.doc.toString());
          }),
        ],
      }),
    });
    view.current = v;
    return () => v.destroy();
    // o editor é criado uma vez; mudanças externas passam por ref.definir()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useImperativeHandle(ref, () => ({
    irParaLinha(linha) {
      const v = view.current;
      if (!v || linha < 1 || linha > v.state.doc.lines) return;
      const l = v.state.doc.line(linha);
      v.dispatch({ selection: { anchor: l.to }, scrollIntoView: true });
      v.focus();
    },
    marcar(erros) {
      const v = view.current;
      if (v) v.dispatch(setDiagnostics(v.state, paraDiagnosticos(v, erros)));
    },
    definir(codigo) {
      const v = view.current;
      if (v) v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: codigo } });
    },
  }));

  const comando = (f: typeof indentMore) => () => {
    if (view.current) {
      f(view.current);
      view.current.focus();
    }
  };

  return (
    <div className="editor">
      <div ref={caixa} />
      {/* no celular não há tecla Tab: estes botões indentam a linha atual */}
      <div className="editor-teclas">
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={comando(indentLess)} title="Diminuir indentação (Shift+Tab)">⇤ recuar</button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={comando(indentMore)} title="Aumentar indentação (Tab)">indentar ⇥</button>
      </div>
    </div>
  );
});

export default EditorCodigo;
