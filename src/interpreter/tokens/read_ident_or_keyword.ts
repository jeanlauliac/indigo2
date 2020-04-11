import { Token, is_alpha, is_numeric, Keyword, KEYWORDS } from "./Token";
import { CharReader } from "./CharReader";

export function read_ident_or_keyword(cr: CharReader): Token | null {
  if (!is_alpha(cr.chr())) return null;

  let location = cr.loc();
  let value = cr.chr();
  cr.forward();

  while (!cr.eos() && (is_alpha(cr.chr()) || is_numeric(cr.chr()))) {
    value += cr.chr();
    cr.forward();
  }

  if (KEYWORDS.has(value) === true) {
    return { type: "keyword", value: value as Keyword, location };
  }

  return { type: "identifier", name: value, location };
}
