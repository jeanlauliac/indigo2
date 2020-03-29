import { Token, is_numeric } from "./Token";
import { CharReader } from "./CharReader";

export function parse_number(cr: CharReader): Token | null {
  if (!is_numeric(cr.chr())) return null;

  const location = cr.loc();
  let value = cr.chr();
  cr.forward();

  while (!cr.eos() && is_numeric(cr.chr())) {
    value += cr.chr();
    cr.forward();
    if (!cr.eos() && cr.chr() === "_") cr.forward();
  }

  let data_type = null;
  if (cr.chr() === "i" || cr.chr() === "u") {
    data_type = cr.chr();
    cr.forward();
    if (!is_numeric(cr.chr())) throw new Error("expected number bitsize");
    while (is_numeric(cr.chr())) {
      data_type += cr.chr();
      cr.forward();
    }
  }

  return { type: "number", value, location, data_type };
}
