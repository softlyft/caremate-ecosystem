/** Shared helpers for mini-app unit tests (kept outside `__tests__` so Jest does not treat this as a suite). */

export function mockCreateMemoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (name: string) => map.get(name) ?? null,
    setItem: (name: string, value: string) => {
      map.set(name, value);
    },
    removeItem: (name: string) => {
      map.delete(name);
    },
  };
}

export const identityTranslate = (key: string, params?: Record<string, string | number>) => {
  if (!params) {
    return key;
  }
  return Object.entries(params).reduce(
    (result, [name, value]) => result.replace(`{{${name}}}`, String(value)),
    key,
  );
};
