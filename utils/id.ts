let counter = 0;

/** Lightweight unique id generator — good enough for a client-only mock backend. */
export function generateId(prefix = 'id'): string {
  counter += 1;
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now().toString(36)}${counter}${random}`;
}
