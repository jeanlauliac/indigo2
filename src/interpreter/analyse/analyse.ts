import { UnitAst, FunctionAst } from "../parsing/UnitAst";
import { nullthrows } from "../nullthrows";
import { GraphBuilder } from "./GraphBuilder";
import { Graph, Function } from "./Graph";
import { analyse_block } from "./analyse_block";

export function analyse(unit: UnitAst): Graph {
  const gb = new GraphBuilder();
  analyse_unit(gb, unit);

  return {
    types: gb.types,
    functions: gb.functions,
    entry_point_id: nullthrows(gb.funcs_by_name.get("main"))[0],
  };
}

function analyse_unit(gb: GraphBuilder, unit: UnitAst) {
  for (const func of unit.functions) {
    gb.funcs_by_name.set(func.name, [gb.next_ID++, func]);
  }

  for (const [id, func] of gb.funcs_by_name.values()) {
    gb.functions.set(id, analyse_function(gb, func, id));
  }
}

function analyse_function(
  gb: GraphBuilder,
  func: FunctionAst,
  function_id: number
): Function {
  const return_type_id = gb.resolve_type(func.return_type);

  const block = analyse_block(gb, func, {
    scope: null,
    return_type_id_hint: return_type_id,
    function_id,
  });

  const { statements, return_expression } = block;
  if (return_expression && return_expression.type_id !== return_type_id) {
    const expected_type = nullthrows(gb.types.get(return_type_id)).name;
    const actual_type = nullthrows(gb.types.get(return_expression.type_id))
      .name;
    throw new Error(
      `expected return expression to be of type "${expected_type}", ` +
        `but got type "${actual_type}"`
    );
  }

  return { return_type_id, statements, return_expression, arguments: [] };
}
