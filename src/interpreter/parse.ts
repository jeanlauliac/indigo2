import {
  Token,
  KEYWORDS,
  Keyword,
  OPERATORS,
  Operator,
  Location
} from "./Token";
import { IndigoError } from "./IndigoError";

export type FunctionAst = {
  name: string;
  statements: Statement[];
  location: Location;
};

export type Statement = {
  type: "return";
  expression: Expression;
  location: Location;
};

export type Expression = {
  type: "string";
  value: string;
  location: Location;
};

export type Ast = {
  functions: FunctionAst[];
};

export function parse(sourceCode: string): Ast {
  const parser = new Parser(sourceCode);
  return parser.parse_unit();
}

const PARTIAL_OPERATORS = (() => {
  const result = new Set();
  for (const op of OPERATORS) {
    for (let i = 1; i <= op.length; ++i) {
      result.add(op.substring(0, i));
    }
  }
  return result;
})();

class Parser {
  readonly sourceCode: string;
  private token: Token;
  private position: number = 0;
  private location: Location = { row: 1, column: 1 };

  constructor(sourceCode: string) {
    this.sourceCode = sourceCode;
    this.token = this.parse_token();
  }

  parse_unit() {
    const functions: FunctionAst[] = [];

    while (this.token.type !== "end") {
      while (this.token.type === "newline") this.nextt();
      let fn = this.parse_function();
      if (fn != null) {
        functions.push(fn);
      }
    }

    return { functions };
  }

  parse_function(): FunctionAst | null {
    if (!this.has_kw("fn")) return null;
    const location = this.token.location;

    this.nextt();
    const name = this.get_identifier();
    this.nextt();
    if (!this.has_op("(")) throw this.token_err('expected operator "("');
    this.nextt();
    if (!this.has_op(")")) throw this.token_err('expected operator ")"');
    this.nextt();
    if (!this.has_op("{")) throw this.token_err('expected operator "{"');
    this.nextt();

    const statements = [];
    while (this.token.type !== "end" && !this.has_op("}")) {
      if (this.token.type === "newline") {
        this.nextt();
        continue;
      }

      let statement;
      if ((statement = this.parse_return())) statements.push(statement);
      else throw this.token_err("unexpected token");
    }

    if (!this.has_op("}")) throw this.token_err('expected operator "}"');
    this.nextt();

    return { name, statements, location };
  }

  parse_return(): Statement | null {
    if (!this.has_kw("return")) return null;
    const location = this.token.location;
    this.nextt();

    const expression = this.parse_expression();
    if (expression == null) throw this.token_err("expected expression");

    return { type: "return", expression, location };
  }

  parse_expression(): Expression | null {
    if (this.token.type === "string") {
      const { value, location } = this.token;
      this.nextt();
      return { type: "string", value, location };
    }
    return null;
  }

  nextt() {
    this.token = this.parse_token();
  }

  parse_token(): Token {
    do this.discard_whitespace();
    while (this.discard_comment());
    const location = this.loc();
    if (this.eos()) {
      return { type: "end", location };
    }
    if (this.chr() === "\n") {
      this.forward();
      return { type: "newline", location };
    }
    let token: Token | null;
    if ((token = this.parse_ident_or_keyword())) return token;
    if ((token = this.parse_operator())) return token;
    if ((token = this.parse_string())) return token;

    throw new Error(`unexpected character "${this.chr()}"`);
  }

  discard_comment(): boolean {
    if (
      this.eos() ||
      this.chr() !== "/" ||
      this.position >= this.sourceCode.length - 1 ||
      this.sourceCode[this.position + 1] !== "/"
    )
      return false;
    this.forward();
    this.forward();

    while (this.chr() !== "\n") this.forward();
    return true;
  }

  discard_whitespace() {
    while (!this.eos() && /^[ \t]$/.test(this.chr())) this.forward();
  }

  parse_ident_or_keyword(): Token | null {
    if (!is_alpha(this.chr())) return null;
    let location = this.loc();
    let value = this.chr();
    this.forward();
    while (!this.eos() && (is_alpha(this.chr()) || is_numeric(this.chr()))) {
      value += this.chr();
      this.forward();
    }
    if (KEYWORDS.has(value) === true) {
      return { type: "keyword", value: value as Keyword, location };
    }
    return { type: "identifier", name: value, location };
  }

  parse_operator(): Token | null {
    if (!PARTIAL_OPERATORS.has(this.chr())) return null;
    const location = this.loc();
    let value = this.chr();
    this.forward();
    while (!this.eos() && PARTIAL_OPERATORS.has(value + this.chr())) {
      value += this.chr();
      this.forward();
    }
    if (!OPERATORS.has(value)) {
      throw new Error(`unknown operator "${value}"`);
    }
    return { type: "operator", value: value as Operator, location };
  }

  parse_string(): Token | null {
    if (this.chr() !== '"') return null;
    const location = this.loc();
    this.forward();
    let value = "";
    while (!this.eos() && this.chr() !== '"') {
      value += this.chr();
      this.forward();
    }
    this.forward();
    if (this.eos())
      throw new IndigoError("unterminated quoted string", {
        type: "parse",
        location
      });
    return { type: "string", value, location };
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

  private loc(): Location {
    return { ...this.location };
  }

  private token_err(message: string): Error {
    return new IndigoError(message, {
      type: "parse",
      location: this.token.location
    });
  }

  private forward() {
    if (this.chr() === "\n") {
      ++this.location.row;
      this.location.column = 1;
    } else {
      ++this.location.column;
    }
    ++this.position;
  }
}

function is_alpha(char: string) {
  return /^[a-zA-Z_-]$/.test(char);
}

function is_numeric(char: string) {
  return /^[0-9]$/.test(char);
}
