import { ExpressionAst } from "./UnitAst";
import { TokenReader } from "./TokenReader";
import { parse_string } from "./parse_string";
import { parse_element } from "./parse_element";
import { parse_closure } from "./parse_closure";

export function parse_expression(tr: TokenReader): ExpressionAst | null {
  const target = parse_function_call(tr);
  if (target == null) return null;
  if (!tr.has_op("=")) return target;
  if (target.type !== "reference")
    throw tr.token_err("left side of assignment must be a reference");
  tr.forward();

  const value = parse_expression(tr);
  if (value == null) throw tr.token_err('expected expression after "="');

  return { type: "assignment", target, value };
}

export function parse_function_call(tr: TokenReader): ExpressionAst | null {
  const target = parse_primary_expression(tr);
  if (target == null) return null;

  if (!tr.has_op("(")) return target;
  tr.forward();

  let args = [];
  let exp: ExpressionAst | null;
  while ((exp = parse_expression(tr))) {
    args.push(exp);
    if (tr.has_op(",")) {
      tr.forward();
    } else if (!tr.has_op(")")) {
      throw tr.token_err("invalid token");
    }
  }
  if (!tr.has_op(")")) {
    throw new Error('expected closing parenthese ")');
  }
  tr.forward();

  return { type: "function_call", target, arguments: args };
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
