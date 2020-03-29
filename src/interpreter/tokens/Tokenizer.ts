import { Token, ref, TokenMode, Ref } from "./Token";
import { CharReader } from "./CharReader";
import { parse_number } from "./parse_number";
import { parse_string } from "./parse_string";
import { parse_xml_text } from "./parse_xml_text";
import { parse_ident_or_keyword } from "./parse_ident_or_keyword";
import { parse_operator } from "./parse_operator";

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
    if ((token = parse_ident_or_keyword(this.cr))) return token;
    if ((token = parse_operator(this.cr))) return token;
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
}
