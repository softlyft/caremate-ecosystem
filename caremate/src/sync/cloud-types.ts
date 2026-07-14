/**
 * Cloud (Postgres) row types used by sync push/pull mappers.
 * Domain models stay camelCase under `@/types` / repositories;
 * these snake_case rows match `@caremate/db-types`.
 */
export type {
  Database,
  Tables,
  TablesInsert,
  TablesUpdate,
  Json,
} from '@caremate/db-types';

export type {
  Profile as CloudProfile,
  Settings as CloudSettings,
  EmergencyProfile as CloudEmergencyProfile,
  Article as CloudArticle,
  Provider as CloudProvider,
  Bookmark as CloudBookmark,
  MiniAppSnapshot as CloudMiniAppSnapshot,
} from '@caremate/db-types';

import type { Json } from '@caremate/db-types';

/** Cast domain payloads into Supabase `Json` columns without losing runtime shape. */
export function toJson(value: unknown): Json {
  return value as Json;
}
