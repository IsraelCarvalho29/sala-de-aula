# Roda dentro do Pyodide (Web Worker). Executa o código do aluno com entradas
# simuladas para input(), separa o que foi impresso por print() e traduz os
# erros mais comuns para português. Também confere a indentação (4 espaços por
# nível, sem TAB) e quais funções/estruturas o código usa.
import ast
import builtins
import io
import json
import linecache
import sys
import tokenize
import traceback

ARQUIVO = "main.py"
LIMITE_SAIDA = 50_000

EXPLICACAO = {
    "SyntaxError": "Erro de sintaxe: o Python não conseguiu entender esta linha. Confira parênteses e aspas fechados e se falta ':' no fim de if/else/for/def.",
    "IndentationError": "Erro de indentação: o recuo desta linha não combina com o bloco. Depois de uma linha que termina em ':', o bloco vem com 4 espaços a mais; quando o bloco acaba, o recuo volta.",
    "TabError": "Mistura de TAB e espaços no recuo. Use só espaços: 4 por nível.",
    "NameError": "Nome não definido: você usou uma variável ou função que ainda não existe. Confira a grafia (maiúsculas importam) e se a variável foi criada antes desta linha. Texto precisa estar entre aspas.",
    "TypeError": "Erro de tipo: esta operação não funciona com esses tipos de dado. Confira os tipos com type() e converta com int(), float() ou str().",
    "ValueError": "Valor inválido: o tipo está certo, mas o conteúdo não serve. Ex.: int('vinte') e int('1.5') falham, porque o texto não representa um número inteiro.",
    "ZeroDivisionError": "Divisão por zero não existe na matemática nem no Python.",
    "EOFError": "O programa chamou input() mais vezes do que há linhas de entrada. Cada input() lê uma linha.",
    "AttributeError": "Esse tipo de dado não tem esse método ou atributo. Confira o tipo da variável e a grafia do método.",
    "IndexError": "Índice fora da faixa: a posição pedida não existe. Lembre que a contagem começa em 0.",
    "KeyError": "Chave inexistente no dicionário.",
    "RecursionError": "Recursão sem fim: a função chama a si mesma sem chegar no caso base.",
}


def _dica_especifica(e):
    msg = str(e)
    if isinstance(e, TypeError):
        if "can only concatenate str" in msg or ("unsupported operand" in msg and "'str'" in msg):
            return "Você misturou texto (str) com número numa conta. Lembre: input() sempre devolve str. Converta antes com int(...) ou float(...), ou use uma f-string para montar a frase."
        if "not supported between instances of 'str'" in msg:
            return "Você comparou texto com número (ex.: '20' >= 18). Converta o texto com int(...) antes de comparar."
    if isinstance(e, ValueError) and "invalid literal for int()" in msg:
        return "int() só converte texto de número inteiro, como '42'. Para '1.75' use float(); para texto que não é número, a conversão não existe."
    if isinstance(e, ValueError) and "could not convert string to float" in msg:
        return "float() só converte texto que representa número, com ponto decimal: '1.75' funciona, '1,75' não."
    if isinstance(e, NameError):
        nome = getattr(e, "name", None)
        if nome and nome.lower() in ("print", "input", "int", "float", "str", "true", "false", "none"):
            return f"Python diferencia maiúsculas de minúsculas: confira a grafia de '{nome}'."
    return None


class _Limite(Exception):
    pass


class _Saida:
    def __init__(self, *destinos):
        self.destinos = destinos

    def write(self, s):
        for d in self.destinos:
            d.write(s)
            if d.tell() > LIMITE_SAIDA:
                raise _Limite("O programa imprimiu texto demais (laço sem fim?).")
        return len(s)

    def flush(self):
        pass


def _descrever(e, codigo):
    tipo = type(e).__name__
    linha = None
    if isinstance(e, SyntaxError) and e.filename == ARQUIVO:
        linha = e.lineno
    for f in traceback.extract_tb(e.__traceback__):
        if f.filename == ARQUIVO:
            linha = f.lineno
    # mostra só a parte do traceback que é do código do aluno
    tb = e.__traceback__
    while tb is not None and tb.tb_frame.f_code.co_filename != ARQUIVO:
        tb = tb.tb_next
    texto = "".join(traceback.format_exception(type(e), e, tb))
    if not texto.startswith("Traceback") and not isinstance(e, SyntaxError):
        texto = "Traceback (most recent call last):\n" + texto
    return {
        "tipo": tipo,
        "mensagem": str(e) if not isinstance(e, SyntaxError) else (e.msg or str(e)),
        "linha": linha,
        "explicacao": EXPLICACAO.get(tipo, ""),
        "dica": _dica_especifica(e),
        "traceback": texto,
    }


