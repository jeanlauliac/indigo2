import { UnitAst, FunctionAst } from "../parsing/UnitAst";
import { nullthrows } from "../nullthrows";
import { GraphBuilder } from "./GraphBuilder";
import { Graph, Function, Variable } from "./Graph";
import { analyse_closure_body } from "./analyse_closure";
import { Scope } from "./analyse_expression";

export function analyse(unit: UnitAst): Graph {
  const gb = new GraphBuilder();
  analyse_unit(gb, unit);

  return {
    types: gb.types,
    functions: gb.functions,
    global_variables: gb.global_variables,
    entry_point_id: nullthrows(gb.funcs_by_name.get("main"))[0],
  };
}

function analyse_unit(gb: GraphBuilder, unit: UnitAst) {
  const scope: Scope = { outer: null, vars_by_name: new Map() };
  for (const func of unit.functions) {
    const function_id = gb.next_ID++;
    gb.funcs_by_name.set(func.name, [function_id, func]);
    const var_id = gb.register_variable({
      name: func.name,
      type_id: gb.builtins.func,
      function_id: -1 /* FIXME: this is supposed to be the "owning" function ID */,
    });
    scope.vars_by_name.set(func.name, var_id);
    gb.global_variables.push(var_id);
  }

  for (const [id, func] of gb.funcs_by_name.values()) {
    gb.functions.set(id, analyse_function(gb, func, id, scope));
  }
}

function analyse_function(
  gb: GraphBuilder,
  func: FunctionAst,
  function_id: number,
  scope: Scope
): Function {
  const return_type_id = gb.resolve_type(func.return_type);

  const { statements, return_expression } = analyse_closure_body(gb, func, {
    scope: { outer: scope, vars_by_name: new Map() },
    type_hint_id: return_type_id,
    function_id,
  });

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
