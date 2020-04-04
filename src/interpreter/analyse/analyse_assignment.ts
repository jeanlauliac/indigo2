import { GraphBuilder } from "./GraphBuilder";
import {
  ExpressionContext,
  analyse_expression,
  Scope
} from "./analyse_expression";
import { Expression } from "./Graph";
import { AssignmentAst } from "../parsing/UnitAst";

export function analyse_assignment(
  gb: GraphBuilder,
  exp: AssignmentAst,
  context: ExpressionContext
): Expression {
  let target_id = resolve_reference(exp.target.identifier, context.scope);
  let variable = gb.get_variable(target_id);
  if (variable.function_id === context.function_id) {
    throw new Error(
      `cannot reassign variable "${variable.name}"` +
        ` in the same function it is defined`
    );
  }

  const value = analyse_expression(gb, exp.value, {
    ...context,
    type_hint_id: variable.type_id
  });
  if (value.type_id !== variable.type_id) {
    throw new Error("right side of assignment doesn't match type of target");
  }

  return {
    type: "assignment",
    target_id,
    value,
    type_id: variable.type_id
  };
}

export function resolve_reference(
  identifier: string,
  scope: Scope | null
): number {
  let id;
  while (id == null && scope != null) {
    id = scope.vars_by_name.get(identifier);
    scope = scope.outer;
  }
  if (id == null) throw new Error(`could not find "${identifier}" in scope`);
  return id;
}
