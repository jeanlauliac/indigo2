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
  statements: StatementAst[];
  location: Location;
  return_expression: ExpressionAst | null;
  return_type: string;
};

export type StatementAst =
  | {
      type: "return";
      expression: ExpressionAst;
      location: Location;
    }
  | { type: "let"; initial_value: ExpressionAst; name: string }
  | { type: "expression"; expression: ExpressionAst };

export type ElementChildAst =
  | {
      type: "text";
      value: string;
    }
  | {
      type: "expression";
      value: ExpressionAst;
    };

export type ExpressionAst =
  | {
      type: "string";
      value: string;
      location: Location;
    }
  | {
      type: "number";
      value: string;
      location: Location;
      data_type: string | null;
    }
  | { type: "reference"; identifier: string }
  | { type: "element"; name: string; children: ElementChildAst[] };

export type UnitAst = {
  functions: FunctionAst[];
};

type TokenMode = "normal" | "xml_text";

export function parse(sourceCode: string): UnitAst {
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
  private token_mode: TokenMode = "normal";

  constructor(sourceCode: string) {
    this.sourceCode = sourceCode;
    this.token = this.parse_token();
  }

  parse_unit() {
    const functions: FunctionAst[] = [];

    while (this.token.type !== "end") {
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
    if (!this.has_op("->")) throw this.token_err('expected operator "->"');
    this.nextt();

    const return_type = this.get_identifier();
    this.nextt();

    if (!this.has_op("{")) throw this.token_err('expected operator "{"');
    this.nextt();

    const statements: StatementAst[] = [];
    let return_expression = null;

    while (this.token.type !== "end" && !this.has_op("}")) {
      let statement;
      if ((statement = this.parse_statement())) {
        if (!this.has_op(";")) throw this.token_err('expected operator ";"');
        this.nextt();
        statements.push(statement);
        continue;
      }

      const expression = this.parse_expression();
      if (expression == null) throw this.token_err("unexpected token");

      if (this.has_op(";")) {
        this.nextt();
        statements.push({ type: "expression", expression });
      } else if (this.has_op("}")) {
        return_expression = expression;
      }
    }

    if (!this.has_op("}")) throw this.token_err('expected operator "}"');
    this.nextt();

    return { name, statements, location, return_type, return_expression };
  }

  parse_statement(): StatementAst | null {
    let statement;
    if ((statement = this.parse_return())) return statement;
    if ((statement = this.parse_let())) return statement;

    return statement;
  }

  parse_return(): StatementAst | null {
    if (!this.has_kw("return")) return null;
    const { location } = this.token;
    this.nextt();

    const expression = this.parse_expression();
    if (expression == null) throw this.token_err("expected expression");

    return { type: "return", expression, location };
  }

  parse_let(): StatementAst | null {
    if (!this.has_kw("let")) return null;
    this.nextt();

    const name = this.get_identifier();
    this.nextt();
    if (!this.has_op("=")) throw this.token_err('expected operator "="');
    this.nextt();

    const initial_value = this.parse_expression();
    if (initial_value == null) throw this.token_err("expected expression");

    return { type: "let", name, initial_value };
  }

  parse_expression(): ExpressionAst | null {
    if (this.token.type === "string") {
      const { value, location } = this.token;
      this.nextt();
      return { type: "string", value, location };
    }
    if (this.token.type === "number") {
      const { value, location, data_type } = this.token;
      this.nextt();
      return { type: "number", value, location, data_type };
    }
    if (this.token.type === "identifier") {
      const { name } = this.token;
      this.nextt();
      return { type: "reference", identifier: name };
    }
    let exp;
    if ((exp = this.parse_element())) return exp;
    return null;
  }

  parse_element(): ExpressionAst | null {
    if (!this.has_op("<")) return null;
    this.nextt();
    const name = this.get_identifier();
    this.nextt();
    if (!this.has_op(">")) throw this.token_err('expected ">"');

    const children: ElementChildAst[] = [];

    do {
      this.token_mode = "xml_text";
      this.nextt();

      if (this.has_op("<")) break;
      if (this.token.type === "xml_text") {
        children.push({ type: "text", value: this.token.value });
        continue;
      }
      if (this.has_op("{")) {
        this.nextt();
        const value = this.parse_expression();
        if (value == null) throw this.token_err("expected expression");
        children.push({ type: "expression", value });
        if (!this.has_op("}")) throw this.token_err('expected "}"');
        continue;
      }
    } while (this.token.type != "end");

    if (!this.has_op("<")) throw this.token_err('expected "<"');
    this.nextt();
    if (!this.has_op("/")) throw this.token_err('expected "/"');
    this.nextt();
    const end_name = this.get_identifier();
    this.nextt();
    if (name !== end_name)
      throw this.token_err(
        `mismatched element name, expected "${name}" but got "${end_name}"`
      );

    if (!this.has_op(">")) throw this.token_err('expected ">"');
    this.nextt();

    return { type: "element", name, children };
  }

  nextt() {
    this.token = this.parse_token();
  }

  parse_token(): Token {
    if (this.token_mode === "xml_text") return this.parse_xml_text();
    do this.discard_whitespace();
    while (this.discard_comment());
    const location = this.loc();
    if (this.eos()) {
      return { type: "end", location };
    }
    let token: Token | null;
    if ((token = this.parse_ident_or_keyword())) return token;
    if ((token = this.parse_operator())) return token;
    if ((token = this.parse_string())) return token;
    if ((token = this.parse_number())) return token;

    throw new Error(`unexpected character "${this.chr()}"`);
  }

  parse_xml_text(): Token {
    this.discard_whitespace();
    if (this.eos()) {
      throw new Error("unexpected end of stream within XML text");
    }
    const location = this.loc();
    if (this.chr() == "<") {
      this.forward();
      this.token_mode = "normal";
      return { type: "operator", value: "<", location };
    }
    if (this.chr() == "{") {
      this.forward();
      this.token_mode = "normal";
      return { type: "operator", value: "{", location };
    }
    let value = "";
    let needs_space = false;
    while (!this.eos() && !/^[{<]$/.test(this.chr())) {
      if (needs_space) value += " ";
      needs_space = false;
      value += this.chr();
      this.forward();
      if (/^[ \t\n]$/.test(this.chr())) {
        needs_space = true;
        this.discard_whitespace();
        continue;
      }
    }
    if (this.chr() == "{" && needs_space) {
      value += " ";
    }
    return { type: "xml_text", value, location };
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
    while (!this.eos() && /^[ \t\n]$/.test(this.chr())) this.forward();
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

  parse_number(): Token | null {
    if (!is_numeric(this.chr())) return null;
    const location = this.loc();
    let value = this.chr();
    this.forward();
    while (!this.eos() && is_numeric(this.chr())) {
      value += this.chr();
      this.forward();
      if (!this.eos() && this.chr() === "_") this.forward();
    }
    let data_type = null;
    if (this.chr() === "i" || this.chr() === "u") {
      data_type = this.chr();
      this.forward();
      if (!is_numeric(this.chr())) throw new Error("expected number bitsize");
      while (is_numeric(this.chr())) {
        data_type += this.chr();
        this.forward();
      }
    }
    return { type: "number", value, location, data_type };
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
  return /^[a-zA-Z_]$/.test(char);
}

function is_numeric(char: string) {
  return /^[0-9]$/.test(char);
}
