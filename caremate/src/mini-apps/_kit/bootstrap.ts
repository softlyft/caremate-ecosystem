/**
 * Side-effect imports: each store registers its persist.rehydrate with the kit.
 * Import this once from sync bootstrap / AppProviders so hydrate can find all apps.
 */
import '@/mini-apps/medication-tracker/store';
import '@/mini-apps/checkup-planner/store';
import '@/mini-apps/immunization-tracker/store';
import '@/mini-apps/pregnancy-tracker/store';
import '@/mini-apps/period-tracker/store';
