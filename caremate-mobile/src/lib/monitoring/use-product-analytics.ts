import { useEffect } from 'react';

import type { MiniAppId } from '@/mini-apps/_kit/registry';
import {
  trackEmergencyProfileViewed,
  trackFamilyOpened,
  trackLearningOpened,
  trackMessagingOpened,
  trackMiniAppViewed,
  trackNearbyOpened,
} from '@/lib/monitoring/product-analytics';

export function useMiniAppViewed(miniApp: MiniAppId): void {
  useEffect(() => {
    trackMiniAppViewed(miniApp);
  }, [miniApp]);
}

export function useNearbyOpened(): void {
  useEffect(() => {
    trackNearbyOpened();
  }, []);
}

export function useLearningOpened(): void {
  useEffect(() => {
    trackLearningOpened();
  }, []);
}

export function useMessagingOpened(): void {
  useEffect(() => {
    trackMessagingOpened();
  }, []);
}

export function useFamilyOpened(): void {
  useEffect(() => {
    trackFamilyOpened();
  }, []);
}

export function useEmergencyProfileViewed(): void {
  useEffect(() => {
    trackEmergencyProfileViewed();
  }, []);
}
