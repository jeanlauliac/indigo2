import { UnitAst, FunctionAst, ExpressionAst, ElementChild } from "./parse";
import { nullthrows } from "./nullthrows";
import { exhaustive } from "./exhaustive";

type Bitsize = 8 | 16 | 32;
type Named = { name: string };
export type Type = Named &
  (
    | { type: "string" }
    | { type: "integer"; signed: boolean; bitsize: Bitsize }
    | { type: "element" }
  );

export type Function = {
  return_expression: Expression | null;
  return_type_id: number;
};

export type Typed = { ast: ExpressionAst; type_id: number };

export type Expression = Typed &
  (
    | { type: "string"; value: string }
    | { type: "integer"; value: number }
    | { type: "element"; name: string; children: ElementChild[] }
  );

type Graph = {
  types: Map<number, Type>;
  functions: Map<number, Function>;
  entry_point_id: number;
};

type ExpressionContext = {
  type_hint_id: number | null;
};

export function analyse(unit: UnitAst): Graph {
  const al = new Analyser();
  al.analyse_unit(unit);

  return {
    types: al.types,
    functions: al.functions,
    entry_point_id: al.funcs_by_name.get("main")[0]
  };
}

class Analyser {
  next_ID: number = 1;
  funcs_by_name = new Map();
  types_by_name = new Map();
  types: Map<number, Type> = new Map();
  functions: Map<number, Function> = new Map();
  builtins: {
    str: number;
    u8: number;
    u16: number;
    u32: number;
    i8: number;
    i16: number;
    i32: number;
    elem: number;
  };

  constructor() {
    this.builtins = {
      str: this.register_builtin_type({ type: "string", name: "str" }),
      u8: this.register_builtin_type(int_type("u8", false, 8)),
      u16: this.register_builtin_type(int_type("u16", false, 16)),
      u32: this.register_builtin_type(int_type("u32", false, 32)),
      i8: this.register_builtin_type(int_type("i8", true, 8)),
      i16: this.register_builtin_type(int_type("i16", true, 16)),
      i32: this.register_builtin_type(int_type("i32", true, 32)),
      elem: this.register_builtin_type({ type: "element", name: "elem" })
    };
  }

  register_builtin_type(type: Type) {
    const id = ++this.next_ID;
    this.types_by_name.set(type.name, id);
    this.types.set(id, type);
    return id;
  }

  analyse_unit(unit: UnitAst) {
    for (const func of unit.functions) {
      this.funcs_by_name.set(func.name, [this.next_ID++, func]);
    }

    for (const [id, func] of this.funcs_by_name.values()) {
      this.functions.set(id, this.analyse_function(func));
    }
  }

  analyse_function(func: FunctionAst): Function {
    const return_type_id = this.resolve_type(func.return_type);
    const return_expression = this.analyse_expression(func.return_expression, {
      type_hint_id: return_type_id
    });

    if (return_expression && return_expression.type_id !== return_type_id) {
      const expected_type = nullthrows(this.types.get(return_type_id)).name;
      const actual_type = nullthrows(this.types.get(return_expression.type_id))
        .name;
      throw new Error(
        `expected return expression to be of type "${expected_type}", ` +
          `but got type "${actual_type}"`
      );
    }

    return { return_type_id, return_expression };
  }

  analyse_expression(
    exp: ExpressionAst | null,
    context: ExpressionContext
  ): Expression | null {
    if (exp == null) return null;
    switch (exp.type) {
      case "string":
        return {
          type: "string",
          ast: exp,
          type_id: this.builtins.str,
          value: exp.value
        };

      case "number": {
        let type_id = context.type_hint_id;
        if (exp.data_type != null) type_id = this.resolve_type(exp.data_type);
        if (type_id == null) throw new Error("unknown integer type");
        const type = nullthrows(this.types.get(type_id));
        if (type.type !== "integer")
          throw new Error(`"${type.type}" is not numeric`);
        let max_value = Math.pow(2, type.bitsize) - 1;
        let min_value = 0;
        if (type.signed) {
          min_value = -(max_value + 1) / 2;
          max_value = -min_value - 1;
        }
        const value = parseInt(exp.value);
        if (value > max_value) {
          throw new Error("integer literal is too large for this type");
        }
        if (value < min_value) {
          throw new Error("integer literal is too large for this type");
        }

        return { type: "integer", ast: exp, type_id, value };
      }

      case "element": {
        return {
          type: "element",
          ast: exp,
          type_id: this.builtins.elem,
          name: exp.name,
          children: exp.children
        };
      }

      default:
        exhaustive(exp);
    }
  }

  resolve_type(name: string): number {
    const type_id = this.types_by_name.get(name);
    if (type_id == null) throw new Error(`unknown type "${name}"`);
    return type_id;
  }
}

function int_type(name: string, signed: boolean, bitsize: Bitsize): Type {
  return { type: "integer", name, signed, bitsize };
}
