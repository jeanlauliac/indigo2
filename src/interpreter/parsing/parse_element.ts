import { TokenReader } from "./TokenReader";
import { ExpressionAst, ElementChildAst } from "./UnitAst";
import { parse_expression } from "./parse_expression";
import { parse_string } from "./parse_string";

export function parse_element(tr: TokenReader): ExpressionAst | null {
  if (!tr.has_op("<")) return null;
  tr.forward();
  const exp = parse_element_body(tr);
  tr.forward();
  return exp;
}

function parse_element_body(tr: TokenReader): ExpressionAst {
  const name = tr.get_identifier();
  tr.forward();
  const attributes = [];
  while (tr.token.type === "identifier") {
    const attr_name = tr.get_identifier();
    tr.forward();
    if (!tr.has_op("=")) throw tr.token_err('expected "="');
    tr.forward();
    const attr_value = parse_attribute_value(tr);

    attributes.push({ name: attr_name, value: attr_value });
  }
  if (!tr.has_op(">")) throw tr.token_err('expected ">"');

  const children: ElementChildAst[] = [];
  let pending_text: { value: string; has_trailing_space: boolean } | void;

  const process_pending_text = () => {
    if (pending_text == null) return;
    if (pending_text.has_trailing_space) pending_text.value += " ";
    children.push({ type: "text", value: pending_text.value });
    pending_text = undefined;
  };

  do {
    tr.token_mode = "xml_text";
    tr.forward();

    if (tr.token.type === "xml_text") {
      let { value, has_front_space, has_trailing_space } = tr.token;
      if (children.length > 0 && has_front_space) {
        value = " " + value;
      }
      if (pending_text == null) {
        pending_text = { value, has_trailing_space };
        continue;
      }
      if (pending_text.has_trailing_space) {
        pending_text.value += " ";
      }
      pending_text.value += value;
      pending_text.has_trailing_space = has_trailing_space;
      continue;
    }

    if (tr.has_op("<")) {
      tr.forward();
      if (tr.has_op("/")) break;
      process_pending_text();
      children.push({ type: "expression", value: parse_element_body(tr) });
      continue;
    }

    if (tr.has_op("{")) {
      tr.forward();
      if (tr.has_op("}")) {
        continue;
      }
      const value = parse_expression(tr);
      if (value == null) throw tr.token_err("expected expression");
      process_pending_text();
      children.push({ type: "expression", value });
      if (!tr.has_op("}")) throw tr.token_err('expected "}"');
      continue;
    }
  } while (tr.token.type !== "end");

  if (pending_text != null) {
    children.push({ type: "text", value: pending_text.value });
  }

  if (!tr.has_op("/")) throw tr.token_err('expected "/"');
  tr.forward();
  const end_name = tr.get_identifier();
  tr.forward();
  if (name !== end_name)
    throw tr.token_err(
      `mismatched element name, expected "${name}" but got "${end_name}"`
    );

  if (!tr.has_op(">")) throw tr.token_err('expected ">"');

  return { type: "element", name, children, attributes };
}

function parse_attribute_value(tr: TokenReader): ExpressionAst {
  if (tr.token.type === "string") {
    return parse_string(tr);
  }
  if (!tr.has_op("{")) throw tr.token_err('expected "{"');
  tr.forward();
  const attr_value = parse_expression(tr);
  if (attr_value == null) throw tr.token_err("expected expression");
  if (!tr.has_op("}")) throw tr.token_err('expected "}"');
  tr.forward();
  return attr_value;
}
