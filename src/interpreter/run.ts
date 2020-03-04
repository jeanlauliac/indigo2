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

  switch (returned.type) {
    case "string":
      element.innerText = returned.value;
      break;

    case "integer":
      element.innerText = returned.value.toString();
      break;

    case "html_element":
      element.appendChild(returned.value);
      break;

    default:
      exhaustive(returned);
  }

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
        el.appendChild(document.createTextNode(child.value));
      }
      return { type: "html_element", value: el };

    default:
      exhaustive(exp);
  }
}
