import { create } from 'zustand';

import type { ChildProfileDraft, FamilyMemberGender } from '@/domains/family/types';

interface FamilySetupState {
  isParent: boolean | null;
  childCount: number;
  children: ChildProfileDraft[];
  setIsParent: (value: boolean) => void;
  setChildCount: (count: number) => void;
  upsertChild: (index: number, child: ChildProfileDraft) => void;
  reset: () => void;
}

const emptyChild = (): ChildProfileDraft => ({
  fullName: '',
  dateOfBirth: '',
  gender: 'prefer_not_to_say' as FamilyMemberGender,
  notes: '',
});

export const useFamilySetupStore = create<FamilySetupState>((set, get) => ({
  isParent: null,
  childCount: 1,
  children: [emptyChild()],

  setIsParent: (value) => set({ isParent: value }),

  setChildCount: (count) => {
    const safe = Math.max(0, Math.min(12, Math.floor(count)));
    const current = get().children;
    const next = Array.from({ length: safe }, (_, i) => current[i] ?? emptyChild());
    set({ childCount: safe, children: next });
  },

  upsertChild: (index, child) => {
    const children = [...get().children];
    children[index] = child;
    set({ children });
  },

  reset: () =>
    set({
      isParent: null,
      childCount: 1,
      children: [emptyChild()],
    }),
}));
