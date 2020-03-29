const KEYWORDS_OBJ = { fn: true, return: true, let: true };
export const KEYWORDS = new Set(Object.keys(KEYWORDS_OBJ));
export type Keyword = keyof typeof KEYWORDS_OBJ;

const OPERATORS_OBJ = {
  "-": true,
  "+": true,
  "*": true,
  "/": true,
  "=": true,
  "==": true,
  "(": true,
  ")": true,
  "{": true,
  "}": true,
  ";": true,
  ":": true,
  "->": true,
  "|": true,
  "||": true,
  "&": true,
  "&&": true,
  "<": true,
  ">": true
};

export const OPERATORS = new Set(Object.keys(OPERATORS_OBJ));
export type Operator = keyof typeof OPERATORS_OBJ;

export type Location = { row: number; column: number };
type Locatable = {
  location: Location;
};

export type Token = Locatable &
  (
    | {
        type: "identifier";
        name: string;
      }
    | {
        type: "string";
        value: string;
      }
    | { type: "number"; value: string; data_type: string | null }
    | {
        type: "keyword";
        value: Keyword;
      }
    | { type: "operator"; value: Operator }
    | { type: "xml_text"; value: string }
    | { type: "end" }
  );
