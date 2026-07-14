export type MiniAppRehydrate = () => Promise<void>;

const rehydrators: MiniAppRehydrate[] = [];

export function registerMiniAppRehydrate(fn: MiniAppRehydrate): void {
  rehydrators.push(fn);
}

export async function rehydrateAllMiniAppStores(): Promise<void> {
  await Promise.all(rehydrators.map((fn) => fn()));
}
