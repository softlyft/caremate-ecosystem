import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { usePeriodTrackerStore } from '@/mini-apps/period-tracker/store';
import {
  sortMaternalTtDoses,
  type MaternalTtDose,
  type MaternalTtDoseId,
} from '@/mini-apps/pregnancy-tracker/maternal-tt';
import {
  calculateDueDateFromLmp,
  calculateLmpFromDueDate,
} from '@/mini-apps/pregnancy-tracker/utils';
import { toDateKey } from '@/mini-apps/_kit/date-utils';
import { createMiniAppSyncedStorage } from '@/mini-apps/_kit/synced-storage';
import { registerMiniAppRehydrate } from '@/mini-apps/_kit/rehydrate-registry';
import { usePersistHydrated } from '@/mini-apps/_kit/use-persist-hydrated';

export type PregnancyDueDateSource = 'lmp' | 'due-date';
/** active = antenatal; postpartum = mother care after birth; ended = cleared. */
export type PregnancyStatus = 'active' | 'postpartum' | 'ended';
/** How a pregnancy left the active timeline — never surface “loss” wording in UI. */
export type PregnancyEndOutcome = 'birth' | 'closed';
export type { MaternalTtDose, MaternalTtDoseId };

export interface PregnancyDailyLog {
  dateKey: string;
  mood?: string;
  symptoms: string[];
  kickCount: number;
  notes: string;
  weightKg?: number;
}

export interface PregnancyArchive {
  id: string;
  lastMenstrualPeriod: string;
  dueDate: string;
  babyNickname: string;
  dueDateSource: PregnancyDueDateSource;
  endedAt: string;
  logCount: number;
  outcome: PregnancyEndOutcome;
  birthDate?: string;
}

interface PregnancyTrackerState {
  pregnancyId: string | null;
  status: PregnancyStatus | null;
  endedAt: string | null;
  birthDate: string | null;
  lastMenstrualPeriod: string | null;
  dueDate: string | null;
  dueDateSource: PregnancyDueDateSource | null;
  babyNickname: string;
  /** True once the user has saved an LMP or due date (used by cloud hydrate empty-check). */
  hasCompletedSetup: boolean;
  dailyLogs: Record<string, PregnancyDailyLog>;
  pastPregnancies: PregnancyArchive[];
  /** Mother-care TT1–TT5; survives end of pregnancy / postpartum. */
  maternalTtDoses: MaternalTtDose[];
  setFromLastPeriod: (lmpKey: string) => void;
  setFromDueDate: (dueDateKey: string) => void;
  setBabyNickname: (name: string) => void;
  upsertDailyLog: (log: PregnancyDailyLog) => void;
  logMaternalTtDose: (id: MaternalTtDoseId, dateKey: string) => void;
  removeMaternalTtDose: (id: MaternalTtDoseId) => void;
  /** Enter mother postpartum care after a live birth. */
  recordBirth: (birthDateKey: string) => void;
  /** Leave postpartum: archive as birth, clear timeline, resume Period Tracker. */
  finishPostpartum: () => void;
  /**
   * Quietly close the pregnancy timeline without postpartum.
   * Sensitive path — UI must stay non-specific.
   */
  closePregnancyQuietly: () => void;
  /** @deprecated Prefer closePregnancyQuietly — kept for older call sites/tests. */
  endPregnancy: () => void;
  clearAll: () => void;
}

function pausePeriodTrackerForPregnancy(): void {
  usePeriodTrackerStore.getState().pauseForPregnancy();
}

function resumePeriodTracker(): void {
  const period = usePeriodTrackerStore.getState();
  if (period.paused && period.pausedReason === 'pregnancy') {
    period.resume();
  }
}

