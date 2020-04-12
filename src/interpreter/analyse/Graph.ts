import { ExpressionAst } from "../parsing/UnitAst";

export type Graph = {
  types: Map<number, Type>;
  functions: Map<number, Function>;
  entry_point_id: number;
};

export type ElementChild =
  | {
      type: "text";
      value: string;
    }
  | {
      type: "expression";
      value: Expression;
    };

type ElementAttribute = {
  name: string;
  value: Expression;
};

export type Typed = { type_id: number };

export type Expression = Typed &
  (
    | { type: "string"; value: string }
    | { type: "integer"; value: number }
    | {
        type: "element";
        name: string;
        children: ElementChild[];
        attributes: ElementAttribute[];
      }
    | { type: "reference"; variable_id: number }
    | {
        type: "closure";
        function_id: number;
      }
    | {
        type: "assignment";
        target_id: number;
        value: Expression;
      }
    | { type: "function_call"; target: Expression; arguments: Expression[] }
  );

export type Block = {
  statements: Statement[];
  return_expression: Expression | null;
};

export type Bitsize = 8 | 16 | 32;
export type Named = { name: string };
export type Type = Named &
  (
    | { type: "void" }
    | { type: "string" }
    | { type: "integer"; signed: boolean; bitsize: Bitsize }
    | { type: "element" }
    | { type: "function" }
  );

export type Statement = {
  type: "let";
  initial_value: Expression;
  name: string;
  variable_id: number;
};

export type Argument = {
  name: string;
  type_id: number;
  variable_id: number;
};

export type Function = {
  arguments: Argument[];
  return_type_id: number;
} & Block;

export type Variable = {
  name: string;
  type_id: number;
  function_id: number;
};
