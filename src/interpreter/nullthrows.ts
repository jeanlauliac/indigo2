export function nullthrows<T>(x: T | null | undefined): T {
  if (x == null) throw new Error("unexpected null");
  return x;
}
