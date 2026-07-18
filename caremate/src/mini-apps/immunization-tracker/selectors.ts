import { useMemo } from 'react';

import {
  useImmunizationTrackerStore,
  type ImmunizationProfile,
  type ImmunizationRecord,
} from '@/mini-apps/immunization-tracker/store';

const EMPTY_RECORDS: ImmunizationRecord[] = [];

export function useActiveImmunizationProfile(): ImmunizationProfile | null {
  const activeProfileId = useImmunizationTrackerStore((state) => state.activeProfileId);
  const profiles = useImmunizationTrackerStore((state) => state.profiles);

  return useMemo(
    () => profiles.find((profile) => profile.id === activeProfileId) ?? null,
    [activeProfileId, profiles],
  );
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
