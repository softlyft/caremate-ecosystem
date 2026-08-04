import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimatedSection } from '@/components/motion/AnimatedSection';
import { LinearGradientFill } from '@/components/motion/LinearGradientFill';
import { AppText } from '@/components/ui/AppText';
import { Button, Card, ChoiceChip } from '@/components/ui/form-controls';
import {
  MiniAppKeyboardContext,
  useScheduleFocusedInputScroll,
} from '@/hooks/use-keyboard-aware-scroll';
import type { MiniAppId } from '@/mini-apps/_kit/registry';
import { getMiniAppTheme, type MiniAppTheme } from '@/mini-apps/_kit/theme';
import { layoutSpacing, palette, radius, shadow, spacing } from '@/theme';

/** Stack / modal header ≈ 56pt; used for KeyboardAvoidingView offset on iOS. */
const MINI_APP_HEADER_HEIGHT = 56;

export function MiniAppScreen({
  children,
  contentStyle,
}: {
  children: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const scrollYRef = useRef(0);
  const keyboardTopRef = useRef(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const keyboardApi = useScheduleFocusedInputScroll(scrollRef, scrollYRef, keyboardTopRef);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (event) => {
      keyboardTopRef.current = event.endCoordinates.screenY;
      setKeyboardHeight(event.endCoordinates.height);
      keyboardApi.scheduleScrollIntoView();
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      keyboardTopRef.current = 0;
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [keyboardApi]);

  // Extra scroll room so bottom fields (Notes, Provider, refill threshold) can rise above the keyboard.
  // Applied on both platforms: Android resize alone is not enough when content is short or focus
  // moves between fields while the keyboard stays open.
  const bottomPad =
    keyboardHeight > 0
      ? Math.max(keyboardHeight - insets.bottom, 0) + spacing.xl * 2
      : insets.bottom + spacing.xl;

  const keyboardVerticalOffset = Platform.OS === 'ios' ? insets.top + MINI_APP_HEADER_HEIGHT : 0;

  function onScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    scrollYRef.current = event.nativeEvent.contentOffset.y;
  }

  return (
    <MiniAppKeyboardContext.Provider value={keyboardApi}>
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={keyboardVerticalOffset}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          // Avoid stacking RN content insets on top of KeyboardAvoidingView + our bottom pad.
          automaticallyAdjustKeyboardInsets={false}
          contentInsetAdjustmentBehavior="never"
          nestedScrollEnabled
          scrollEventThrottle={16}
          onScroll={onScroll}
          contentContainerStyle={[styles.content, { paddingBottom: bottomPad }, contentStyle]}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </MiniAppKeyboardContext.Provider>
  );
}

type HeroProps = {
  appId: MiniAppId;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  index?: number;
  trailing?: ReactNode;
};

export function MiniAppHero({ appId, eyebrow, title, subtitle, index = 0, trailing }: HeroProps) {
  const theme = getMiniAppTheme(appId);
  const Icon = theme.icon;

  return (
    <AnimatedSection index={index}>
      <View style={[styles.heroShell, shadow.soft]}>
        <LinearGradientFill
          colors={[
            { offset: '0%', color: theme.backgroundColor },
            { offset: '55%', color: theme.backgroundColor },
            { offset: '100%', color: theme.softEnd },
          ]}
          angle={125}
          style={styles.hero}
        >
          <View style={styles.heroBlob} />
          <View style={[styles.heroBlobSm, { backgroundColor: theme.color, opacity: 0.12 }]} />

          <View style={styles.heroTop}>
            <View style={[styles.heroIconRing, { borderColor: `${theme.color}33` }]}>
              <View style={[styles.heroIconInner, { backgroundColor: `${theme.color}18` }]}>
                <Icon color={theme.color} size={24} strokeWidth={2.25} />
              </View>
            </View>
            {trailing}
          </View>

          {eyebrow ? (
            <AppText variant="caption" style={[styles.heroEyebrow, { color: theme.color }]}>
              {eyebrow}
            </AppText>
          ) : null}
          <AppText variant="screenTitle" style={[styles.heroTitle, { color: theme.titleColor }]}>
            {title}
          </AppText>
          {subtitle ? (
            <AppText
              variant="subtitle"
              style={[styles.heroSubtitle, { color: theme.subtitleColor }]}
            >
              {subtitle}
            </AppText>
          ) : null}
        </LinearGradientFill>
      </View>
    </AnimatedSection>
  );
}

type CardProps = {
  children: ReactNode;
  index?: number;
  style?: StyleProp<ViewStyle>;
  title?: string;
  eyebrow?: string;
  theme?: MiniAppTheme;
};

export function MiniAppCard({ children, index = 1, style, title, eyebrow, theme }: CardProps) {
  return (
    <AnimatedSection index={index}>
      <Card style={[styles.card, style]} padded={false}>
        {title || eyebrow ? (
          <View style={styles.cardHeader}>
            {eyebrow ? (
              <AppText
                variant="caption"
                style={[styles.cardEyebrow, theme ? { color: theme.color } : null]}
              >
                {eyebrow}
              </AppText>
            ) : null}
            {title ? <AppText variant="cardTitle">{title}</AppText> : null}
          </View>
        ) : null}
        {children}
      </Card>
    </AnimatedSection>
  );
}

type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  accent: string;
  soft: string;
  disabled?: boolean;
};

