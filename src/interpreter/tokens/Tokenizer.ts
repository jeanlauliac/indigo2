import {
  Token,
  OPERATORS,
  KEYWORDS,
  Operator,
  Keyword,
  is_alpha,
  is_numeric,
  ref,
  TokenMode,
  Ref
} from "./Token";
import { CharReader } from "./CharReader";
import { parse_number } from "./parse_number";
import { parse_string } from "./parse_string";
import { parse_xml_text } from "./parse_xml_text";

const PARTIAL_OPERATORS = (() => {
  const result = new Set();
  for (const op of OPERATORS) {
    for (let i = 1; i <= op.length; ++i) {
      result.add(op.substring(0, i));
    }
  }
  return result;
})();

export class Tokenizer {
  private readonly cr: CharReader;
  public token_mode: Ref<TokenMode> = ref("normal");

  constructor(source_code: string) {
    this.cr = new CharReader(source_code);
  }

  parse_token(): Token {
    if (this.token_mode.val === "xml_text") {
      return parse_xml_text(this.cr, this.token_mode);
    }

    do this.cr.discard_whitespace();
    while (this.discard_comment());
    const location = this.cr.loc();
    if (this.cr.eos()) {
      return { type: "end", location };
    }
    let token: Token | null;
    if ((token = this.parse_ident_or_keyword())) return token;
    if ((token = this.parse_operator())) return token;
    if ((token = parse_string(this.cr))) return token;
    if ((token = parse_number(this.cr))) return token;

    throw new Error(`unexpected character "${this.cr.chr()}"`);
  }

  private discard_comment(): boolean {
    if (
      this.cr.eos() ||
      this.cr.chr() !== "/" ||
      this.cr.position >= this.cr.source_code.length - 1 ||
      this.cr.source_code[this.cr.position + 1] !== "/"
    )
      return false;
    this.cr.forward();
    this.cr.forward();

    while (this.cr.chr() !== "\n") this.cr.forward();
    return true;
  }

  private parse_ident_or_keyword(): Token | null {
    if (!is_alpha(this.cr.chr())) return null;
    let location = this.cr.loc();
    let value = this.cr.chr();
    this.cr.forward();
    while (
      !this.cr.eos() &&
      (is_alpha(this.cr.chr()) || is_numeric(this.cr.chr()))
    ) {
      value += this.cr.chr();
      this.cr.forward();
    }
    if (KEYWORDS.has(value) === true) {
      return { type: "keyword", value: value as Keyword, location };
    }
    return { type: "identifier", name: value, location };
  }

  private parse_operator(): Token | null {
    if (!PARTIAL_OPERATORS.has(this.cr.chr())) return null;
    const location = this.cr.loc();
    let value = this.cr.chr();
    this.cr.forward();
    while (!this.cr.eos() && PARTIAL_OPERATORS.has(value + this.cr.chr())) {
      value += this.cr.chr();
      this.cr.forward();
    }
    if (!OPERATORS.has(value)) {
      throw new Error(`unknown operator "${value}"`);
    }
    return { type: "operator", value: value as Operator, location };
  }
}
