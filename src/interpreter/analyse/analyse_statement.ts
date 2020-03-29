import { GraphBuilder } from "./GraphBuilder";
import { Scope, analyse_expression } from "./analyse_expression";
import { StatementAst } from "../parsing/UnitAst";
import { exhaustive } from "../exhaustive";
import { Statement } from "./Graph";

export function analyse_statement(
  gb: GraphBuilder,
  st: StatementAst,
  scope: Scope
): Statement {
  switch (st.type) {
    case "expression":
    case "return":
      throw new Error();

    case "let":
      return {
        type: "let",
        name: st.name,
        variable_id: gb.next_ID++,
        initial_value: analyse_expression(gb, st.initial_value, {
          scope,
          type_hint_id: null
        })
      };

    default:
      exhaustive(st);
  }
}
