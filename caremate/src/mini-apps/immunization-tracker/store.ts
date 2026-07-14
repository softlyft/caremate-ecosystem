import { useEffect, useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { ImmunizationProfile, ImmunizationRecord } from '@/mini-apps/immunization-tracker/utils';
import { createMiniAppSyncedStorage } from '@/mini-apps/_kit/synced-storage';
import { registerMiniAppRehydrate } from '@/mini-apps/_kit/rehydrate-registry';

const EMPTY_RECORDS: ImmunizationRecord[] = [];

interface ImmunizationTrackerState {
  profiles: ImmunizationProfile[];
  activeProfileId: string | null;
  records: ImmunizationRecord[];
  /** Replace child list from family household members (keeps vaccine records by profile id). */
  syncProfilesFromFamily: (children: ImmunizationProfile[]) => void;
  setActiveProfileId: (profileId: string) => void;
  upsertRecord: (record: ImmunizationRecord) => void;
  removeRecord: (profileId: string, vaccineId: string) => void;
  clearAll: () => void;
}

type LegacyPersistedState = {
  profile?: { name: string; dateOfBirth: string } | null;
  profiles?: ImmunizationProfile[];
  activeProfileId?: string | null;
  records?: (ImmunizationRecord & { profileId?: string })[];
};

function migratePersistedState(persisted: unknown): Partial<ImmunizationTrackerState> {
  const state = (persisted ?? {}) as LegacyPersistedState;

  if (Array.isArray(state.profiles)) {
    const profiles = state.profiles;
    const activeProfileId =
      state.activeProfileId && profiles.some((profile) => profile.id === state.activeProfileId)
        ? state.activeProfileId
        : (profiles[0]?.id ?? null);

    const records = (state.records ?? [])
      .map((record) => {
        if (record.profileId) {
          return record as ImmunizationRecord;
        }
        if (!activeProfileId) {
          return null;
        }
        return { ...record, profileId: activeProfileId };
      })
      .filter((record): record is ImmunizationRecord => Boolean(record));

    return { profiles, activeProfileId, records };
  }

  if (state.profile) {
    const migratedProfile: ImmunizationProfile = {
      id: uuidv4(),
      name: state.profile.name,
      dateOfBirth: state.profile.dateOfBirth,
    };
    const records = (state.records ?? []).map((record) => ({
      ...record,
      profileId: migratedProfile.id,
    }));
    return {
      profiles: [migratedProfile],
      activeProfileId: migratedProfile.id,
      records,
    };
  }

  return {
    profiles: [],
    activeProfileId: null,
    records: [],
  };
}

export const useImmunizationTrackerStore = create<ImmunizationTrackerState>()(
  persist(
    (set, get) => ({
      profiles: [],
      activeProfileId: null,
      records: [],
      syncProfilesFromFamily: (children) => {
        const profiles = children.filter((child) => Boolean(child.dateOfBirth?.trim()));
        const activeStillValid =
          get().activeProfileId && profiles.some((profile) => profile.id === get().activeProfileId);
        set({
          profiles,
          activeProfileId: activeStillValid ? get().activeProfileId : (profiles[0]?.id ?? null),
        });
      },
      setActiveProfileId: (profileId) => {
        if (get().profiles.some((profile) => profile.id === profileId)) {
          set({ activeProfileId: profileId });
        }
      },
      upsertRecord: (record) => {
        const records = [
          ...get().records.filter(
            (item) => !(item.profileId === record.profileId && item.vaccineId === record.vaccineId),
          ),
          record,
        ];
        set({ records });
      },
      removeRecord: (profileId, vaccineId) => {
        set({
          records: get().records.filter(
            (record) => !(record.profileId === profileId && record.vaccineId === vaccineId),
          ),
        });
      },
      clearAll: () => set({ profiles: [], activeProfileId: null, records: [] }),
    }),
    {
      name: 'caremate-immunization-tracker',
      version: 1,
      storage: createJSONStorage(() => createMiniAppSyncedStorage('immunization')),
      migrate: (persistedState) => migratePersistedState(persistedState),
    },
  ),
);

registerMiniAppRehydrate(async () => {
  await useImmunizationTrackerStore.persist.rehydrate();
});

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

export function useImmunizationTrackerHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() => useImmunizationTrackerStore.persist.hasHydrated());

  useEffect(() => {
    if (hydrated) {
      return;
    }

    const unsubscribe = useImmunizationTrackerStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });

    return unsubscribe;
  }, [hydrated]);

  return hydrated;
}

export type { ImmunizationProfile, ImmunizationRecord };
