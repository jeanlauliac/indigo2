import { parse } from "./parsing/parse";
import { analyse } from "./analyse/analyse";
import { nullthrows } from "./nullthrows";
import { exhaustive } from "./exhaustive";
import { Expression } from "./analyse/Graph";

type Closure = {
  function_id: number;
  scope: EvalScope;
};

type HtmlNode =
  | {
      type: "element";
      name: string;
      children: HtmlNode[];
      attributes: Map<string, string>;
      handlers: Map<string, Closure>;
    }
  | {
      type: "text";
      value: string;
    };

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
      value: HtmlNode;
    }
  | { type: "closure"; function_id: number; scope: EvalScope };

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

  element.appendChild(create_DOM_element(cast_to_node(returned)));
}

function create_DOM_element(node: HtmlNode): Node {
  switch (node.type) {
    case "element":
      const el = document.createElement(node.name);
      for (const child of node.children) {
        el.appendChild(create_DOM_element(child));
      }
      for (const [name, value] of node.attributes) {
        el.setAttribute(name, value);
      }
      return el;

    case "text":
      return document.createTextNode(node.value);

    default:
      exhaustive(node);
  }
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
      // const el = document.createElement(exp.name);
      const el: HtmlNode = {
        type: "element",
        name: exp.name,
        children: [],
        attributes: new Map(),
        handlers: new Map()
      };
      for (const child of exp.children) {
        switch (child.type) {
          case "text":
            // el.appendChild(document.createTextNode(child.value));
            el.children.push({ type: "text", value: child.value });
            break;

          case "expression":
            const value = evaluate_expression(child.value, context);
            el.children.push(cast_to_node(value));
            // el.appendChild(cast_to_element(value));
            break;

          default:
            exhaustive(child);
        }
      }
      for (const attr of exp.attributes) {
        const value = evaluate_expression(attr.value, context);
        if (value.type === "string") {
          el.attributes.set(attr.name, value.value);
        } else if (value.type === "integer") {
          el.attributes.set(attr.name, value.value.toString());
        } else if (value.type === "closure") {
          el.handlers.set(attr.name, {
            function_id: value.function_id,
            scope: value.scope
          });
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

    case "closure": {
      return {
        type: "closure",
        function_id: exp.function_id,
        scope: context.scope
      };
    }

    case "assignment": {
      const value = evaluate_expression(exp.value, context);
      // TODO: do the actual assignment
      return value;
    }

    default:
      exhaustive(exp);
  }
}

function cast_to_node(rv: RuntimeValue): HtmlNode {
  switch (rv.type) {
    case "string":
      return { type: "text", value: rv.value };

    case "integer":
      return { type: "text", value: rv.value.toString() };

    case "html_element":
      return rv.value;

    case "closure":
      return { type: "text", value: "<closure>" };

    default:
      exhaustive(rv);
  }
}
