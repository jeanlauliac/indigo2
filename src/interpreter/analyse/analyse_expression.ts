import {
  ExpressionAst,
  NumberAst,
  ElementAst,
  Block
} from "../parsing/UnitAst";
import { nullthrows } from "../nullthrows";
import { GraphBuilder } from "./GraphBuilder";
import { exhaustive } from "../exhaustive";
import { analyse_statement } from "./analyse_statement";
import { Expression } from "./Graph";

export type ExpressionContext = {
  type_hint_id: number | null;
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

    default:
      exhaustive(exp);
  }
}

function analyse_number(
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
        type_hint_id: gb.builtins.str,
        scope: context.scope
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
              type_hint_id: gb.builtins.str,
              scope: context.scope
            })
          };

        default:
          exhaustive(child);
      }
    })
  };
}

function analyse_closure(
  gb: GraphBuilder,
  exp: Block,
  context: ExpressionContext
): Expression {
  const return_expression =
    exp.return_expression &&
    analyse_expression(gb, exp.return_expression, context);

  const return_type_id =
    return_expression != null ? return_expression.type_id : gb.builtins.void;

  const function_id = gb.next_ID++;
  gb.functions.set(function_id, {
    statements: exp.statements.map(st_ast =>
      analyse_statement(gb, st_ast, context.scope)
    ),
    return_expression,
    return_type_id
  });

  return { type: "closure", function_id, type_id: return_type_id };
}

function resolve_reference(identifier: string, scope: Scope | null): number {
  let id;
  while (id == null && scope != null) {
    id = scope.vars_by_name.get(identifier);
    scope = scope.outer;
  }
  if (id == null) throw new Error(`could not find "${identifier}" in scope`);
  return id;
}
