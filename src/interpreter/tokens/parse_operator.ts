import { Token, Operator, OPERATORS } from "./Token";
import { CharReader } from "./CharReader";

const PARTIAL_OPERATORS = (() => {
  const result = new Set();
  for (const op of OPERATORS) {
    for (let i = 1; i <= op.length; ++i) {
      result.add(op.substring(0, i));
    }
  }
  return result;
})();

export function parse_operator(cr: CharReader): Token | null {
  if (!PARTIAL_OPERATORS.has(cr.chr())) return null;
  const location = cr.loc();
  let value = cr.chr();
  cr.forward();
  while (!cr.eos() && PARTIAL_OPERATORS.has(value + cr.chr())) {
    value += cr.chr();
    cr.forward();
  }
  if (!OPERATORS.has(value)) {
    throw new Error(`unknown operator "${value}"`);
  }
  return { type: "operator", value: value as Operator, location };
}
