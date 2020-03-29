import {
  Token,
  OPERATORS,
  Location,
  KEYWORDS,
  Operator,
  Keyword
} from "./Token";
import { IndigoError } from "../IndigoError";

export type TokenMode = "normal" | "xml_text";

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
  readonly source_code: string;
  private position: number = 0;
  private location: Location = { row: 1, column: 1 };

  public token_mode: TokenMode = "normal";

  constructor(source_code: string) {
    this.source_code = source_code;
  }

  parse_token(): Token {
    if (this.token_mode === "xml_text") return this.parse_xml_text();
    do this.discard_whitespace();
    while (this.discard_comment());
    const location = this.loc();
    if (this.eos()) {
      return { type: "end", location };
    }
    let token: Token | null;
    if ((token = this.parse_ident_or_keyword())) return token;
    if ((token = this.parse_operator())) return token;
    if ((token = this.parse_string())) return token;
    if ((token = this.parse_number())) return token;

    throw new Error(`unexpected character "${this.chr()}"`);
  }

  private parse_xml_text(): Token {
    this.discard_whitespace();
    if (this.eos()) {
      throw new Error("unexpected end of stream within XML text");
    }
    const location = this.loc();
    if (this.chr() === "<") {
      this.forward();
      this.token_mode = "normal";
      return { type: "operator", value: "<", location };
    }
    if (this.chr() === "{") {
      this.forward();
      this.token_mode = "normal";
      return { type: "operator", value: "{", location };
    }
    let value = "";
    let needs_space = false;
    while (!this.eos() && !/^[{<]$/.test(this.chr())) {
      if (needs_space) value += " ";
      needs_space = false;
      value += this.chr();
      this.forward();
      if (/^[ \t\n]$/.test(this.chr())) {
        needs_space = true;
        this.discard_whitespace();
        continue;
      }
    }
    if (this.chr() === "{" && needs_space) {
      value += " ";
    }
    return { type: "xml_text", value, location };
  }

  private discard_comment(): boolean {
    if (
      this.eos() ||
      this.chr() !== "/" ||
      this.position >= this.source_code.length - 1 ||
      this.source_code[this.position + 1] !== "/"
    )
      return false;
    this.forward();
    this.forward();

    while (this.chr() !== "\n") this.forward();
    return true;
  }

  private discard_whitespace() {
    while (!this.eos() && /^[ \t\n]$/.test(this.chr())) this.forward();
  }

  private parse_ident_or_keyword(): Token | null {
    if (!is_alpha(this.chr())) return null;
    let location = this.loc();
    let value = this.chr();
    this.forward();
    while (!this.eos() && (is_alpha(this.chr()) || is_numeric(this.chr()))) {
      value += this.chr();
      this.forward();
    }
    if (KEYWORDS.has(value) === true) {
      return { type: "keyword", value: value as Keyword, location };
    }
    return { type: "identifier", name: value, location };
  }

  private parse_operator(): Token | null {
    if (!PARTIAL_OPERATORS.has(this.chr())) return null;
    const location = this.loc();
    let value = this.chr();
    this.forward();
    while (!this.eos() && PARTIAL_OPERATORS.has(value + this.chr())) {
      value += this.chr();
      this.forward();
    }
    if (!OPERATORS.has(value)) {
      throw new Error(`unknown operator "${value}"`);
    }
    return { type: "operator", value: value as Operator, location };
  }

  private parse_string(): Token | null {
    if (this.chr() !== '"') return null;
    const location = this.loc();
    this.forward();
    let value = "";
    while (!this.eos() && this.chr() !== '"') {
      value += this.chr();
      this.forward();
    }
    this.forward();
    if (this.eos())
      throw new IndigoError("unterminated quoted string", {
        type: "parse",
        location
      });
    return { type: "string", value, location };
  }

  private parse_number(): Token | null {
    if (!is_numeric(this.chr())) return null;
    const location = this.loc();
    let value = this.chr();
    this.forward();
    while (!this.eos() && is_numeric(this.chr())) {
      value += this.chr();
      this.forward();
      if (!this.eos() && this.chr() === "_") this.forward();
    }
    let data_type = null;
    if (this.chr() === "i" || this.chr() === "u") {
      data_type = this.chr();
      this.forward();
      if (!is_numeric(this.chr())) throw new Error("expected number bitsize");
      while (is_numeric(this.chr())) {
        data_type += this.chr();
        this.forward();
      }
    }
    return { type: "number", value, location, data_type };
  }

  private eos() {
    return this.position >= this.source_code.length;
  }

  private chr() {
    if (this.position >= this.source_code.length)
      throw new Error("reached end of file");
    return this.source_code[this.position];
  }

  private loc(): Location {
    return { ...this.location };
  }

  private forward() {
    if (this.chr() === "\n") {
      ++this.location.row;
      this.location.column = 1;
    } else {
      ++this.location.column;
    }
    ++this.position;
  }
}

function is_alpha(char: string) {
  return /^[a-zA-Z_]$/.test(char);
}

function is_numeric(char: string) {
  return /^[0-9]$/.test(char);
}
