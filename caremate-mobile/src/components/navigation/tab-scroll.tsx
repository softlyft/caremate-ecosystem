import { Platform, FlatList as RNFlatList, ScrollView as RNScrollView } from 'react-native';
import { FlatList as GHFlatList, ScrollView as GHScrollView } from 'react-native-gesture-handler';

import { spacing } from '@/theme';

/**
 * Tab screens: use native RN scrollables on iOS (UIScrollView re-attaches pan gestures
 * reliably after tab focus). Android keeps RNGH lists for nested gesture compatibility.
 */
export const TabScrollView = Platform.OS === 'ios' ? RNScrollView : GHScrollView;
export const TabFlatList = Platform.OS === 'ios' ? RNFlatList : GHFlatList;

/** Top padding for tab scroll content — iOS `automatic` insets already include safe area. */
export function tabContentPaddingTop(topInset: number, extra = spacing.sm): number {
  return Platform.OS === 'ios' ? extra : topInset + extra;
}

/** Shared iOS scroll tuning for tab lists. */
export const iosTabScrollProps =
  Platform.OS === 'ios'
    ? ({
        directionalLockEnabled: true,
        keyboardDismissMode: 'on-drag',
        contentInsetAdjustmentBehavior: 'automatic',
        removeClippedSubviews: false,
      } as const)
    : ({} as const);
