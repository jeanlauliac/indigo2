import { Location } from "./Token";

const SPACE_REGEX = /^[ \t\n]$/;

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

  discard_whitespace(): boolean {
    let did_discard = false;
    while (!this.eos() && SPACE_REGEX.test(this.chr())) {
      did_discard = true;
      this.forward();
    }
    return did_discard;
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
