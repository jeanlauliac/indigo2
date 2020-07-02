import { TokenReader } from "./TokenReader";
import { ExpressionAst, FunctionArgument } from "./UnitAst";
import { parse_block } from "./parse_block";

export function parse_closure(tr: TokenReader): ExpressionAst | null {
  let args: FunctionArgument[];
  if (tr.has_op("|")) {
    tr.forward();
    args = parse_closure_args(tr);
  } else if (tr.has_op("||")) {
    tr.forward();
    args = [];
  } else return null;

  const block = parse_block(tr);
  if (block == null) throw tr.token_err("expected block");

  return { type: "closure", arguments: args, ...block };
}

function parse_closure_args(tr: TokenReader): FunctionArgument[] {
  const args = [];
  while (!tr.has_op("|")) {
    const name = tr.get_identifier();
    tr.forward();

    if (!tr.has_op(":")) throw tr.token_err('expected ":"');
    tr.forward();

    const type_name = tr.get_identifier();
    tr.forward();

    args.push({ name, type_name });

    if (tr.has_op(",")) tr.forward();
    else if (!tr.has_op("|")) throw tr.token_err("unexpected token");
  }
  tr.forward();

  return args;
}
