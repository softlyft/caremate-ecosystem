import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { images } from '@/constants/assets';
import { spacing } from '@/theme';

const LOGO_ASPECT = 1774 / 887;
const LOGO_HEIGHT = 40;

type AuthBrandHeaderProps = {
  children?: ReactNode;
};

/** CareMate wordmark used above Login / Create Account titles. */
export function AuthBrandHeader({ children }: AuthBrandHeaderProps) {
  return (
    <View style={styles.wrap}>
      <Image
        source={images.logoHeader}
        style={styles.logo}
        contentFit="contain"
        contentPosition="left center"
        accessibilityLabel="CareMate"
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.md,
  },
  logo: {
    height: LOGO_HEIGHT,
    width: LOGO_HEIGHT * LOGO_ASPECT,
    maxWidth: '70%',
    alignSelf: 'flex-start',
    backgroundColor: 'transparent',
  },
});
