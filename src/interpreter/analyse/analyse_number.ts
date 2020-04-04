import { ExpressionContext } from "./analyse_expression";
import { GraphBuilder } from "./GraphBuilder";
import { NumberAst } from "../parsing/UnitAst";
import { Expression } from "./Graph";
import { nullthrows } from "../nullthrows";

export function analyse_number(
  gb: GraphBuilder,
  exp: NumberAst,
  context: ExpressionContext
): Expression {
  let type_id = context.type_hint_id;
  if (exp.data_type != null) type_id = gb.resolve_type(exp.data_type);
  if (type_id == null) throw new Error("unknown integer type");
  const type = nullthrows(gb.types.get(type_id));
  if (type.type !== "integer") throw new Error(`"${type.type}" is not numeric`);
  let max_value = Math.pow(2, type.bitsize) - 1;
  let min_value = 0;
  if (type.signed) {
    min_value = -(max_value + 1) / 2;
    max_value = -min_value - 1;
  }
  const value = parseInt(exp.value);
  if (value > max_value) {
    throw new Error("integer literal is too large for this type");
  }
  if (value < min_value) {
    throw new Error("integer literal is too large for this type");
  }

  return { type: "integer", type_id, value };
}
