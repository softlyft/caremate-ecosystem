import { Check, ChevronDown, Search, X } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { Button, Input } from '@/components/ui/form-controls';
import { localizationService } from '@/domains/localization';
import { fontFamily, palette, radius, shadow, spacing } from '@/theme';

export type CountrySelectProps = {
  value: string | null;
  onChange: (countryCode: string | null) => void;
  placeholder: string;
  searchPlaceholder: string;
  searchEmptyLabel: string;
  sheetTitle: string;
  /** Optional first row that clears the selection (e.g. Global / worldwide). */
  nullOptionLabel?: string;
  closeAccessibilityLabel?: string;
  accent?: string;
  soft?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Compact trigger + searchable bottom-sheet picker for worldwide country lists.
 */
export function CountrySelect({
  value,
  onChange,
  placeholder,
  searchPlaceholder,
  searchEmptyLabel,
  sheetTitle,
  nullOptionLabel,
  closeAccessibilityLabel = 'Close',
  accent = palette.primary,
  soft = palette.primaryLight,
  style,
}: CountrySelectProps) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const selectedName =
    value == null && nullOptionLabel
      ? nullOptionLabel
      : value
        ? localizationService.getCountryName(value)
        : null;

  const countries = useMemo(() => {
    const all = localizationService.listCountryOptions();
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return all;
    }
    return all.filter(
      (country) =>
        country.name.toLowerCase().includes(normalized) ||
        country.code.toLowerCase().includes(normalized),
    );
  }, [query]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [open]);

  function close() {
    setOpen(false);
    setQuery('');
    setKeyboardHeight(0);
  }

  const windowHeight = Dimensions.get('window').height;
  const keyboardOpen = keyboardHeight > 0;
  const sheetMaxHeight = keyboardOpen
    ? Math.max(280, windowHeight - keyboardHeight - Math.max(insets.top, spacing.md) - spacing.md)
    : Math.round(windowHeight * 0.78);

  return (
    <>
      <Button
        accessibilityRole="button"
        accessibilityLabel={selectedName ?? placeholder}
        accessibilityHint={sheetTitle}
        style={[
          styles.trigger,
          value ? { borderColor: accent, backgroundColor: soft } : null,
          style,
        ]}
        scale={0.98}
        onPress={() => setOpen(true)}
        variant="plain"
      >
        <AppText
          variant="body"
          style={value ? [styles.triggerValue, { color: accent }] : styles.triggerPlaceholder}
          numberOfLines={1}
        >
          {selectedName ?? placeholder}
        </AppText>
        <ChevronDown color={value ? accent : palette.textSecondary} size={18} strokeWidth={2.25} />
      </Button>

      <Modal
        animationType="slide"
        onRequestClose={close}
        presentationStyle="overFullScreen"
        transparent
        visible={open}
      >
        <View
          style={[
            styles.modalRoot,
            // Lift the whole sheet above the soft keyboard so the search field stays visible.
            { paddingBottom: keyboardHeight },
          ]}
        >
          <Pressable
            accessibilityLabel={closeAccessibilityLabel}
            onPress={close}
            style={StyleSheet.absoluteFill}
          />
          <View
            style={[
              styles.sheet,
              {
                maxHeight: sheetMaxHeight,
                // Fixed minHeight fights the keyboard and can shove the search field under it.
                minHeight: keyboardOpen ? undefined : 420,
                paddingBottom: Math.max(insets.bottom, spacing.md),
              },
            ]}
          >
            <View style={styles.sheetHeader}>
              <View style={styles.sheetHeaderText}>
                <AppText variant="cardTitle">{sheetTitle}</AppText>
              </View>
              <Button
                accessibilityLabel={closeAccessibilityLabel}
                accessibilityRole="button"
                onPress={close}
                style={styles.closeButton}
                variant="plain"
              >
                <X color={palette.text} size={18} strokeWidth={2.25} />
              </Button>
            </View>

            <View style={styles.searchRow}>
              <Search color={accent} size={16} strokeWidth={2.25} />
              <View style={styles.searchInput}>
                <Input
                  placeholder={searchPlaceholder}
                  value={query}
                  onChangeText={setQuery}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus
                />
              </View>
            </View>

            <FlatList
              data={countries}
              keyExtractor={(item) => item.code}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              style={styles.list}
              contentContainerStyle={
                countries.length === 0 && !nullOptionLabel ? styles.listEmpty : styles.listContent
              }
              ListHeaderComponent={
                nullOptionLabel && !query.trim() ? (
                  <Button
                    accessibilityRole="button"
                    accessibilityState={{ selected: value == null }}
                    style={[
                      styles.option,
                      value == null ? { backgroundColor: soft, borderColor: accent } : null,
                    ]}
                    scale={0.98}
                    onPress={() => {
                      onChange(null);
                      close();
                    }}
                    variant="plain"
                  >
                    <AppText
                      variant="body"
                      style={
                        value == null ? [styles.optionLabelSelected, { color: accent }] : undefined
                      }
                      numberOfLines={1}
                    >
                      {nullOptionLabel}
                    </AppText>
                    {value == null ? <Check color={accent} size={18} strokeWidth={2.4} /> : null}
                  </Button>
                ) : null
              }
              ListEmptyComponent={
                <AppText variant="caption" style={styles.emptySearch}>
                  {searchEmptyLabel}
                </AppText>
              }
              renderItem={({ item }) => {
                const selected = value === item.code;
                return (
                  <Button
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    style={[
                      styles.option,
                      selected ? { backgroundColor: soft, borderColor: accent } : null,
                    ]}
                    scale={0.98}
                    onPress={() => {
                      onChange(item.code);
                      close();
                    }}
                    variant="plain"
                  >
                    <AppText
                      variant="body"
                      style={selected ? [styles.optionLabelSelected, { color: accent }] : undefined}
                      numberOfLines={1}
                    >
                      {item.name}
                    </AppText>
                    {selected ? <Check color={accent} size={18} strokeWidth={2.4} /> : null}
                  </Button>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    minHeight: 48,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: palette.divider,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    backgroundColor: palette.surface,
  },
  triggerPlaceholder: {
    color: palette.textSecondary,
    flex: 1,
  },
  triggerValue: {
    fontFamily: fontFamily.semiBold,
    flex: 1,
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.42)',
  },
  sheet: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.md,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: palette.background,
    ...shadow.card,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  sheetHeaderText: {
    flex: 1,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: palette.surface,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
  },
  list: {
    flexGrow: 1,
    flexShrink: 1,
  },
  listContent: {
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  listEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  emptySearch: {
    color: palette.textSecondary,
    textAlign: 'center',
  },
  option: {
    minHeight: 48,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'transparent',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    backgroundColor: palette.surface,
  },
  optionLabelSelected: {
    fontFamily: fontFamily.semiBold,
    flex: 1,
  },
});
