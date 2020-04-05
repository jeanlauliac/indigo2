import { parse } from "./parsing/parse";
import { analyse } from "./analyse/analyse";
import { nullthrows } from "./nullthrows";
import { exhaustive } from "./exhaustive";
import { Expression, Graph } from "./analyse/Graph";

type Closure = {
  function_id: number;
  scope: EvalScope;
};

type RuntimeElement = {
  name: string;
  children: EvalResult[];
  attributes: Map<string, string>;
  event_listeners: Map<string, Closure>;
};

type RuntimeValue =
  | { type: "void" }
  | {
      type: "string";
      value: string;
    }
  | {
      type: "integer";
      value: number;
    }
  | ({
      type: "element";
    } & RuntimeElement)
  | { type: "closure"; function_id: number; scope: EvalScope };

type Subscriber<T> = (new_value: T) => void;
class Dynamic<T> {
  private value_: T;
  private subscribers: Map<{}, Subscriber<T>> = new Map();

  constructor(init_value: T) {
    this.value_ = init_value;
  }

  subscribe(
    subscriber: Subscriber<T>
  ): { initial_value: T; release: () => void } {
    const token = {};
    this.subscribers.set(token, subscriber);
    return {
      initial_value: this.value_,
      release: () => {
        this.subscribers.delete(token);
      }
    };
  }

  set(new_value: T) {
    this.value_ = new_value;
    this.subscribers.forEach(sb => sb(new_value));
  }
}

class DynamicValue extends Dynamic<RuntimeValue> {}

type EvalResult =
  | {
      type: "static";
      value: RuntimeValue;
    }
  | { type: "dynamic"; value: DynamicValue };

const NO_OP = () => {};
class Variable {
  private value_: DynamicValue;
  private release_previous: () => void;

  constructor(result: EvalResult) {
    switch (result.type) {
      case "static": {
        this.release_previous = NO_OP;
        this.value_ = new DynamicValue(result.value);
        break;
      }

      case "dynamic": {
        const { initial_value, release } = result.value.subscribe(this.update);
        this.release_previous = release;
        this.value_ = new DynamicValue(initial_value);
        break;
      }

      default:
        exhaustive(result);
    }
  }

  get value() {
    return this.value_;
  }

  private update = (new_value: RuntimeValue) => {
    this.value_.set(new_value);
  };

  assign(result: EvalResult) {
    this.release_previous();

    switch (result.type) {
      case "static": {
        this.release_previous = NO_OP;
        this.value_.set(result.value);
        break;
      }

      case "dynamic": {
        const { initial_value, release } = result.value.subscribe(this.update);
        this.release_previous = release;
        this.value_.set(initial_value);
        break;
      }

      default:
        exhaustive(result);
    }
  }
}

type EvalScope = {
  outer: EvalScope | null;
  variables_by_id: Map<number, Variable>;
};

type EvalContext = {
  scope: EvalScope;
};

const VOID: EvalResult = static_of({ type: "void" });

export function run(sourceCode: string, element: HTMLElement) {
  const ast = parse(sourceCode);
  const graph = analyse(ast);

  const returned = evaluate_function(graph, graph.entry_point_id, null);
  element.appendChild(create_DOM_node(graph, returned));
}

function evaluate_function(
  graph: Graph,
  function_id: number,
  outer_scope: EvalScope | null
): EvalResult {
  const func = nullthrows(graph.functions.get(function_id));
  const scope: EvalScope = { outer: outer_scope, variables_by_id: new Map() };

  for (const statement of func.statements) {
    switch (statement.type) {
      case "let": {
        const result = evaluate_expression(statement.initial_value, { scope });
        scope.variables_by_id.set(statement.variable_id, new Variable(result));
        break;
      }
    }
  }

  if (func.return_expression == null) return VOID;

  const context = { scope };
  return evaluate_expression(func.return_expression, context);
}

function create_DOM_element(graph: Graph, value: RuntimeElement): HTMLElement {
  const el = document.createElement(value.name);
  for (const child of value.children) {
    el.appendChild(create_DOM_node(graph, child));
  }
  for (const [name, attr_val] of value.attributes) {
    el.setAttribute(name, attr_val);
  }
  for (const [name, closure] of value.event_listeners) {
    el.addEventListener(name, () => {
      evaluate_function(graph, closure.function_id, closure.scope);
    });
  }

  return el;
}

