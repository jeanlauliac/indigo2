import { TokenReader } from "./TokenReader";
import { StatementAst, BlockAst } from "./UnitAst";
import { parse_statement } from "./parse_statement";
import { parse_expression } from "./parse_expression";

export function parse_block(tr: TokenReader): BlockAst | null {
  if (!tr.has_op("{")) return null;
  tr.forward();

  const statements: StatementAst[] = [];
  let return_expression = null;

  while (tr.token.type !== "end" && !tr.has_op("}")) {
    let statement;
    if ((statement = parse_statement(tr))) {
      if (!tr.has_op(";")) throw tr.token_err('expected operator ";"');
      tr.forward();
      statements.push(statement);
      continue;
    }

    const expression = parse_expression(tr);
    if (expression == null) throw tr.token_err("unexpected token");

    if (tr.has_op(";")) {
      tr.forward();
      statements.push({ type: "expression", expression });
    } else if (tr.has_op("}")) {
      return_expression = expression;
    } else {
      throw new Error('expected ";" or "}" after expression');
    }
  }

  if (!tr.has_op("}")) throw tr.token_err('expected operator "}"');
  tr.forward();

  return { statements, return_expression };
}
