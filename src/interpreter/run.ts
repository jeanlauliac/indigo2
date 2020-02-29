import { parse } from "./parse";

export function run(sourceCode: string, element: HTMLElement) {
  const ast = parse(sourceCode);
  element.innerHTML = `<pre>${JSON.stringify(ast, null, 2)}</pre>`;
}