export function MiniAppChip({ label, selected, onPress, accent, soft, disabled }: ChipProps) {
  if (!onPress) {
    return (
      <View
        style={[
          styles.chip,
          selected
            ? { backgroundColor: soft, borderColor: accent }
            : { backgroundColor: palette.background, borderColor: palette.divider },
        ]}
      >
        <AppText
          variant="caption"
          style={{ color: selected ? accent : palette.text, fontWeight: selected ? '600' : '500' }}
        >
          {label}
        </AppText>
      </View>
    );
  }

  return (
    <ChoiceChip
      label={label}
      selected={selected}
      onPress={onPress}
      accent={accent}
      soft={soft}
      disabled={disabled}
    />
  );
}

type RowProps = {
  title: string;
  subtitle?: string;
  onPress?: () => void;
  trailing?: ReactNode;
  accent?: string;
  soft?: string;
};

export function MiniAppRow({ title, subtitle, onPress, trailing, soft }: RowProps) {
  const body = (
    <View style={styles.row}>
      <View style={[styles.rowAccent, soft ? { backgroundColor: soft } : null]} />
      <View style={styles.rowCopy}>
        <AppText variant="body" style={styles.rowTitle}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" style={styles.rowSubtitle}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {trailing}
    </View>
  );

  if (!onPress) {
    return body;
  }

  return (
    <Button onPress={onPress} style={styles.rowPressable} variant="plain">
      {body}
    </Button>
  );
}

export function MiniAppProgress({
  progress,
  accent,
  label,
}: {
  progress: number;
  accent: string;
  label?: string;
}) {
  const clamped = Math.max(0, Math.min(1, progress));
  return (
    <View style={styles.progressBlock}>
      {label ? (
        <AppText variant="caption" style={styles.progressLabel}>
          {label}
        </AppText>
      ) : null}
      <View style={styles.progressTrack}>
        <View
          style={[styles.progressFill, { width: `${clamped * 100}%`, backgroundColor: accent }]}
        />
      </View>
    </View>
  );
}

export function MiniAppCta({
  label,
  onPress,
  accent,
  soft,
  index = 8,
  secondary,
}: {
  label: string;
  onPress: () => void;
  accent: string;
  soft: string;
  index?: number;
  secondary?: boolean;
}) {
  return (
    <AnimatedSection index={index}>
      <Button
        label={label}
        onPress={onPress}
        style={[
          styles.cta,
          secondary
            ? { backgroundColor: soft, borderColor: accent, borderWidth: 1 }
            : { backgroundColor: accent },
          shadow.soft,
        ]}
        textStyle={{ color: secondary ? accent : '#FFFFFF', textAlign: 'center' }}
        variant="plain"
      />
    </AnimatedSection>
  );
}

export function StatusPill({
  label,
  color,
  background,
}: {
  label: string;
  color: string;
  background: string;
}) {
  return (
    <View style={[styles.statusPill, { backgroundColor: background }]}>
      <AppText variant="caption" style={{ color, fontWeight: '600', fontSize: 11 }}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.surface,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: layoutSpacing.screenHorizontal,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  heroShell: {
    borderRadius: radius.xxl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.05)',
  },
  hero: {
    borderRadius: radius.xxl,
    padding: layoutSpacing.cardPadding + 2,
    gap: 8,
    minHeight: 148,
  },
  heroBlob: {
    position: 'absolute',
    top: -36,
    right: -28,
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  heroBlobSm: {
    position: 'absolute',
    bottom: 20,
    left: -34,
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 1,
  },
  heroIconRing: {
    width: 52,
    height: 52,
    borderRadius: radius.xl,
    padding: 3,
    borderWidth: 1.5,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  heroIconInner: {
    flex: 1,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroEyebrow: {
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontSize: 11,
    fontWeight: '600',
    zIndex: 1,
  },
  heroTitle: {
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.5,
    zIndex: 1,
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    zIndex: 1,
    maxWidth: '96%',
  },
  card: {
    padding: layoutSpacing.cardPadding,
    gap: spacing.sm,
  },
  cardHeader: {
    gap: 2,
    marginBottom: 2,
  },
  cardEyebrow: {
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    fontSize: 11,
    color: palette.primary,
  },
  chip: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  rowPressable: {
    borderRadius: radius.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  rowAccent: {
    width: 4,
    alignSelf: 'stretch',
    borderRadius: 4,
    backgroundColor: palette.surface,
    minHeight: 36,
  },
  rowCopy: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  rowSubtitle: {
    color: palette.textSecondary,
    lineHeight: 17,
  },
  progressBlock: {
    gap: 8,
  },
  progressLabel: {
    color: palette.textSecondary,
  },
  progressTrack: {
    height: 10,
    borderRadius: radius.full,
    backgroundColor: palette.surface,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.full,
  },
  cta: {
    minHeight: 52,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
});
