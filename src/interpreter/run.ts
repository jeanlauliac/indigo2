import { parse } from "./parse";
import { analyse } from "../analyse";

export function run(sourceCode: string, element: HTMLElement) {
  const ast = parse(sourceCode);
  const graph = analyse(ast);

  element.innerHTML = `<pre>${JSON.stringify(
    graph,
    (_, val) => {
      if (val instanceof Map) return [...val.entries()];
      return val;
    },
    2
  )}</pre>`;
}
