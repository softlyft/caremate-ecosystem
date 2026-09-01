import { createContext, useContext, type PropsWithChildren } from 'react';

const TabMotionContext = createContext(true);

/** When false, tab screens skip Reanimated enter animations (smoother scroll on tab return). */
export function TabMotionProvider({ enabled, children }: PropsWithChildren<{ enabled: boolean }>) {
  return <TabMotionContext.Provider value={enabled}>{children}</TabMotionContext.Provider>;
}

export function useTabMotionEnabled(): boolean {
  return useContext(TabMotionContext);
}
