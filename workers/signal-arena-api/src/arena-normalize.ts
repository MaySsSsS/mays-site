type ListResult<T> = {
  found: boolean;
  items: T[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function findList<T>(value: unknown, keys: string[], depth: number): ListResult<T> {
  if (Array.isArray(value)) {
    return { found: true, items: value as T[] };
  }

  if (!isRecord(value) || depth > 4) {
    return { found: false, items: [] };
  }

  for (const key of keys) {
    if (key in value) {
      const result = findList<T>(value[key], keys, depth + 1);

      if (result.found) {
        return result;
      }
    }
  }

  const directArrays = Object.values(value).filter(Array.isArray) as T[][];

  if (directArrays.length > 0) {
    return { found: true, items: directArrays.flat() };
  }

  for (const child of Object.values(value)) {
    if (isRecord(child)) {
      const result = findList<T>(child, keys, depth + 1);

      if (result.found) {
        return result;
      }
    }
  }

  return { found: false, items: [] };
}

export function arenaList<T>(value: unknown, keys: string[]): T[] {
  return findList<T>(value, keys, 0).items;
}