function newPregnancyId(): string {
  return `preg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function archiveActive(
  state: PregnancyTrackerState,
  outcome: PregnancyEndOutcome,
): PregnancyArchive | null {
  if (
    !state.pregnancyId ||
    !state.lastMenstrualPeriod ||
    !state.dueDate ||
    !state.dueDateSource
  ) {
    return null;
  }
  return {
    id: state.pregnancyId,
    lastMenstrualPeriod: state.lastMenstrualPeriod,
    dueDate: state.dueDate,
    babyNickname: state.babyNickname,
    dueDateSource: state.dueDateSource,
    endedAt: state.endedAt ?? state.birthDate ?? toDateKey(new Date()),
    logCount: Object.keys(state.dailyLogs).length,
    outcome,
    ...(outcome === 'birth' && state.birthDate ? { birthDate: state.birthDate } : {}),
  };
}

function clearPregnancyTimeline(pastPregnancies: PregnancyArchive[]) {
  return {
    pregnancyId: null as string | null,
    status: 'ended' as const,
    endedAt: toDateKey(new Date()),
    birthDate: null as string | null,
    lastMenstrualPeriod: null as string | null,
    dueDate: null as string | null,
    dueDateSource: null as PregnancyDueDateSource | null,
    babyNickname: 'Baby',
    hasCompletedSetup: false,
    dailyLogs: {} as Record<string, PregnancyDailyLog>,
    pastPregnancies,
  };
}

export const usePregnancyTrackerStore = create<PregnancyTrackerState>()(
  persist(
    (set, get) => ({
      pregnancyId: null,
      status: null,
      endedAt: null,
      birthDate: null,
      lastMenstrualPeriod: null,
      dueDate: null,
      dueDateSource: null,
      babyNickname: 'Baby',
      hasCompletedSetup: false,
      dailyLogs: {},
      pastPregnancies: [],
      maternalTtDoses: [],
      setFromLastPeriod: (lmpKey) => {
        const state = get();
        if (state.status === 'postpartum') {
          return;
        }
        const startingFresh = !state.pregnancyId || state.status === 'ended';
        set({
          pregnancyId: startingFresh ? newPregnancyId() : state.pregnancyId,
          status: 'active',
          endedAt: null,
          birthDate: null,
          lastMenstrualPeriod: lmpKey,
          dueDate: calculateDueDateFromLmp(lmpKey),
          dueDateSource: 'lmp',
          hasCompletedSetup: true,
          dailyLogs: startingFresh ? {} : state.dailyLogs,
        });
        pausePeriodTrackerForPregnancy();
      },
      setFromDueDate: (dueDateKey) => {
        const state = get();
        if (state.status === 'postpartum') {
          return;
        }
        const startingFresh = !state.pregnancyId || state.status === 'ended';
        set({
          pregnancyId: startingFresh ? newPregnancyId() : state.pregnancyId,
          status: 'active',
          endedAt: null,
          birthDate: null,
          dueDate: dueDateKey,
          lastMenstrualPeriod: calculateLmpFromDueDate(dueDateKey),
          dueDateSource: 'due-date',
          hasCompletedSetup: true,
          dailyLogs: startingFresh ? {} : state.dailyLogs,
        });
        pausePeriodTrackerForPregnancy();
      },
      setBabyNickname: (babyNickname) => set({ babyNickname }),
      upsertDailyLog: (log) => {
        const dailyLogs = { ...get().dailyLogs, [log.dateKey]: log };
        set({ dailyLogs });
      },
      logMaternalTtDose: (id, dateKey) => {
        const existing = get().maternalTtDoses.filter((dose) => dose.id !== id);
        set({
          maternalTtDoses: sortMaternalTtDoses([...existing, { id, dateKey }]),
        });
      },
      removeMaternalTtDose: (id) => {
        set({
          maternalTtDoses: get().maternalTtDoses.filter((dose) => dose.id !== id),
        });
      },
      recordBirth: (birthDateKey) => {
        const state = get();
        if (!state.pregnancyId || state.status !== 'active') {
          return;
        }
        set({
          status: 'postpartum',
          birthDate: birthDateKey,
          endedAt: null,
          hasCompletedSetup: true,
        });
        // Keep Period Tracker paused while in early mother postpartum care.
      },
      finishPostpartum: () => {
        const state = get();
        if (state.status !== 'postpartum') {
          return;
        }
        const archived = archiveActive(
          {
            ...state,
            endedAt: toDateKey(new Date()),
          },
          'birth',
        );
        set({
          ...clearPregnancyTimeline(
            archived ? [archived, ...state.pastPregnancies].slice(0, 20) : state.pastPregnancies,
          ),
        });
        resumePeriodTracker();
      },
      closePregnancyQuietly: () => {
        const state = get();
        if (state.status !== 'active' && state.status !== 'postpartum') {
          return;
        }
        const outcome: PregnancyEndOutcome = state.status === 'postpartum' ? 'birth' : 'closed';
        const archived = archiveActive(
          {
            ...state,
            endedAt: toDateKey(new Date()),
          },
          outcome,
        );
        set({
          ...clearPregnancyTimeline(
            archived ? [archived, ...state.pastPregnancies].slice(0, 20) : state.pastPregnancies,
          ),
        });
        resumePeriodTracker();
      },
      endPregnancy: () => {
        get().closePregnancyQuietly();
      },
      clearAll: () =>
        set({
          pregnancyId: null,
          status: null,
          endedAt: null,
          birthDate: null,
          lastMenstrualPeriod: null,
          dueDate: null,
          dueDateSource: null,
          babyNickname: 'Baby',
          hasCompletedSetup: false,
          dailyLogs: {},
          pastPregnancies: [],
          maternalTtDoses: [],
        }),
    }),
    {
      name: 'caremate-pregnancy-tracker',
      storage: createJSONStorage(() => createMiniAppSyncedStorage('pregnancy')),
      migrate: (persisted) => {
        const state = (persisted ?? {}) as Partial<PregnancyTrackerState>;
        const hasTimeline = Boolean(state.lastMenstrualPeriod && state.dueDate);
        const pastPregnancies = (state.pastPregnancies ?? []).map((item) => ({
          ...item,
          outcome: item.outcome ?? ('closed' as PregnancyEndOutcome),
        }));
        return {
          ...state,
          pregnancyId: state.pregnancyId ?? (hasTimeline ? newPregnancyId() : null),
          status: state.status ?? (hasTimeline ? 'active' : null),
          endedAt: state.endedAt ?? null,
          birthDate: state.birthDate ?? null,
          dueDateSource:
            state.dueDateSource ?? (hasTimeline ? ('lmp' as PregnancyDueDateSource) : null),
          hasCompletedSetup: state.hasCompletedSetup ?? hasTimeline,
          pastPregnancies,
          maternalTtDoses: Array.isArray(state.maternalTtDoses) ? state.maternalTtDoses : [],
        };
      },
      version: 3,
    },
  ),
);

registerMiniAppRehydrate(async () => {
  await usePregnancyTrackerStore.persist.rehydrate();
});

export function usePregnancyTrackerHydrated(): boolean {
  return usePersistHydrated(usePregnancyTrackerStore.persist);
}

export function getTodayLog(dateKey = toDateKey(new Date())): PregnancyDailyLog {
  return {
    dateKey,
    symptoms: [],
    kickCount: 0,
    notes: '',
  };
}

/** Recent logs newest-first for history UI. */
export function listRecentDailyLogs(
  dailyLogs: Record<string, PregnancyDailyLog>,
  limit = 14,
): PregnancyDailyLog[] {
  return Object.values(dailyLogs)
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey))
    .slice(0, limit);
}
