# UI & Theme

[← Back to index](./README.md)

## UI stack

| Layer | Package | Purpose |
|-------|---------|---------|
| Component library | Gluestack UI v5 (`@gluestack-ui/core`) | Accessible primitives |
| Styling | Uniwind + Tailwind CSS v4 | Utility classes |
| Icons | Lucide React Native | Tab bar, actions, cards |
| Images | `expo-image` | Optimized image loading |
| Motion | `react-native-reanimated` | Animations (available) |

Global styles: `global.css` (imported in root `_layout.tsx`).  
Metro config: `metro.config.js` wires Uniwind and processes `global.css`.

---

## Brand colors

Primary brand green: **`#16A34A`**

Defined in `src/theme/colors.ts` → `palette`:

| Token | Value | Usage |
|-------|-------|-------|
| `primary` | `#16A34A` | Buttons, active tab, links |
| `primaryLight` | `#DCFCE7` | Light green backgrounds |
| `primaryDark` | `#15803D` | Pressed states |
| `brandBlue` | `#2563EB` | Secondary accent |
| `background` | `#FFFFFF` | Screen background (light) |
| `surface` | `#F9FAFB` | Card surfaces |
| `text` | `#111827` | Primary text |
| `textSecondary` | `#6B7280` | Subtitles, captions |
| `divider` | `#E5E7EB` | Borders |

Dark mode semantic tokens exist in `colors.dark` and are used by `useAppTheme()` and GluestackUIProvider.

---

## Typography

Font family: **Inter** (400, 500, 600, 700) via `@expo-google-fonts/inter`.

Loaded in `src/hooks/use-app-fonts.ts`. Root layout returns `null` until fonts load.

### `AppText` component

**Always use `AppText` for styled text** — not raw `Text` or Gluestack `Text` with size defaults.

```typescript
import { AppText } from '@/components/ui/AppText';

<AppText variant="screenTitle">Hello</AppText>
<AppText variant="subtitle" color="muted">Subtitle</AppText>
```

Variants defined in `src/theme/typography.ts`:

| Variant | Typical use |
|---------|-------------|
| `heroGreeting` | Home greeting (24px bold) |
| `screenTitle` | Screen headers |
| `sectionTitle` | Section headers |
| `cardTitle` | Card headings |
| `articleTitle` | Article cards |
| `providerName` | Provider list items |
| `quickActionTitle` | Quick action grid |
| `quickActionSubtitle` | Secondary labels |
| `body` | Body copy |
| `subtitle` | Secondary text (13px) |
| `caption` | Small labels |
| `button` | Button labels |
| `navLabel` | Tab bar labels |
| `comingSoon` | Disabled feature badges |

Typography tokens are applied as **React Native style objects** in `AppText`, not Tailwind classes — native text sizing is unreliable via UniWind classes alone.

### Uniwind classes

`typographyClasses` in `typography.ts` mirrors tokens for Gluestack/className usage (settings screen, etc.).

---

## Spacing & layout

From `src/theme/colors.ts` and `typography.ts`:

| Token | Value |
|-------|-------|
| `layoutSpacing.screenHorizontal` | 20px |
| `layoutSpacing.cardPadding` | 16px |
| `spacing.xs` – `spacing.xl` | 4 – 32px scale |
| `radius.sm` – `radius.xxl` | Border radius scale |
| `shadow.soft` | Subtle card elevation |

---

## Shared components

### Form controls (`components/ui/form-controls.tsx`)

| Export | Description |
|--------|-------------|
| `Button` | Primary / secondary / ghost; maps to Gluestack Button |
| `Input` | Rounded text input |
| `SectionTitle` | Large title + optional subtitle |

### Screen states (`components/ui/screen-states.tsx`)

| Export | When to use |
|--------|-------------|
| `LoadingState` | Data fetching |
| `EmptyState` | No results |
| `ErrorState` | Failed load with retry |
| `Screen` | Standard padded screen wrapper |
| `Card` | Bordered content card |

### Offline banner (`components/OfflineBanner.tsx`)

Amber banner shown at top of Home when `useNetworkStatus()` reports offline.

---

## Gluestack provider

`GluestackUIProvider` wraps the app in `src/app/_layout.tsx`:

```typescript
<GluestackUIProvider mode={colorScheme === 'dark' ? 'dark' : 'light'}>
```

Mode follows system color scheme.

---

## Styling conventions in practice

The codebase uses **two patterns**:

1. **StyleSheet + palette tokens** — Home screen, mini-apps (predictable on native)
2. **className + Uniwind** — Settings, some Gluestack screens

When adding new screens, prefer StyleSheet + `AppText` + `palette` for consistency with home and mini-apps unless building with Gluestack layout primitives (`Box`, `VStack`, `HStack`).

### Example card pattern

```typescript
<View style={[styles.card, shadow.soft]}>
  <AppText variant="cardTitle">Title</AppText>
  <AppText variant="body">Content</AppText>
</View>

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.background,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: palette.divider,
    padding: layoutSpacing.cardPadding,
  },
});
```

---

## Assets

| Asset | Path | Usage |
|-------|------|-------|
| App icon | `assets/images/caremate-logo.png` | App icon, adaptive icon |
| Header logo | `assets/images/caremate-logo-header.png` | Home header (transparent bg) |
| Splash icon | `assets/images/caremate-splash-icon.png` | Splash (icon only, no text) |
| iOS icon | `assets/expo.icon` | iOS app icon (Icon Composer) |

---

## Related docs

- [Core Features — Home](./features.md#home-tab) — home UI components
- [Mini-Apps](./mini-apps.md) — per-app color themes
- [Configuration](./configuration.md) — splash and icon config in app.json
