import { Token, KEYWORDS, Keyword, OPERATORS, Operator } from "./Token";

export type FunctionAst = {
  name: string;
};

export type Ast = {
  functions: FunctionAst[];
};

export function parse(sourceCode: string): Ast {
  const functions: FunctionAst[] = [];
  const parser = new Parser(sourceCode);

  while (parser.token.type !== "end") {
    let fn = parser.parse_function();
    if (fn == null) throw new Error("expected function");
    functions.push(fn);
  }
  return { functions };
}

const PARTIAL_OPERATORS = (() => {
  const result = new Set();
  for (const op of OPERATORS) {
    for (let i = 1; i < op.length; ++i) {
      result.add(op.substring(0, i));
    }
  }
  return result;
})();

class Parser {
  readonly sourceCode: string;
  position: number;
  token: Token;

  constructor(sourceCode: string) {
    this.sourceCode = sourceCode;
    this.position = 0;
    this.token = this.parse_token();
  }

  parse_function(): FunctionAst | null {
    if (!this.has_kw("fn")) return null;
    this.nextt();
    const name = this.get_identifier();
    this.nextt();
    if (!this.has_op("(")) throw new Error('expected operator "("');
    this.nextt();
    if (!this.has_op(")")) throw new Error('expected operator ")"');
    this.nextt();
    if (!this.has_op("{")) throw new Error('expected operator "{"');
    this.nextt();

    if (!this.has_op("}")) throw new Error('expected operator "}"');
    this.nextt();

    return { name };
  }

  nextt() {
    this.token = this.parse_token();
  }

  parse_token(): Token {
    while (!this.eos() && / \t\n/.test(this.chr())) this.forward();
    if (this.eos()) {
      this.token = { type: "end" };
    }
    let token: Token | null;
    if ((token = this.parse_ident_or_keyword())) return token;
    if ((token = this.parse_operator())) return token;
    if ((token = this.parse_string())) return token;
    throw new Error(`unexpected character "${this.chr()}"`);
  }

  parse_ident_or_keyword(): Token | null {
    if (!is_alpha(this.chr())) return null;
    let value = this.chr();
    this.forward();
    while (!this.eos() && (is_alpha(this.chr()) || is_numeric(this.chr()))) {
      value += this.chr();
      this.forward();
    }
    if (KEYWORDS.has(value) === true) {
      return { type: "keyword", value: value as Keyword };
    }
    return { type: "identifier", name: value };
  }

  parse_operator(): Token | null {
    if (!PARTIAL_OPERATORS.has(this.chr())) return null;
    let value = this.chr();
    this.forward();
    while (!this.eos() && PARTIAL_OPERATORS.has(value + this.chr())) {
      value += this.chr();
      this.forward();
    }
    if (!OPERATORS.has(value)) {
      throw new Error(`unknown operator "${value}"`);
    }
    return { type: "operator", value: value as Operator };
  }

  parse_string(): Token | null {
    if (this.chr() !== '"') return null;
    this.forward();
    let value = "";
    while (!this.eos && this.chr() !== '"') {
      value += this.chr();
      this.forward();
    }
    return { type: "string", value };
  }

  private has_kw(value: Keyword) {
    return this.token.type === "keyword" && this.token.value === value;
  }

  private has_op(value: Operator) {
    return this.token.type === "operator" && this.token.value === value;
  }

  private get_identifier(): string {
    if (this.token.type !== "identifier")
      throw new Error("expected identifier");
    return this.token.name;
  }

  private eos() {
    return this.position >= this.sourceCode.length;
  }

  private chr() {
    if (this.position >= this.sourceCode.length)
      throw new Error("reached end of file");
    return this.sourceCode[this.position];
  }

  private forward() {
    ++this.position;
  }
}

function is_alpha(char: string) {
  return /^[a-zA-Z_-]$/.test(char);
}

function is_numeric(char: string) {
  return /^[0-9]$/.test(char);
}
