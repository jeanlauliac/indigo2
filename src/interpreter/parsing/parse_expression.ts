import { ExpressionAst, ElementChildAst } from "./UnitAst";
import { TokenReader } from "./TokenReader";
import { parse_block } from "./parse_block";
import { parse_string } from "./parse_string";
import { parse_element } from "./parse_element";

export function parse_expression(tr: TokenReader): ExpressionAst | null {
  const target = parse_primary_expression(tr);
  if (target == null) return null;
  if (!tr.has_op("=")) return target;
  if (target.type !== "reference")
    throw tr.token_err("left side of assignment must be a reference");
  tr.forward();

  const value = parse_expression(tr);
  if (value == null) throw tr.token_err('expected expression after "="');

  return { type: "assignment", target, value };
}

export function parse_primary_expression(
  tr: TokenReader
): ExpressionAst | null {
  if (tr.token.type === "string") {
    return parse_string(tr);
  }

  if (tr.token.type === "number") {
    const { value, location, data_type } = tr.token;
    tr.forward();
    return { type: "number", value, location, data_type };
  }

  if (tr.token.type === "identifier") {
    const { name } = tr.token;
    tr.forward();
    return { type: "reference", identifier: name };
  }

  let exp;
  if ((exp = parse_element(tr))) return exp;
  if ((exp = parse_closure(tr))) return exp;
  return null;
}

function parse_closure(tr: TokenReader): ExpressionAst | null {
  if (!tr.has_op("|")) {
    const block = parse_block(tr);
    if (block == null) return null;
    return { type: "closure", arguments: [], ...block };
  }
  tr.forward();
  const args = [];
  while (!tr.has_op("|")) {
    const name = tr.get_identifier();
    tr.forward();
    if (!tr.has_op(":")) throw tr.token_err('expected ":"');
    tr.forward();
    const type = tr.get_identifier();
    tr.forward();
    args.push({ name, type });
    if (tr.has_op(",")) tr.forward();
    else if (!tr.has_op("|")) throw tr.token_err("unexpected token");
  }
  tr.forward();

  const block = parse_block(tr);
  if (block == null) throw tr.token_err("expected block");

  return { type: "closure", arguments: args, ...block };
}
