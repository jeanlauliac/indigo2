import { FunctionCallAst } from "../parsing/UnitAst";
import { GraphBuilder } from "./GraphBuilder";
import { ExpressionContext, analyse_expression } from "./analyse_expression";
import { Expression } from "./Graph";
import { nullthrows } from "../nullthrows";

export function analyse_function_call(
  gb: GraphBuilder,
  exp: FunctionCallAst,
  context: ExpressionContext
): Expression {
  const target = analyse_expression(gb, exp.target, context);
  const type = nullthrows(gb.types.get(target.type_id));
  if (type.type !== "function") {
    throw new Error("cannot call this expression");
  }

  const args = exp.arguments.map((arg) => {
    return analyse_expression(gb, arg, context);
  });

  return { type: "function_call", target, arguments: args, type_id: 0 };
}
