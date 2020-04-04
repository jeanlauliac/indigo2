import { ExpressionAst, ElementAst } from "../parsing/UnitAst";
import { nullthrows } from "../nullthrows";
import { GraphBuilder } from "./GraphBuilder";
import { exhaustive } from "../exhaustive";
import { Expression } from "./Graph";
import { analyse_number } from "./analyse_number";
import { analyse_assignment, resolve_reference } from "./analyse_assignment";
import { analyse_closure } from "./analyse_closure";

export type ExpressionContext = {
  type_hint_id: number;
  function_id: number;
  scope: Scope;
};

export type Scope = {
  vars_by_name: Map<string, number>;
  outer: Scope | null;
};

export function analyse_expression(
  gb: GraphBuilder,
  exp: ExpressionAst,
  context: ExpressionContext
): Expression {
  switch (exp.type) {
    case "string":
      return {
        type: "string",
        type_id: gb.builtins.str,
        value: exp.value
      };

    case "number":
      return analyse_number(gb, exp, context);

    case "element":
      return analyse_element(gb, exp, context);

    case "reference": {
      const variable_id = resolve_reference(exp.identifier, context.scope);
      const { type_id } = nullthrows(gb.variables.get(variable_id));
      return {
        type: "reference",
        variable_id,
        type_id
      };
    }

    case "closure":
      return analyse_closure(gb, exp, context);

    case "assignment":
      return analyse_assignment(gb, exp, context);

    default:
      exhaustive(exp);
  }
}

function analyse_element(
  gb: GraphBuilder,
  exp: ElementAst,
  context: ExpressionContext
): Expression {
  return {
    type: "element",
    type_id: gb.builtins.elem,
    name: exp.name,
    attributes: exp.attributes.map(attr => {
      const value = analyse_expression(gb, attr.value, {
        ...context,
        type_hint_id: gb.builtins.str
      });
      return { name: attr.name, value };
    }),
    // eslint-disable-next-line
    children: exp.children.map(child => {
      switch (child.type) {
        case "text":
          return child;

        case "expression":
          return {
            type: "expression",
            value: analyse_expression(gb, child.value, {
              ...context,
              type_hint_id: gb.builtins.str
            })
          };

        default:
          exhaustive(child);
      }
    })
  };
}
