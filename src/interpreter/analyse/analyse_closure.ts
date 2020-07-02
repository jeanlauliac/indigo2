import { GraphBuilder } from "./GraphBuilder";
import { ExpressionContext, Scope } from "./analyse_expression";
import { Expression, Block, Argument } from "./Graph";
import { analyse_block } from "./analyse_block";
import { ClosureAst } from "../parsing/UnitAst";

export function analyse_closure(
  gb: GraphBuilder,
  exp: ClosureAst,
  context: ExpressionContext
): Expression {
  const function_id = gb.next_ID++;
  const {
    statements,
    return_expression,
    arguments: args,
  } = analyse_closure_body(gb, exp, {
    scope: context.scope,
    type_hint_id: gb.builtins.void,
    function_id,
  });

  gb.functions.set(function_id, {
    statements: statements,
    return_expression: return_expression,
    return_type_id: return_expression?.type_id || gb.builtins.void,
    arguments: args,
  });

  return { type: "closure", function_id, type_id: gb.builtins.func };
}

export function analyse_closure_body(
  gb: GraphBuilder,
  exp: ClosureAst,
  context: ExpressionContext
): Block & { arguments: Argument[] } {
  const { function_id } = context;
  const scope: Scope = { outer: context.scope, vars_by_name: new Map() };
  const args = [];

  for (const arg of exp.arguments) {
    const { name } = arg;
    const type_id = gb.resolve_type(arg.type_name);
    const var_id = gb.register_variable({ function_id, name, type_id });
    scope.vars_by_name.set(name, var_id);
    args.push({ name, type_id, variable_id: var_id });
  }

  const block = analyse_block(gb, exp, {
    function_id,
    return_type_id_hint: gb.builtins.void,
    scope,
  });

  return { ...block, arguments: args };
}
