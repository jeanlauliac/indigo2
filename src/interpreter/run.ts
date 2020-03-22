import { parse } from "./parse";
import { analyse, Expression } from "./analyse";
import { nullthrows } from "./nullthrows";
import { exhaustive } from "./exhaustive";

type RuntimeValue =
  | {
      type: "string";
      value: string;
    }
  | {
      type: "integer";
      value: number;
    }
  | {
      type: "html_element";
      value: HTMLElement;
    };

type EvalScope = {
  outer: EvalScope | null;
  values_by_id: Map<number, RuntimeValue>;
};

type EvalContext = {
  scope: EvalScope;
};

export function run(sourceCode: string, element: HTMLElement) {
  const ast = parse(sourceCode);
  const graph = analyse(ast);

  const entry = nullthrows(graph.functions.get(graph.entry_point_id));
  const scope = { outer: null, values_by_id: new Map() };

  for (const statement of entry.statements) {
    switch (statement.type) {
      case "let":
        scope.values_by_id.set(
          statement.variable_id,
          evaluate_expression(statement.initial_value, { scope })
        );
        break;
    }
  }

  const returned = evaluate_expression(nullthrows(entry.return_expression), {
    scope
  });

  element.appendChild(cast_to_element(returned));
}

function evaluate_expression(
  exp: Expression,
  context: EvalContext
): RuntimeValue {
  switch (exp.type) {
    case "string":
      return { type: "string", value: exp.value };

    case "integer":
      return { type: "integer", value: exp.value };

    case "element":
      const el = document.createElement(exp.name);
      for (const child of exp.children) {
        switch (child.type) {
          case "text":
            el.appendChild(document.createTextNode(child.value));
            break;

          case "expression":
            const value = evaluate_expression(child.value, context);
            el.appendChild(cast_to_element(value));
            break;

          default:
            exhaustive(child);
        }
      }
      for (const attr of exp.attributes) {
        const value = evaluate_expression(attr.value, context);
        if (value.type === "string") {
          el.setAttribute(attr.name, value.value);
        } else if (value.type === "integer") {
          el.setAttribute(attr.name, value.value.toString());
        } else {
          throw new Error("cannot set element as attribute value");
        }
      }
      return { type: "html_element", value: el };

    case "reference": {
      let value,
        scope: EvalScope | null = context.scope;
      while (value == null && scope != null) {
        value = scope.values_by_id.get(exp.variable_id);
        scope = scope.outer;
      }
      if (value == null)
        throw new Error(`could not find ID "${exp.variable_id}" in scope`);
      return value;
    }

    default:
      exhaustive(exp);
  }
}

function cast_to_element(rv: RuntimeValue) {
  switch (rv.type) {
    case "string":
      return document.createTextNode(rv.value);

    case "integer":
      return document.createTextNode(rv.value.toString());

    case "html_element":
      return rv.value;

    default:
      exhaustive(rv);
  }
}
