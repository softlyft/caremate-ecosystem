import { adsRepository } from '@/domains/ads/repository';
import { articleRepository } from '@/domains/articles/repository';
import { billingRepository } from '@/domains/billing/repository';
import { emergencyRepository } from '@/domains/emergency/repository';
import { familyRepository } from '@/domains/family/repository';
import { locationSampleRepository } from '@/domains/location/repository';
import { notificationRepository } from '@/domains/notifications/repository';
import { profileRepository } from '@/domains/profile/repository';
import { providerRepository } from '@/domains/providers/repository';
import { healthTipRepository } from '@/domains/tips/repository';
import { useAuthStore } from '@/features/auth/store';
import { healthTimelineRepository } from '@/domains/timeline/repository';
import { miniAppSnapshotRepository } from '@/mini-apps/_kit/snapshot-repository';
import { registerSyncHandler } from '@/sync/registry';

let registered = false;

function currentUserId(): string | null {
  const { user, isGuest } = useAuthStore.getState();
  if (isGuest || !user?.id) {
    return null;
  }
  return user.id;
}

/** Registers core + mini-app snapshot handlers once. */
export function registerDefaultSyncHandlers(): void {
  if (registered) {
    return;
  }
  registered = true;

  registerSyncHandler('profiles', {
    push: (entityId, operation, payload) =>
      profileRepository.syncToRemote(entityId, operation, payload),
    pull: () => profileRepository.pullFromRemote(),
  });

  registerSyncHandler('emergency_profiles', {
    push: (entityId, operation, payload) =>
      emergencyRepository.syncToRemote(entityId, operation, payload),
    pull: () => emergencyRepository.pullFromRemote(),
  });

  registerSyncHandler('providers', {
    push: (entityId, operation, payload) =>
      providerRepository.syncToRemote(entityId, operation, payload),
    pull: () => providerRepository.pullFromRemote(),
  });

  registerSyncHandler('user_location_samples', {
    push: (entityId, operation, payload) =>
      locationSampleRepository.syncToRemote(entityId, operation, payload),
    pull: () => locationSampleRepository.pullFromRemote(),
  });

  registerSyncHandler('articles', {
    push: async () => {
      // Articles are read-mostly from server in Phase 1.
    },
    pull: () => articleRepository.pullFromRemote(),
  });

  registerSyncHandler('health_tips', {
    push: async () => {
      // Tips are portal-managed catalog — pull only.
    },
    pull: () => healthTipRepository.pullFromRemote(),
  });

  registerSyncHandler('bookmarks', {
    push: (entityId, operation, payload) =>
      articleRepository.syncBookmarkToRemote(entityId, operation, payload),
    pull: () => articleRepository.pullBookmarksFromRemote(),
  });

  registerSyncHandler('article_reads', {
    push: (entityId, operation, payload) =>
      articleRepository.syncArticleReadToRemote(entityId, operation, payload),
    pull: () => articleRepository.pullArticleReadsFromRemote(),
  });

  registerSyncHandler('settings', {
    push: (entityId, operation, payload) =>
      profileRepository.syncSettingsToRemote(entityId, operation, payload),
    pull: () => profileRepository.pullSettingsFromRemote(),
  });

  registerSyncHandler('mini_app_snapshots', {
    push: (entityId, operation, payload) =>
      miniAppSnapshotRepository.syncToRemote(entityId, operation, payload),
    pull: () => miniAppSnapshotRepository.pullFromRemote(),
  });

  registerSyncHandler('health_timeline_events', {
    push: (entityId, operation, payload) =>
      healthTimelineRepository.syncToRemote(entityId, operation, payload),
    pull: () => healthTimelineRepository.pullFromRemote(),
  });

  registerSyncHandler('family_households', {
    push: (entityId, operation, payload) =>
      familyRepository.syncHouseholdToRemote(entityId, operation, payload),
    pull: async () => {
      const userId = currentUserId();
      if (userId) {
        await familyRepository.pullFromRemote(userId);
      }
    },
  });

  registerSyncHandler('family_members', {
    push: (entityId, operation, payload) =>
      familyRepository.syncMemberToRemote(entityId, operation, payload),
    pull: async () => {
      const userId = currentUserId();
      if (userId) {
        await familyRepository.pullFromRemote(userId);
      }
    },
  });

  registerSyncHandler('family_connection_requests', {
    push: (entityId, operation, payload) =>
      familyRepository.syncRequestToRemote(entityId, operation, payload),
    pull: async () => {
      const userId = currentUserId();
      if (userId) {
        await familyRepository.pullFromRemote(userId);
      }
    },
  });

  registerSyncHandler('subscriptions', {
    push: async () => {
      // Entitlements are server-owned (webhooks). Device never pushes.
    },
    pull: () => billingRepository.pullFromRemote(),
  });

  registerSyncHandler('notifications', {
    push: (entityId, operation, payload) =>
      notificationRepository.syncToRemote(entityId, operation, payload),
    pull: async () => {
      const userId = currentUserId();
      if (userId) {
        await notificationRepository.pullFromRemote(userId);
      }
    },
  });

  registerSyncHandler('ad_catalog', {
    push: async () => {
      // Campaigns / config / creatives / placements are portal-managed.
    },
    pull: () => adsRepository.pullFromRemote(),
  });

  registerSyncHandler('ad_events', {
    push: (entityId, operation, payload) =>
      adsRepository.syncEventToRemote(entityId, operation, payload),
    pull: async () => {
      // Events are device → cloud only.
    },
  });
}