def executar(dados):
    codigo = dados["codigo"]
    fila = list(dados.get("entradas") or [])
    chamada = dados.get("chamada")
    so_prints = io.StringIO()
    terminal = io.StringIO()
    linecache.cache[ARQUIVO] = (len(codigo), None, codigo.splitlines(True), ARQUIVO)

    def _input(prompt=""):
        prompt = str(prompt)
        terminal.write(prompt)
        if not fila:
            raise EOFError("input() foi chamado, mas não há mais linhas de entrada")
        valor = fila.pop(0)
        terminal.write(valor + "\n")
        return valor

    ambiente = {"__name__": "__main__", "__builtins__": builtins, "input": _input}
    velho_out, velho_err = sys.stdout, sys.stderr
    sys.stdout = _Saida(so_prints, terminal)
    sys.stderr = _Saida(terminal)
    erro = None
    retorno = None
    try:
        exec(compile(codigo, ARQUIVO, "exec"), ambiente)
        if chamada:
            retorno = repr(eval(chamada, ambiente))
    except SystemExit:
        pass
    except _Limite as e:
        erro = {"tipo": "Limite", "mensagem": str(e), "linha": None, "explicacao": "", "dica": None, "traceback": str(e)}
    except BaseException as e:
        erro = _descrever(e, codigo)
    finally:
        sys.stdout, sys.stderr = velho_out, velho_err
    return {
        "saida": so_prints.getvalue(),
        "terminal": terminal.getvalue(),
        "erro": erro,
        "retorno": retorno,
    }


ESTRUTURAS = {
    "if": ast.If,
    "for": ast.For,
    "while": ast.While,
    "def": ast.FunctionDef,
    "return": ast.Return,
    "f-string": ast.JoinedStr,
    "break": ast.Break,
    "continue": ast.Continue,
    "class": ast.ClassDef,
    "lambda": ast.Lambda,
    "try": ast.Try,
    "raise": ast.Raise,
    "with": ast.With,
    "match": ast.Match,
    "case": ast.match_case,
    "nonlocal": ast.Nonlocal,
    "import": (ast.Import, ast.ImportFrom),
    "list-comprehension": (ast.ListComp, ast.SetComp, ast.DictComp, ast.GeneratorExp),
}


def analisar(dados):
    """Indentação (PEP 8: 4 espaços por nível, sem TAB), sintaxe e o que o código usa."""
    codigo = dados["codigo"]
    usa = dados.get("usa") or []
    problemas = []
    for n, linha in enumerate(codigo.splitlines(), 1):
        recuo = linha[: len(linha) - len(linha.lstrip())]
        if "\t" in recuo:
            problemas.append({"linha": n, "mensagem": "Use espaços, não TAB, para indentar."})
    try:
        niveis = [0]
        for tok in tokenize.generate_tokens(io.StringIO(codigo).readline):
            if tok.type == tokenize.INDENT:
                largura = len(tok.string.expandtabs(4))
                passo = largura - niveis[-1]
                niveis.append(largura)
                if passo != 4:
                    problemas.append({
                        "linha": tok.start[0],
                        "mensagem": f"Este bloco tem {passo} espaço(s) a mais que a linha de cima; o padrão do Python (PEP 8) é 4.",
                    })
            elif tok.type == tokenize.DEDENT:
                niveis.pop()
    except (tokenize.TokenError, SyntaxError):
        pass

    sintaxe = None
    usados = set()
    try:
        arvore = ast.parse(codigo, ARQUIVO)
        for no in ast.walk(arvore):
            if isinstance(no, ast.Call):
                f = no.func
                if isinstance(f, ast.Name):
                    usados.add(f.id)
                elif isinstance(f, ast.Attribute):
                    usados.add(f.attr)
            for nome, classe in ESTRUTURAS.items():
                if isinstance(no, classe):
                    usados.add(nome)
    except SyntaxError as e:
        sintaxe = {"linha": e.lineno, "mensagem": f"{type(e).__name__}: {e.msg}"}
    return {
        "indentacao": problemas,
        "sintaxe": sintaxe,
        "faltando": [u for u in usa if u not in usados],
    }


def executar_json(texto):
    return json.dumps(executar(json.loads(texto)))


def analisar_json(texto):
    return json.dumps(analisar(json.loads(texto)))
