import { Token, TokenMode, Ref } from "./Token";
import { CharReader } from "./CharReader";

export function parse_xml_text(
  cr: CharReader,
  token_mode: Ref<TokenMode>
): Token {
  let has_front_space = cr.discard_whitespace();
  if (cr.eos()) {
    throw new Error("unexpected end of stream within XML text");
  }
  const location = cr.loc();
  if (cr.chr() === "<") {
    if (has_front_space) {
      return {
        type: "xml_text",
        value: "",
        location,
        has_front_space,
        has_trailing_space: false,
      };
    }
    cr.forward();
    token_mode.val = "normal";
    return { type: "operator", value: "<", location };
  }
  if (cr.chr() === "{") {
    if (has_front_space) {
      return {
        type: "xml_text",
        value: "",
        location,
        has_front_space,
        has_trailing_space: false,
      };
    }
    cr.forward();
    token_mode.val = "normal";
    return { type: "operator", value: "{", location };
  }
  let value = "";
  let has_trailing_space = false;
  while (!cr.eos() && !/^[{<]$/.test(cr.chr())) {
    if (has_trailing_space) value += " ";
    value += cr.chr();
    cr.forward();
    has_trailing_space = cr.discard_whitespace();
  }
  return {
    type: "xml_text",
    value,
    location,
    has_front_space,
    has_trailing_space,
  };
}
