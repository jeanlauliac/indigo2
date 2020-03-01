import { UnitAst, FunctionAst, ExpressionAst } from "./interpreter/parse";

export type Type = { type: "string" };
export type Function = {
  return_expression: Expression | null;
  return_type_id: number;
};

export type Expression = {
  ast: ExpressionAst;
  type_id: number;
};

type Graph = {
  types: Map<number, Type>;
  functions: Map<number, Function>;
  entry_point_id: number;
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
  builtins: { str: number };

  constructor() {
    this.builtins = {
      str: this.register_builtin_type("str", { type: "string" })
    };
  }

  register_builtin_type(name: string, type: Type) {
    const id = ++this.next_ID;
    this.types_by_name.set(name, id);
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
    const return_expression = this.analyse_expression(func.return_expression);

    if (return_expression && return_expression.type_id !== return_type_id) {
      throw new Error("return expression does not have correct type");
    }

    return { return_type_id, return_expression };
  }

  analyse_expression(exp: ExpressionAst | null): Expression | null {
    if (exp == null) return null;
    if (exp.type === "string") {
      return { ast: exp, type_id: this.builtins.str };
    }
    throw new Error("unknown expression type");
  }

  resolve_type(name: string): number {
    const type = this.types_by_name.get(name);
    if (type == null) throw new Error(`cannot find type "${name}"`);
    return type;
  }
}
