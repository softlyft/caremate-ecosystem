import { useMemo } from 'react';

import {
  useImmunizationTrackerStore,
  type ImmunizationProfile,
  type ImmunizationRecord,
} from '@/mini-apps/immunization-tracker/store';
import { isValidImmunizationProfile } from '@/mini-apps/immunization-tracker/utils';

const EMPTY_RECORDS: ImmunizationRecord[] = [];

export function useActiveImmunizationProfile(): ImmunizationProfile | null {
  const activeProfileId = useImmunizationTrackerStore((state) => state.activeProfileId);
  const profiles = useImmunizationTrackerStore((state) => state.profiles);

  return useMemo(() => {
    const profile = profiles.find((item) => item.id === activeProfileId) ?? null;
    return isValidImmunizationProfile(profile) ? profile : null;
  }, [activeProfileId, profiles]);
}

export function useActiveImmunizationRecords(): ImmunizationRecord[] {
  const activeProfileId = useImmunizationTrackerStore((state) => state.activeProfileId);
  const records = useImmunizationTrackerStore((state) => state.records);

  return useMemo(() => {
    if (!activeProfileId) {
      return EMPTY_RECORDS;
    }
    return records.filter((record) => record.profileId === activeProfileId);
  }, [activeProfileId, records]);
}
