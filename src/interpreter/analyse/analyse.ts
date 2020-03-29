import { UnitAst, FunctionAst } from "../parsing/UnitAst";
import { nullthrows } from "../nullthrows";
import { GraphBuilder } from "./GraphBuilder";
import { analyse_expression } from "./analyse_expression";
import { analyse_statement } from "./analyse_statement";
import { Graph, Function } from "./Graph";

export function analyse(unit: UnitAst): Graph {
  const gb = new GraphBuilder();
  analyse_unit(gb, unit);

  return {
    types: gb.types,
    functions: gb.functions,
    entry_point_id: gb.funcs_by_name.get("main")[0]
  };
}

function analyse_unit(gb: GraphBuilder, unit: UnitAst) {
  for (const func of unit.functions) {
    gb.funcs_by_name.set(func.name, [gb.next_ID++, func]);
  }

  for (const [id, func] of gb.funcs_by_name.values()) {
    gb.functions.set(id, analyse_function(gb, func));
  }
}

function analyse_function(gb: GraphBuilder, func: FunctionAst): Function {
  const return_type_id = gb.resolve_type(func.return_type);
  const scope = { outer: null, vars_by_name: new Map() };
  const statements = [];

  for (const st_ast of func.statements) {
    const st = analyse_statement(gb, st_ast, scope);
    if (st.type === "let") {
      scope.vars_by_name.set(st.name, st.variable_id);
      gb.variables.set(st.variable_id, {
        type_id: st.initial_value.type_id,
        name: st.name
      });
    }

    statements.push(st);
  }

  const return_expression =
    func.return_expression == null
      ? null
      : analyse_expression(gb, func.return_expression, {
          type_hint_id: return_type_id,
          scope
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

  return { return_type_id, statements, return_expression };
}
