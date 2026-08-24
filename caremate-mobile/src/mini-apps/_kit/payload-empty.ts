function stripActions(state: Record<string, unknown>): Record<string, unknown> {
  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(state)) {
    if (typeof value === 'function') {
      continue;
    }
    next[key] = value;
  }
  return next;
}

/**
 * True when local mini-app state has no user-authored content yet
 * (missing key, empty object, or defaults-only like empty arrays + setup incomplete).
 */
export function isMiniAppPayloadEmpty(
  payload: Record<string, unknown> | null | undefined,
): boolean {
  if (!payload || typeof payload !== 'object') {
    return true;
  }

  const state = stripActions(payload);
  if (Object.keys(state).length === 0) {
    return true;
  }

  if (state.hasCompletedSetup === true) {
    return false;
  }

  // Booleans that represent user intent (e.g. period tracker paused for pregnancy).
  if (state.paused === true) {
    return false;
  }

  // Preference maps store defaults like unitPrefs.weight = "kg" — ignore those strings.
  const preferenceMapKeys = new Set(['unitPrefs']);

  for (const [key, value] of Object.entries(state)) {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) {
        continue;
      }
      // Default pregnancy nickname is not meaningful alone.
      if (key === 'babyNickname' && (trimmed === 'Baby' || trimmed === 'baby')) {
        continue;
      }
      // Non-empty strings (LMP/due dates, nicknames, notes fields at root) count as content.
      return false;
    }
    if (typeof value === 'number' && Number.isFinite(value) && value !== 0) {
      return false;
    }
    if (Array.isArray(value) && value.length > 0) {
      return false;
    }
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      for (const nested of Object.values(value as Record<string, unknown>)) {
        // Nested profile / setup objects (e.g. checkup.profile.dateOfBirth).
        if (
          !preferenceMapKeys.has(key) &&
          typeof nested === 'string' &&
          nested.trim().length > 0
        ) {
          return false;
        }
        if (Array.isArray(nested) && nested.length > 0) {
          return false;
        }
        if (typeof nested === 'number' && Number.isFinite(nested) && nested !== 0) {
          return false;
        }
        // Nested maps (dailyLogs, plansByYear entries) — ignore flat preference strings
        // like unitPrefs.weight = "kg" so defaults-only state stays empty.
        if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
          for (const deep of Object.values(nested as Record<string, unknown>)) {
            if (Array.isArray(deep) && deep.length > 0) {
              return false;
            }
            if (typeof deep === 'string' && deep.trim().length > 0) {
              return false;
            }
            if (typeof deep === 'number' && Number.isFinite(deep) && deep !== 0) {
              return false;
            }
            if (deep && typeof deep === 'object' && Object.keys(deep as object).length > 0) {
              return false;
            }
          }
        }
      }
    }
  }

  return true;
}
