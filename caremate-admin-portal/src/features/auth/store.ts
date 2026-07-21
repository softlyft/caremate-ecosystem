'use client';

import { create } from 'zustand';
import type { StaffRole } from '@/constants/roles';

type AuthState = {
  email: string | null;
  role: StaffRole | null;
  setSession: (email: string | null, role: StaffRole | null) => void;
  clear: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  email: null,
  role: null,
  setSession: (email, role) => set({ email, role }),
  clear: () => set({ email: null, role: null }),
}));
