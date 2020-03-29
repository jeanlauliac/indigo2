import { Token, Keyword, Operator, Location } from "../tokens/Token";
import { IndigoError } from "../IndigoError";
import { Tokenizer } from "../tokens/Tokenizer";

export type FunctionAst = {
  name: string;
  location: Location;
  return_type: string;
} & Block;

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

type ElementAttributeAst = {
  name: string;
  value: ExpressionAst;
};

type Block = {
  statements: StatementAst[];
  return_expression: ExpressionAst | null;
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
  | ({ type: "closure" } & Block)
  | {
      type: "element";
      name: string;
      children: ElementChildAst[];
      attributes: ElementAttributeAst[];
    };

export type UnitAst = {
  functions: FunctionAst[];
};

export function parse(source_code: string): UnitAst {
  const parser = new Parser(source_code);
  return parser.parse_unit();
}

class Parser {
  private tokenizer: Tokenizer;
  private token: Token;

  constructor(source_code: string) {
    this.tokenizer = new Tokenizer(source_code);
    this.token = this.tokenizer.parse_token();
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

  private parse_function(): FunctionAst | null {
    if (!this.has_kw("fn")) return null;
    const location = this.token.location;

    this.forward();
    const name = this.get_identifier();
    this.forward();
    if (!this.has_op("(")) throw this.token_err('expected operator "("');
    this.forward();
    if (!this.has_op(")")) throw this.token_err('expected operator ")"');
    this.forward();
    if (!this.has_op("->")) throw this.token_err('expected operator "->"');
    this.forward();

    const return_type = this.get_identifier();
    this.forward();

    const body = this.parse_block();
    if (body == null) throw this.token_err("expected block");

    return { name, location, return_type, ...body };
  }

  private parse_statement(): StatementAst | null {
    let statement;
    if ((statement = this.parse_return())) return statement;
    if ((statement = this.parse_let())) return statement;

    return statement;
  }

  private parse_return(): StatementAst | null {
    if (!this.has_kw("return")) return null;
    const { location } = this.token;
    this.forward();

    const expression = this.parse_expression();
    if (expression == null) throw this.token_err("expected expression");

    return { type: "return", expression, location };
  }

  private parse_let(): StatementAst | null {
    if (!this.has_kw("let")) return null;
    this.forward();

    const name = this.get_identifier();
    this.forward();
    if (!this.has_op("=")) throw this.token_err('expected operator "="');
    this.forward();

    const initial_value = this.parse_expression();
    if (initial_value == null) throw this.token_err("expected expression");

    return { type: "let", name, initial_value };
  }

  private parse_expression(): ExpressionAst | null {
    if (this.token.type === "string") {
      return this.parse_string();
    }
    if (this.token.type === "number") {
      const { value, location, data_type } = this.token;
      this.forward();
      return { type: "number", value, location, data_type };
    }
    if (this.token.type === "identifier") {
      const { name } = this.token;
      this.forward();
      return { type: "reference", identifier: name };
    }
    let exp;
    if ((exp = this.parse_element())) return exp;
    if ((exp = this.parse_closure())) return exp;
    return null;
  }

  private parse_string(): ExpressionAst {
    if (this.token.type !== "string") throw new Error("wrong token");
    const { value, location } = this.token;
    this.forward();
    return { type: "string", value, location };
  }

  private parse_element(): ExpressionAst | null {
    if (!this.has_op("<")) return null;
    this.forward();
    const name = this.get_identifier();
    this.forward();
    const attributes = [];
    while (this.token.type === "identifier") {
      const attr_name = this.get_identifier();
      this.forward();
      if (!this.has_op("=")) throw this.token_err('expected "="');
      this.forward();
      const attr_value = this.parse_attribute_value();

      attributes.push({ name: attr_name, value: attr_value });
    }
    if (!this.has_op(">")) throw this.token_err('expected ">"');

    const children: ElementChildAst[] = [];

    do {
      this.tokenizer.token_mode.val = "xml_text";
      this.forward();

      if (this.has_op("<")) break;
      if (this.token.type === "xml_text") {
        children.push({ type: "text", value: this.token.value });
        continue;
      }
      if (this.has_op("{")) {
        this.forward();
        const value = this.parse_expression();
        if (value == null) throw this.token_err("expected expression");
        children.push({ type: "expression", value });
        if (!this.has_op("}")) throw this.token_err('expected "}"');
        continue;
      }
    } while (this.token.type !== "end");

    if (!this.has_op("<")) throw this.token_err('expected "<"');
    this.forward();
    if (!this.has_op("/")) throw this.token_err('expected "/"');
    this.forward();
    const end_name = this.get_identifier();
    this.forward();
    if (name !== end_name)
      throw this.token_err(
        `mismatched element name, expected "${name}" but got "${end_name}"`
      );

    if (!this.has_op(">")) throw this.token_err('expected ">"');
    this.forward();

    return { type: "element", name, children, attributes };
  }

  private parse_attribute_value(): ExpressionAst {
    if (this.token.type === "string") {
      return this.parse_string();
    }
    if (!this.has_op("{")) throw this.token_err('expected "{"');
    this.forward();
    const attr_value = this.parse_expression();
    if (attr_value == null) throw this.token_err("expected expression");
    if (!this.has_op("}")) throw this.token_err('expected "}"');
    this.forward();
    return attr_value;
  }

  private parse_closure(): ExpressionAst | null {
    const block = this.parse_block();
    if (block == null) return null;
    return { type: "closure", ...block };
  }

  private parse_block(): Block | null {
    if (!this.has_op("{")) return null;
    this.forward();

    const statements: StatementAst[] = [];
    let return_expression = null;

    while (this.token.type !== "end" && !this.has_op("}")) {
      let statement;
      if ((statement = this.parse_statement())) {
        if (!this.has_op(";")) throw this.token_err('expected operator ";"');
        this.forward();
        statements.push(statement);
        continue;
      }

      const expression = this.parse_expression();
      if (expression == null) throw this.token_err("unexpected token");

      if (this.has_op(";")) {
        this.forward();
        statements.push({ type: "expression", expression });
      } else if (this.has_op("}")) {
        return_expression = expression;
      }
    }

    if (!this.has_op("}")) throw this.token_err('expected operator "}"');
    this.forward();

    return { statements, return_expression };
  }

  private forward() {
    this.token = this.tokenizer.parse_token();
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

  private token_err(message: string): Error {
    return new IndigoError(message, {
      type: "parse",
      location: this.token.location
    });
  }
}
