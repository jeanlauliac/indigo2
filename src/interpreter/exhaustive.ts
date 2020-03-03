export function exhaustive(param: never): never {
  throw new Error("should not reach here");
}
