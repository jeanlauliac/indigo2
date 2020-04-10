import { TokenReader } from "./TokenReader";
import { ExpressionAst } from "./UnitAst";

export function parse_string(tr: TokenReader): ExpressionAst {
  if (tr.token.type !== "string") throw new Error("wrong token");
  const { value, location } = tr.token;
  tr.forward();
  return { type: "string", value, location };
}
