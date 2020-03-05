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

export function run(sourceCode: string, element: HTMLElement) {
  const ast = parse(sourceCode);
  const graph = analyse(ast);

  const entry = nullthrows(graph.functions.get(graph.entry_point_id));
  const returned = evaluate_expression(nullthrows(entry.return_expression));

  element.appendChild(cast_to_element(returned));

  // element.innerHTML = `<pre>${JSON.stringify(
  //   graph,
  //   (_, val) => {
  //     if (val instanceof Map) return [...val.entries()];
  //     return val;
  //   },
  //   2
  // )}</pre>`;
}

function evaluate_expression(exp: Expression): RuntimeValue {
  const { ast } = exp;
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
            const value = evaluate_expression(child.value);
            el.appendChild(cast_to_element(value));
            break;

          default:
            exhaustive(child);
        }
      }
      return { type: "html_element", value: el };

    default:
      exhaustive(exp);
  }
}

function cast_to_element(rv: RuntimeValue) {
  switch (rv.type) {
    case "string":
      return document.createTextNode(rv.value);
      break;

    case "integer":
      return document.createTextNode(rv.value.toString());
      break;

    case "html_element":
      return rv.value;
      break;

    default:
      exhaustive(rv);
  }
}
