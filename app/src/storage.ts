const STORAGE_PREFIX = "dukkeobi:v2:";

export function readStored<T>(key: string, fallback: T): T {
  try {
    const value = window.localStorage.getItem(`${STORAGE_PREFIX}${key}`);
    return value === null ? fallback : (JSON.parse(value) as T);
  } catch {
    return fallback;
  }
}

export function writeStored<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(value));
  } catch {
    // The application remains usable when storage is blocked or full.
  }
}
