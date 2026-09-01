export type OrgPlanActivationLookup = {
  found: boolean;
  organizationId: string;
  organizationName: string | null;
  claimed: boolean;
  activePlanTier: string | null;
  activePlanProvider: string | null;
  activePeriodEnd: string | null;
};
