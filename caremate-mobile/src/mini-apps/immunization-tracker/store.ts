import { v4 as uuidv4 } from 'uuid';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  ImmunizationProfile,
  ImmunizationRecord,
  isValidImmunizationProfile,
  normalizeImmunizationProfiles,
  normalizeImmunizationRecords,
} from '@/mini-apps/immunization-tracker/utils';
import { createMiniAppSyncedStorage } from '@/mini-apps/_kit/synced-storage';
import { registerMiniAppRehydrate } from '@/mini-apps/_kit/rehydrate-registry';
import { usePersistHydrated } from '@/mini-apps/_kit/use-persist-hydrated';

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

function resolveActiveProfileId(
  profiles: ImmunizationProfile[],
  activeProfileId: string | null | undefined,
): string | null {
  if (activeProfileId && profiles.some((profile) => profile.id === activeProfileId)) {
    return activeProfileId;
  }
  return profiles[0]?.id ?? null;
}

export function migratePersistedState(persisted: unknown): Partial<ImmunizationTrackerState> {
  const state = (persisted ?? {}) as LegacyPersistedState;

  if (Array.isArray(state.profiles)) {
    const profiles = normalizeImmunizationProfiles(state.profiles);
    const profileIds = new Set(profiles.map((profile) => profile.id));
    const activeProfileId = resolveActiveProfileId(profiles, state.activeProfileId);

    const records = normalizeImmunizationRecords(
      (state.records ?? [])
        .map((record) => {
          if (record?.profileId) {
            return record as ImmunizationRecord;
          }
          if (!activeProfileId || !record) {
            return null;
          }
          return { ...record, profileId: activeProfileId };
        })
        .filter((record): record is ImmunizationRecord => Boolean(record)),
    ).filter((record) => profileIds.has(record.profileId));

    return { profiles, activeProfileId, records };
  }

  if (state.profile) {
    const migratedProfile: ImmunizationProfile = {
      id: uuidv4(),
      name: state.profile.name,
      dateOfBirth: state.profile.dateOfBirth,
    };
    if (!isValidImmunizationProfile(migratedProfile)) {
      return {
        profiles: [],
        activeProfileId: null,
        records: [],
      };
    }
    const records = normalizeImmunizationRecords(
      (state.records ?? []).map((record) => ({
        ...record,
        profileId: migratedProfile.id,
      })),
    );
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

function sanitizePersistedState(
  persisted: unknown,
  current: ImmunizationTrackerState,
): ImmunizationTrackerState {
  const migrated = migratePersistedState(persisted);
  const profiles = normalizeImmunizationProfiles(migrated.profiles ?? current.profiles);
  const profileIds = new Set(profiles.map((profile) => profile.id));
  return {
    ...current,
    profiles,
    activeProfileId: resolveActiveProfileId(
      profiles,
      migrated.activeProfileId ?? current.activeProfileId,
    ),
    records: normalizeImmunizationRecords(migrated.records ?? current.records).filter((record) =>
      profileIds.has(record.profileId),
    ),
  };
}

export const useImmunizationTrackerStore = create<ImmunizationTrackerState>()(
  persist(
    (set, get) => ({
      profiles: [],
      activeProfileId: null,
      records: [],
      syncProfilesFromFamily: (children) => {
        const profiles = normalizeImmunizationProfiles(children);
        set({
          profiles,
          activeProfileId: resolveActiveProfileId(profiles, get().activeProfileId),
        });
      },
      setActiveProfileId: (profileId) => {
        if (get().profiles.some((profile) => profile.id === profileId)) {
          set({ activeProfileId: profileId });
        }
      },
      upsertRecord: (record) => {
        const next = normalizeImmunizationRecords([record])[0];
        if (!next) {
          return;
        }
        const records = [
          ...get().records.filter(
            (item) => !(item.profileId === next.profileId && item.vaccineId === next.vaccineId),
          ),
          next,
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
      merge: (persisted, current) => sanitizePersistedState(persisted, current),
    },
  ),
);

registerMiniAppRehydrate(async () => {
  await useImmunizationTrackerStore.persist.rehydrate();
});

export function useImmunizationTrackerHydrated(): boolean {
  return usePersistHydrated(useImmunizationTrackerStore.persist);
}

export type { ImmunizationProfile, ImmunizationRecord };
