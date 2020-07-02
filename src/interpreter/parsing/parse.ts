import { TokenReader } from "./TokenReader";
import { FunctionAst, UnitAst } from "./UnitAst";
import { parse_block } from "./parse_block";

export function parse(source_code: string): UnitAst {
  const parser = new Parser(source_code);
  return parser.parse_unit();
}

class Parser {
  private tr: TokenReader;

  constructor(source_code: string) {
    this.tr = new TokenReader(source_code);
  }

  parse_unit() {
    const functions: FunctionAst[] = [];

    while (this.tr.token.type !== "end") {
      let fn = this.parse_function();
      if (fn != null) {
        functions.push(fn);
      } else {
        throw new Error("expected function declaration");
      }
    }

    return { functions };
  }

  private parse_function(): FunctionAst | null {
    if (!this.tr.has_kw("fn")) return null;
    const location = this.tr.token.location;

    this.tr.forward();
    const name = this.tr.get_identifier();
    this.tr.forward();
    if (!this.tr.has_op("(")) throw this.tr.token_err('expected operator "("');
    this.tr.forward();

    const args = [];
    while (this.tr.token.type === "identifier") {
      const name = this.tr.get_identifier();
      this.tr.forward();
      if (!this.tr.has_op(":"))
        throw this.tr.token_err('expected operator ":"');
      this.tr.forward();
      const type_name = this.tr.get_identifier();
      this.tr.forward();

      args.push({ name, type_name });
      if (this.tr.has_op(",")) {
        this.tr.forward();
      } else if (!this.tr.has_op(")")) {
        throw this.tr.token_err("invalid token");
      }
    }
    if (!this.tr.has_op(")")) {
      throw new Error('expected closing parenthese ")');
    }
    this.tr.forward();

    if (!this.tr.has_op("->"))
      throw this.tr.token_err('expected operator "->"');
    this.tr.forward();

    const return_type = this.tr.get_identifier();
    this.tr.forward();

    const body = parse_block(this.tr);
    if (body == null) throw this.tr.token_err("expected block");

    return { name, location, return_type, arguments: args, ...body };
  }
}
