import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

import { initializeDatabase } from '@/database/client';
import { syncEngine } from '@/sync/engine';

/** Daily safety net while the app is closed / backgrounded (OS may delay; not exact midnight). */
export const DAILY_SYNC_TASK = 'caremate-daily-sync';

TaskManager.defineTask(DAILY_SYNC_TASK, async () => {
  try {
    await initializeDatabase();
    // Engine may not be "running" in a headless wake — run one cycle directly.
    await syncEngine.runSyncCycle({ reason: 'background-daily' });
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export async function registerDailyBackgroundSync(): Promise<void> {
  if (Platform.OS === 'web') {
    return;
  }

  const status = await BackgroundTask.getStatusAsync();
  if (status === BackgroundTask.BackgroundTaskStatus.Restricted) {
    return;
  }

  const registered = await TaskManager.isTaskRegisteredAsync(DAILY_SYNC_TASK);
  if (registered) {
    return;
  }

  await BackgroundTask.registerTaskAsync(DAILY_SYNC_TASK, {
    // OS treats this as a minimum; default guidance is ~12h. 24h ≈ daily safety net.
    minimumInterval: 24 * 60,
  });
}
