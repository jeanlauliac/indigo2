import { GraphBuilder } from "./GraphBuilder";
import { BlockAst } from "../parsing/UnitAst";
import { analyse_expression, Scope } from "./analyse_expression";
import { Block } from "./Graph";
import { analyse_statement } from "./analyse_statement";

type BlockContext = {
  scope: Scope | null;
  return_type_id_hint: number;
  function_id: number;
};

export function analyse_block(
  gb: GraphBuilder,
  block: BlockAst,
  context: BlockContext
): Block {
  const { function_id } = context;
  const scope = { outer: context.scope, vars_by_name: new Map() };
  const statements = [];

  for (const st_ast of block.statements) {
    const st = analyse_statement(gb, st_ast, { scope, function_id });
    if (st.type === "let") {
      scope.vars_by_name.set(st.name, st.variable_id);
      gb.variables.set(st.variable_id, {
        type_id: st.initial_value.type_id,
        name: st.name,
        function_id
      });
    }

    statements.push(st);
  }

  const return_expression =
    block.return_expression &&
    analyse_expression(gb, block.return_expression, {
      scope,
      function_id,
      type_hint_id: context.return_type_id_hint
    });

  return {
    return_expression,
    statements
  };
}
