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
  attributes: Map<string, EvalResult>;
  // event_listeners: Map<string, Closure>;
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
type Releaser = () => void;
type Subscription<T> = { initial_value: T; release: Releaser };
class Dynamic<T> {
  private value_: T;
  private subscribers: Map<{}, Subscriber<T>> = new Map();

  constructor(init_value: T) {
    this.value_ = init_value;
  }

  subscribe(subscriber: Subscriber<T>): Subscription<T> {
    const token = {};
    this.subscribers.set(token, subscriber);
    return {
      initial_value: this.value_,
      release: () => {
        this.subscribers.delete(token);
      },
    };
  }

  set(new_value: T) {
    this.value_ = new_value;
    this.subscribers.forEach((sb) => sb(new_value));
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

  const returned = evaluate_function(graph, graph.entry_point_id, null, []);
  const { initial_value } = create_DOM_node(graph, returned);
  element.appendChild(initial_value);
}

function evaluate_function(
  graph: Graph,
  function_id: number,
  outer_scope: EvalScope | null,
  args: EvalResult[]
): EvalResult {
  const func = nullthrows(graph.functions.get(function_id));
  const scope: EvalScope = { outer: outer_scope, variables_by_id: new Map() };

  if (func.arguments.length !== args.length) {
    throw new Error("number of arguments does not match");
  }
  for (const [i, arg] of func.arguments.entries()) {
    const vr = new Variable(args[i]);
    scope.variables_by_id.set(arg.variable_id, vr);
  }

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

function create_DOM_element(
  graph: Graph,
  value: RuntimeElement
): Subscription<HTMLElement> {
  const releasers: Releaser[] = [];
  const el = document.createElement(value.name);
  for (const child of value.children) {
    const { initial_value, release } = create_DOM_node(graph, child);
    el.appendChild(initial_value);
    releasers.push(release);
  }
  let value_attr_value: string | void;
  for (const [name, attr_res] of value.attributes) {
    let current_listener: EventListener | void;
    const set_attr = (value: RuntimeValue) => {
      if (name.startsWith("on")) {
        const event_type = name.substring(2);
        if (value.type !== "closure") {
          throw new Error(`expected closure for event handler "${name}"`);
        }
        if (current_listener != null) {
          el.removeEventListener(event_type, current_listener);
        }

        current_listener = (ev) => {
          let args: EvalResult[] = [];
          if (event_type === "input") {
            const value = (ev.target as any).value as string;
            args = [
              {
                type: "static",
                value: { type: "string", value },
              },
            ];
          }
          evaluate_function(graph, value.function_id, value.scope, args);
          if (event_type === "input" && value_attr_value != null) {
            (el as HTMLInputElement).value = value_attr_value;
          }
        };
        el.addEventListener(event_type, current_listener);
        return;
      }
      const attr_value = (() => {
        switch (value.type) {
          case "closure":
          case "void":
          case "element":
            throw new Error("invalid value for html attribute");

          case "string":
            return value.value;

          case "integer":
            return value.value.toString();
        }
      })();
      el.setAttribute(name, attr_value);
      if (name === "value") value_attr_value = attr_value;
    };
    const { initial_value, release } = get_or_subscribe(attr_res, set_attr);
    releasers.push(release);
    set_attr(initial_value);
  }

  return { initial_value: el, release: create_release(releasers) };
}

function create_release(releasers: Releaser[]) {
  releasers = releasers.filter((release) => release !== NO_OP);
  if (releasers.length === 0) return NO_OP;
  return () => releasers.forEach((release) => release());
}

function get_or_subscribe(
  res: EvalResult,
  subscriber: (v: RuntimeValue) => void
): Subscription<RuntimeValue> {
  switch (res.type) {
    case "static":
      return { initial_value: res.value, release: NO_OP };

    case "dynamic":
      return res.value.subscribe(subscriber);

    default:
      exhaustive(res);
  }
}

function create_DOM_node(graph: Graph, result: EvalResult): Subscription<Node> {
  let el:
    | { type: "element"; value: HTMLElement; release: Releaser }
    | { type: "text"; value: Text };

  const { initial_value, release } = get_or_subscribe(result, (new_value) => {
    const set_text = (str: string) => {
      if (el.type === "text") {
        el.value.data = str;
        return;
      }
      el.release();
      const node = document.createTextNode(str);
      el.value.replaceWith(node);
      el = { type: "text", value: node };
    };

    switch (new_value.type) {
      case "element":
        const { initial_value, release } = create_DOM_element(graph, new_value);
        if (el.type === "element") el.release();
        el.value.replaceWith(initial_value);
        el = { type: "element", value: initial_value, release };
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
  });

  switch (initial_value.type) {
    case "element":
      const { initial_value: value, release } = create_DOM_element(
        graph,
        initial_value
      );
      el = { type: "element", value, release };
      break;

    case "string":
      el = {
        type: "text",
        value: document.createTextNode(initial_value.value),
      };
      break;

    case "integer":
      el = {
        type: "text",
        value: document.createTextNode(initial_value.value.toString()),
      };
      break;

    case "void":
    case "closure":
      throw new Error("cannot render a closure or void as HTML");

    default:
      exhaustive(initial_value);
  }
  return {
    initial_value: el.value,
    release: () => {
      if (el.type === "element") el.release();
      release();
    },
  };
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
        el.attributes.set(attr.name, result);
      }
      return static_of(el);
    }

    case "reference": {
      return {
        type: "dynamic",
        value: resolve_variable(context.scope, exp.variable_id).value,
      };
    }

    case "closure": {
      return static_of({
        type: "closure",
        function_id: exp.function_id,
        scope: context.scope,
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
