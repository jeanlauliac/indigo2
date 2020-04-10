import { TokenReader } from "./TokenReader";
import { ExpressionAst, ElementChildAst } from "./UnitAst";
import { parse_expression } from "./parse_expression";
import { parse_string } from "./parse_string";

export function parse_element(tr: TokenReader): ExpressionAst | null {
  if (!tr.has_op("<")) return null;
  tr.forward();
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

  do {
    tr.token_mode = "xml_text";
    tr.forward();

    if (tr.has_op("<")) break;
    if (tr.token.type === "xml_text") {
      children.push({ type: "text", value: tr.token.value });
      continue;
    }
    if (tr.has_op("{")) {
      tr.forward();
      const value = parse_expression(tr);
      if (value == null) throw tr.token_err("expected expression");
      children.push({ type: "expression", value });
      if (!tr.has_op("}")) throw tr.token_err('expected "}"');
      continue;
    }
  } while (tr.token.type !== "end");

  if (!tr.has_op("<")) throw tr.token_err('expected "<"');
  tr.forward();
  if (!tr.has_op("/")) throw tr.token_err('expected "/"');
  tr.forward();
  const end_name = tr.get_identifier();
  tr.forward();
  if (name !== end_name)
    throw tr.token_err(
      `mismatched element name, expected "${name}" but got "${end_name}"`
    );

  if (!tr.has_op(">")) throw tr.token_err('expected ">"');
  tr.forward();

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
