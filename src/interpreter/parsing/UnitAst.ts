import { Location } from "../tokens/Token";

export type FunctionAst = {
  name: string;
  location: Location;
  return_type: string;
} & BlockAst;

export type StatementAst =
  | {
      type: "return";
      expression: ExpressionAst;
      location: Location;
    }
  | { type: "let"; initial_value: ExpressionAst; name: string }
  | { type: "expression"; expression: ExpressionAst };

export type ElementChildAst =
  | {
      type: "text";
      value: string;
    }
  | {
      type: "expression";
      value: ExpressionAst;
    };

type ElementAttributeAst = {
  name: string;
  value: ExpressionAst;
};

export type BlockAst = {
  statements: StatementAst[];
  return_expression: ExpressionAst | null;
};

export type StringAst = {
  value: string;
  location: Location;
};

export type NumberAst = {
  value: string;
  location: Location;
  data_type: string | null;
};

export type ElementAst = {
  name: string;
  children: ElementChildAst[];
  attributes: ElementAttributeAst[];
};

export type ReferenceAst = { identifier: string };
export type AssignmentAst = {
  target: ReferenceAst;
  value: ExpressionAst;
};

export type ExpressionAst =
  | ({ type: "string" } & StringAst)
  | ({ type: "number" } & NumberAst)
  | ({ type: "reference" } & ReferenceAst)
  | ({ type: "closure" } & BlockAst)
  | ({ type: "element" } & ElementAst)
  | ({ type: "assignment" } & AssignmentAst);

export type UnitAst = {
  functions: FunctionAst[];
};
