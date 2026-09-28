/** Resolves with `value` after `ms` — used to pace scripted chat messages. */
export function withDelay<T>(value: T, ms = 900): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
