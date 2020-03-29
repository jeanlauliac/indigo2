import { IndigoError } from "../IndigoError";
import { Tokenizer } from "../tokens/Tokenizer";
import { Token, Keyword, Operator, TokenMode } from "../tokens/Token";

export class TokenReader {
  private tokenizer: Tokenizer;
  private token_: Token;

  constructor(source_code: string) {
    this.tokenizer = new Tokenizer(source_code);
    this.token_ = this.tokenizer.parse_token();
  }

  get token(): Readonly<Token> {
    return this.token_;
  }

  set token_mode(value: TokenMode) {
    this.tokenizer.token_mode.val = value;
  }

  forward() {
    this.token_ = this.tokenizer.parse_token();
  }

  has_kw(value: Keyword) {
    return this.token_.type === "keyword" && this.token_.value === value;
  }

  has_op(value: Operator) {
    return this.token_.type === "operator" && this.token_.value === value;
  }

  get_identifier(): string {
    if (this.token_.type !== "identifier")
      throw new Error("expected identifier");
    return this.token_.name;
  }

  token_err(message: string): Error {
    return new IndigoError(message, {
      type: "parse",
      location: this.token_.location
    });
  }
}
