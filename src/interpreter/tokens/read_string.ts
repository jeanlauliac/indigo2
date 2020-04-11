import { CharReader } from "./CharReader";
import { Token } from "./Token";
import { IndigoError } from "../IndigoError";

export function read_string(cr: CharReader): Token | null {
  if (cr.chr() !== '"') return null;

  const location = cr.loc();
  cr.forward();

  let value = "";
  while (!cr.eos() && cr.chr() !== '"') {
    value += cr.chr();
    cr.forward();
  }
  cr.forward();

  if (cr.eos()) {
    throw new IndigoError("unterminated quoted string", {
      type: "parse",
      location,
    });
  }

  return { type: "string", value, location };
}
