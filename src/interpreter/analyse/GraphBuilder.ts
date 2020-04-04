import { Function, Type, Variable, Bitsize } from "./Graph";
import { nullthrows } from "../nullthrows";

export type BuiltinIDs = {
  void: number;
  str: number;
  u8: number;
  u16: number;
  u32: number;
  i8: number;
  i16: number;
  i32: number;
  elem: number;
  func: number;
};

export class GraphBuilder {
  next_ID: number = 1;
  funcs_by_name = new Map();
  types_by_name = new Map();
  types: Map<number, Type> = new Map();
  functions: Map<number, Function> = new Map();
  variables: Map<number, Variable> = new Map();
  builtins: BuiltinIDs;

  constructor() {
    this.builtins = {
      void: this.register_builtin_type({ type: "void", name: "void" }),
      str: this.register_builtin_type({ type: "string", name: "str" }),
      u8: this.register_builtin_type(int_type("u8", false, 8)),
      u16: this.register_builtin_type(int_type("u16", false, 16)),
      u32: this.register_builtin_type(int_type("u32", false, 32)),
      i8: this.register_builtin_type(int_type("i8", true, 8)),
      i16: this.register_builtin_type(int_type("i16", true, 16)),
      i32: this.register_builtin_type(int_type("i32", true, 32)),
      elem: this.register_builtin_type({ type: "element", name: "elem" }),
      func: this.register_builtin_type({ type: "function", name: "func" })
    };
  }

  register_builtin_type(type: Type) {
    const id = ++this.next_ID;
    this.types_by_name.set(type.name, id);
    this.types.set(id, type);
    return id;
  }

  resolve_type(name: string): number {
    const type_id = this.types_by_name.get(name);
    if (type_id == null) throw new Error(`unknown type "${name}"`);
    return type_id;
  }

  get_variable(id: number): Variable {
    return nullthrows(this.variables.get(id));
  }
}

function int_type(name: string, signed: boolean, bitsize: Bitsize): Type {
  return { type: "integer", name, signed, bitsize };
}
