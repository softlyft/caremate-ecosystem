import { Link, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { Linking, Pressable, type StyleProp, type TextStyle } from 'react-native';

import { AppText } from '@/components/ui/AppText';

type TextLinkProps = {
  href: string | Href;
  children: ReactNode;
  external?: boolean;
  style?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
};

export function TextLink({ href, children, external, style, accessibilityLabel }: TextLinkProps) {
  const label = (
    <AppText variant="seeAll" style={style}>
      {children}
    </AppText>
  );

  if (external) {
    return (
      <Pressable
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="link"
        hitSlop={6}
        onPress={() => void Linking.openURL(String(href))}
      >
        {label}
      </Pressable>
    );
  }

  return (
    <Link href={href as Href} asChild accessibilityLabel={accessibilityLabel}>
      <Pressable accessibilityRole="link" hitSlop={6}>
        {label}
      </Pressable>
    </Link>
  );
}
