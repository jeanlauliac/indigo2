const KEYWORDS_OBJ = { fn: true, return: true };
export const KEYWORDS = new Set(Object.keys(KEYWORDS_OBJ));
export type Keyword = keyof typeof KEYWORDS_OBJ;

const OPERATORS_OBJ = { "(": true, ")": true, "{": true, "}": true };
export const OPERATORS = new Set(Object.keys(OPERATORS_OBJ));
export type Operator = keyof typeof OPERATORS_OBJ;

export type Token =
  | {
      type: "identifier";
      name: string;
    }
  | {
      type: "string";
      value: string;
    }
  | {
      type: "keyword";
      value: Keyword;
    }
  | { type: "operator"; value: Operator }
  | { type: "end" };
