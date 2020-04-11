import { Token, ref, TokenMode, Ref } from "./Token";
import { CharReader } from "./CharReader";
import { read_number } from "./read_number";
import { read_string } from "./read_string";
import { read_xml_text } from "./read_xml_text";
import { read_ident_or_keyword } from "./read_ident_or_keyword";
import { read_operator } from "./read_operator";

export class Tokenizer {
  private readonly cr: CharReader;
  public token_mode: Ref<TokenMode> = ref("normal");

  constructor(source_code: string) {
    this.cr = new CharReader(source_code);
  }

  read_token(): Token {
    if (this.token_mode.val === "xml_text") {
      return read_xml_text(this.cr, this.token_mode);
    }

    do this.cr.discard_whitespace();
    while (this.discard_comment());
    const location = this.cr.loc();
    if (this.cr.eos()) {
      return { type: "end", location };
    }
    let token: Token | null;
    if ((token = read_ident_or_keyword(this.cr))) return token;
    if ((token = read_operator(this.cr))) return token;
    if ((token = read_string(this.cr))) return token;
    if ((token = read_number(this.cr))) return token;

    throw new Error(`unexpected character "${this.cr.chr()}"`);
  }

  private discard_comment(): boolean {
    if (this.cr.eos() || this.cr.chr() !== "/") return false;
    if (this.cr.position + 1 >= this.cr.source_code.length) return false;

    if (this.cr.source_code[this.cr.position + 1] === "/") {
      this.cr.forward();
      this.cr.forward();

      while (this.cr.chr() !== "\n") this.cr.forward();
      return true;
    }

    if (this.cr.source_code[this.cr.position + 1] === "*") {
      this.cr.forward();
      this.cr.forward();

      let nesting = 1;
      while (this.cr.position + 1 < this.cr.source_code.length && nesting > 0) {
        if (
          this.cr.chr() === "*" &&
          this.cr.source_code[this.cr.position + 1] === "/"
        ) {
          --nesting;
          this.cr.forward();
        }

        if (
          this.cr.chr() === "/" &&
          this.cr.source_code[this.cr.position + 1] === "*"
        ) {
          ++nesting;
          this.cr.forward();
        }

        this.cr.forward();
      }
      return true;
    }

    return false;
  }
}
