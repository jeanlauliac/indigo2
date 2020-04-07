import { GraphBuilder } from "./GraphBuilder";
import { ExpressionContext, Scope } from "./analyse_expression";
import { Expression } from "./Graph";
import { analyse_block } from "./analyse_block";
import { ClosureAst } from "../parsing/UnitAst";
import { nullthrows } from "../nullthrows";

export function analyse_closure(
  gb: GraphBuilder,
  exp: ClosureAst,
  context: ExpressionContext
): Expression {
  const function_id = gb.next_ID++;
  const scope: Scope = { outer: context.scope, vars_by_name: new Map() };

  for (const arg of exp.arguments) {
    const type_id = nullthrows(gb.types_by_name.get(arg.type));
    const vr = { name: arg.name, type_id, function_id };
    const var_id = gb.register_variable(vr);
    scope.vars_by_name.set(arg.name, var_id);
  }

  const block = analyse_block(gb, exp, {
    function_id,
    return_type_id_hint: gb.builtins.void,
    scope
  });

  gb.functions.set(function_id, {
    statements: block.statements,
    return_expression: block.return_expression,
    return_type_id: block.return_expression?.type_id || gb.builtins.void
  });

  return { type: "closure", function_id, type_id: gb.builtins.func };
}
