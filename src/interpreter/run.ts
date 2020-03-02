import { parse } from "./parse";
import { analyse, Expression } from "../analyse";
import { nullthrows } from "./nullthrows";
import { exhaustive } from "../exhaustive";

export function run(sourceCode: string, element: HTMLElement) {
  const ast = parse(sourceCode);
  const graph = analyse(ast);

  const entry = nullthrows(graph.functions.get(graph.entry_point_id));
  const value = evaluate_expression(nullthrows(entry.return_expression));

  element.innerHTML = value;

  // element.innerHTML = `<pre>${JSON.stringify(
  //   graph,
  //   (_, val) => {
  //     if (val instanceof Map) return [...val.entries()];
  //     return val;
  //   },
  //   2
  // )}</pre>`;
}

function evaluate_expression(exp: Expression) {
  const { ast } = exp;
  switch (ast.type) {
    case "string":
      return exp.ast.value;
    case "number":
      return exp.ast.value;
    default:
      exhaustive(ast);
  }
}