function create_DOM_node(graph: Graph, result: EvalResult): Node {
  let el:
    | { type: "element"; value: HTMLElement }
    | { type: "text"; value: Text };

  const value = (() => {
    if (result.type === "static") return result.value;
    return result.value.subscribe(new_value => {
      const set_text = (str: string) => {
        if (el.type === "text") {
          el.value.textContent = str;
          return;
        }
        const node = document.createTextNode(str);
        el.value.replaceWith(node);
        el = { type: "text", value: node };
      };

      switch (new_value.type) {
        case "element":
          const new_el = create_DOM_element(graph, new_value);
          el.value.replaceWith(new_el);
          el = { type: "element", value: new_el };
          break;

        case "string":
          set_text(new_value.value);
          break;
        case "integer":
          set_text(new_value.value.toString());
          break;
        case "void":
          set_text("");
          break;

        case "closure":
          throw new Error("cannot render a closure as HTML");

        default:
          exhaustive(new_value);
      }
    }).initial_value;
  })();

  switch (value.type) {
    case "element":
      el = { type: "element", value: create_DOM_element(graph, value) };
      break;

    case "string":
      el = { type: "text", value: document.createTextNode(value.value) };
      break;

    case "integer":
      el = {
        type: "text",
        value: document.createTextNode(value.value.toString())
      };
      break;

    case "void":
      el = { type: "text", value: document.createTextNode("") };
      break;

    case "closure":
      throw new Error("cannot render a closure as HTML");

    default:
      exhaustive(value);
  }
  return el.value;
}

function static_of(value: RuntimeValue): EvalResult {
  return { type: "static", value };
}

function evaluate_expression(
  exp: Expression,
  context: EvalContext
): EvalResult {
  switch (exp.type) {
    case "string":
      return static_of({ type: "string", value: exp.value });

    case "integer":
      return static_of({ type: "integer", value: exp.value });

    case "element": {
      const el: RuntimeValue = {
        type: "element",
        name: exp.name,
        children: [],
        attributes: new Map(),
        event_listeners: new Map()
      };
      for (const child of exp.children) {
        switch (child.type) {
          case "text":
            el.children.push(static_of({ type: "string", value: child.value }));
            break;

          case "expression":
            const value = evaluate_expression(child.value, context);
            el.children.push(value);
            break;

          default:
            exhaustive(child);
        }
      }
      for (const attr of exp.attributes) {
        const result = evaluate_expression(attr.value, context);
        if (result.type !== "static")
          throw new Error("cannot handle dynamic attributes");
        const { value } = result;
        switch (value.type) {
          case "string": {
            el.attributes.set(attr.name, value.value);
            break;
          }

          case "integer": {
            el.attributes.set(attr.name, value.value.toString());
            break;
          }

          case "closure": {
            if (attr.name.substring(0, 2) !== "on") {
              throw new Error("closure can only be set on event attributes");
            }
            el.event_listeners.set(attr.name.substring(2), {
              function_id: value.function_id,
              scope: value.scope
            });
            break;
          }

          case "element":
          case "void": {
            throw new Error("cannot set element as attribute value");
          }

          default:
            exhaustive(value);
        }
      }
      return static_of(el);
    }

    case "reference": {
      return {
        type: "dynamic",
        value: resolve_variable(context.scope, exp.variable_id).value
      };
    }

    case "closure": {
      return static_of({
        type: "closure",
        function_id: exp.function_id,
        scope: context.scope
      });
    }

    case "assignment": {
      const variable = resolve_variable(context.scope, exp.target_id);
      const result = evaluate_expression(exp.value, context);
      variable.assign(result);
      return result;
    }

    default:
      exhaustive(exp);
  }
}

function resolve_variable(scope: EvalScope | null, variable_id: number) {
  let value = null;
  while (value == null && scope != null) {
    value = scope.variables_by_id.get(variable_id);
    scope = scope.outer;
  }
  if (value == null)
    throw new Error(`could not find ID "${variable_id}" in scope`);
  return value;
}

// function cast_to_node(result: EvalResult): Dynamic<HtmlNode> {
//   return map_result(
//     result,
//     (rv: RuntimeValue): HtmlNode => {
//       switch (rv.type) {
//         case "string":
//           return { type: "text", value: rv.value };

//         case "integer":
//           return { type: "text", value: rv.value.toString() };

//         case "html_node":
//           return rv.value;

//         case "closure":
//           throw new Error("cannot render closure as HTML element");

//         case "void":
//           return { type: "text", value: "" };

//         default:
//           exhaustive(rv);
//       }
//     }
//   );
// }

// function map_result<T>(
//   result: EvalResult,
//   mapper: (value: RuntimeValue) => T
// ): EvalResult<T> {
//   switch (result.type) {
//     case "static": {
//       return { type: "static", value: mapper(result.value) };
//     }

//     case "dynamic": {
//       let dyn_value: DynamicValue;
//       const init_value = result.value.subscribe(new_value =>
//         dyn_value.set(mapper(new_value))
//       );
//       dyn_value = new DynamicValue(mapper(init_value));
//       return { type: "dynamic", value: dyn_value };
//     }

//     default:
//       exhaustive(result);
//   }
// }
