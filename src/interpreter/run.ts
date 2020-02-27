import { parse } from "./parse";

export function run(sourceCode: string, element: HTMLElement) {
  const ast = parse(sourceCode);
  element.innerText = sourceCode;
}
