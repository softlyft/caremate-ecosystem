export {
  LAST_ROUTE_MAX_AGE_MS,
  clearLastAppHref,
  isRestorableAppHref,
  peekLastAppHref,
  saveLastAppHref,
  takeLastAppHref,
  toRestorableAppHref,
} from '@/domains/navigation/persistence';
export {
  isNavigationRestoreComplete,
  markNavigationRestoreComplete,
  resetNavigationRestoreGate,
} from '@/domains/navigation/restore-gate';
export { resolveBackFallbackHref, routerBackOrFallback } from '@/domains/navigation/safe-back';
