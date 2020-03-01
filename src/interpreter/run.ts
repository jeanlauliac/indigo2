import { parse } from "./parse";
import { analyse, Expression } from "../analyse";
import { nullthrows } from "./nullthrows";

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
  if (exp.ast.type === "string") {
    return exp.ast.value;
  }
  throw new Error("unknown expression type");
}
