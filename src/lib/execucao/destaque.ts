/**
 * Destaque de sintaxe para shell e assembly RISC-V no CodeMirror
 * (tokenizadores simples, no formato StreamLanguage).
 */
import { StreamLanguage, type StringStream } from '@codemirror/language';

const PALAVRAS_SHELL = new Set(['if', 'then', 'elif', 'else', 'fi', 'for', 'in', 'do', 'done', 'while', 'until', 'case', 'esac', 'function', 'return', 'local', 'break', 'continue', 'exit', 'export']);

export const linguagemShell = StreamLanguage.define<{ aspas: string | null }>({
  name: 'shell',
  startState: () => ({ aspas: null }),
  token(s: StringStream, st) {
    if (!st.aspas && (s.peek() === '"' || s.peek() === "'")) st.aspas = s.next()!;
    if (st.aspas) {
      while (!s.eol()) {
        const c = s.next();
        if (c === '\\') s.next();
        else if (c === st.aspas) { st.aspas = null; break; }
      }
      return 'string';
    }
    if (s.eatSpace()) return null;
    if (s.match('#')) { s.skipToEnd(); return 'comment'; }
    if (s.match(/^\$(\{[^}]*\}|\(\(|\(|[A-Za-z_]\w*|[0-9@#?*$!])/)) return 'variableName.standard';
    if (s.match(/^(\|\||&&|>>|2>|[|;<>&])/)) return 'operator';
    if (s.match(/^-?\d+\b/)) return 'number';
    if (s.match(/^-{1,2}[A-Za-z][\w-]*/)) return 'attributeName';
    if (s.match(/^[A-Za-z_][\w-]*(?==)/)) return 'variableName.standard';
    const w = s.match(/^[^\s"'|;<>&$()]+/) as RegExpMatchArray | null;
    if (w) return PALAVRAS_SHELL.has(w[0]) ? 'keyword' : null;
    s.next();
    return null;
  },
  languageData: { commentTokens: { line: '#' } },
});

const REG = /^(zero|ra|sp|gp|tp|fp|t[0-6]|s(1[01]|[0-9])|a[0-7]|x([12]?\d|3[01]))\b/;

export const linguagemRiscv = StreamLanguage.define<{ inicio: boolean }>({
  name: 'riscv',
  startState: () => ({ inicio: true }),
  token(s: StringStream, st) {
    if (s.sol()) st.inicio = true;
    if (s.eatSpace()) return null;
    if (s.match('#')) { s.skipToEnd(); return 'comment'; }
    if (s.match(/^"(?:[^"\\]|\\.)*"?/) || s.match(/^'(?:[^'\\]|\\.)'/)) return 'string';
    if (s.match(/^[A-Za-z_.$][\w.$]*:/)) return 'labelName';
    if (s.match(/^\.[A-Za-z]+/)) { st.inicio = false; return 'meta'; }
    if (st.inicio && s.match(/^[A-Za-z][\w.]*/)) { st.inicio = false; return 'keyword'; }
    if (s.match(REG)) return 'variableName.standard';
    if (s.match(/^-?(0x[0-9a-fA-F]+|0b[01]+|\d+)\b/)) return 'number';
    if (s.match(/^[A-Za-z_.$][\w.$]*/)) return 'labelName';
    s.next();
    return null;
  },
  languageData: { commentTokens: { line: '#' } },
});
