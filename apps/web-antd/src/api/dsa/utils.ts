type PlainObject = Record<string, unknown>;

function isPlainObject(value: unknown): value is PlainObject {
  return Object.prototype.toString.call(value) === '[object Object]';
}

function toCamelKey(key: string) {
  return key.replaceAll(/_([a-z])/g, (_, letter: string) =>
    letter.toUpperCase(),
  );
}

function toSnakeKey(key: string) {
  return key.replaceAll(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function mapKeysDeep(value: unknown, mapper: (key: string) => string): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => mapKeysDeep(item, mapper));
  }
  if (!isPlainObject(value)) {
    return value;
  }
  const result: PlainObject = {};
  for (const [key, item] of Object.entries(value)) {
    result[mapper(key)] = mapKeysDeep(item, mapper);
  }
  return result;
}

export function toCamelCase<T>(value: unknown): T {
  return mapKeysDeep(value, toCamelKey) as T;
}

export function toSnakeCase<T extends PlainObject>(value: T): PlainObject {
  return mapKeysDeep(value, toSnakeKey) as PlainObject;
}

export function getApiStreamBaseUrl() {
  return import.meta.env.VITE_GLOB_API_URL || '/api/v1';
}
