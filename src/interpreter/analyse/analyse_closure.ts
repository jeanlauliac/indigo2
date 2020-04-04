import { GraphBuilder } from "./GraphBuilder";
import { ExpressionContext } from "./analyse_expression";
import { Expression } from "./Graph";
import { analyse_block } from "./analyse_block";
import { BlockAst } from "../parsing/UnitAst";

export function analyse_closure(
  gb: GraphBuilder,
  exp: BlockAst,
  context: ExpressionContext
): Expression {
  const function_id = gb.next_ID++;
  const block = analyse_block(gb, exp, {
    function_id,
    return_type_id_hint: gb.builtins.void,
    scope: context.scope
  });

  gb.functions.set(function_id, {
    statements: block.statements,
    return_expression: block.return_expression,
    return_type_id: block.return_expression?.type_id || gb.builtins.void
  });

  return { type: "closure", function_id, type_id: gb.builtins.func };
}
