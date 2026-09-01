import { useEffect, useState } from 'react';

import {
  initialOrgPlanCatalogState,
  loadOrgPlanCatalog,
  type OrgPlanCatalogKind,
  type OrgPlanCatalogState,
} from '@/lib/org-plan-catalog';
import type { PayerPlan } from '@/lib/payer-pricing';
import type { ProviderPlan } from '@/lib/provider-pricing';

export function useOrgPlanCatalog<K extends OrgPlanCatalogKind>(
  kind: K,
): OrgPlanCatalogState & { plans: K extends 'provider' ? ProviderPlan[] : PayerPlan[] } {
  const [state, setState] = useState<OrgPlanCatalogState>(() =>
    initialOrgPlanCatalogState(kind),
  );

  useEffect(() => {
    let cancelled = false;
    void loadOrgPlanCatalog(kind).then((next) => {
      if (!cancelled) {
        setState(next);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [kind]);

  return state as OrgPlanCatalogState & {
    plans: K extends 'provider' ? ProviderPlan[] : PayerPlan[];
  };
}
