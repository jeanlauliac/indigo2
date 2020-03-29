import { Token, TokenMode, Ref } from "./Token";
import { CharReader } from "./CharReader";

export function parse_xml_text(
  cr: CharReader,
  token_mode: Ref<TokenMode>
): Token {
  cr.discard_whitespace();
  if (cr.eos()) {
    throw new Error("unexpected end of stream within XML text");
  }
  const location = cr.loc();
  if (cr.chr() === "<") {
    cr.forward();
    token_mode.val = "normal";
    return { type: "operator", value: "<", location };
  }
  if (cr.chr() === "{") {
    cr.forward();
    token_mode.val = "normal";
    return { type: "operator", value: "{", location };
  }
  let value = "";
  let needs_space = false;
  while (!cr.eos() && !/^[{<]$/.test(cr.chr())) {
    if (needs_space) value += " ";
    needs_space = false;
    value += cr.chr();
    cr.forward();
    if (/^[ \t\n]$/.test(cr.chr())) {
      needs_space = true;
      cr.discard_whitespace();
      continue;
    }
  }
  if (cr.chr() === "{" && needs_space) {
    value += " ";
  }
  return { type: "xml_text", value, location };
}
