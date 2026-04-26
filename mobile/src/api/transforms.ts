export function toCamelCase<T>(obj: Record<string, unknown>): T {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const camel = key.replace(/_([a-z])/g, (_, l) => l.toUpperCase());
    result[camel] =
      value && typeof value === 'object' && !Array.isArray(value)
        ? toCamelCase(value as Record<string, unknown>)
        : value;
  }
  return result as T;
}

export function toSnakeCase(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const snake = key.replace(/[A-Z]/g, (l) => `_${l.toLowerCase()}`);
    result[snake] =
      value && typeof value === 'object' && !Array.isArray(value)
        ? toSnakeCase(value as Record<string, unknown>)
        : value;
  }
  return result;
}
