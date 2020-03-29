import { Location } from "./Token";

export class CharReader {
  readonly source_code: string;
  private _position: number = 0;
  private location: Location = { row: 1, column: 1 };

  constructor(source_code: string) {
    this.source_code = source_code;
  }

  get position() {
    return this._position;
  }

  discard_whitespace() {
    while (!this.eos() && /^[ \t\n]$/.test(this.chr())) this.forward();
  }

  eos() {
    return this._position >= this.source_code.length;
  }

  chr() {
    if (this._position >= this.source_code.length)
      throw new Error("reached end of file");
    return this.source_code[this._position];
  }

  loc(): Location {
    return { ...this.location };
  }

  forward() {
    if (this.chr() === "\n") {
      ++this.location.row;
      this.location.column = 1;
    } else {
      ++this.location.column;
    }
    ++this._position;
  }
}
