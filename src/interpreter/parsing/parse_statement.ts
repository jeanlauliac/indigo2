import { StatementAst } from "./UnitAst";
import { TokenReader } from "./TokenReader";
import { parse_expression } from "./parse_expression";

export function parse_statement(tr: TokenReader): StatementAst | null {
  let statement;
  if ((statement = parse_return(tr))) return statement;
  if ((statement = parse_let(tr))) return statement;

  return statement;
}

function parse_return(tr: TokenReader): StatementAst | null {
  if (!tr.has_kw("return")) return null;
  const { location } = tr.token;
  tr.forward();

  const expression = parse_expression(tr);
  if (expression == null) throw tr.token_err("expected expression");

  return { type: "return", expression, location };
}

function parse_let(tr: TokenReader): StatementAst | null {
  if (!tr.has_kw("let")) return null;
  tr.forward();

  const name = tr.get_identifier();
  tr.forward();
  if (!tr.has_op("=")) throw tr.token_err('expected operator "="');
  tr.forward();

  const initial_value = parse_expression(tr);
  if (initial_value == null) throw tr.token_err("expected expression");

  return { type: "let", name, initial_value };
}
