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

Primary brand teal: **`#0D9488`**

Defined in `src/theme/colors.ts` → `palette`:

| Token | Value | Usage |
|-------|-------|-------|
| `primary` | `#0D9488` | Buttons, active tab, links |
| `primaryLight` | `#CCFBF1` | Light teal backgrounds |
| `primaryDark` | `#0F766E` | Pressed / emphasis |
| `brandBlue` | `#2563EB` | Nearby / secondary accent |
| `background` | `#FFFFFF` | Screen background (light) |
| `surface` | `#F8FAFC` | Screen wash behind cards |
| `text` | `#111827` | Primary text |
| `textSecondary` | `#6B7280` | Subtitles, captions |
| `divider` | `#E5E7EB` | Borders |

Dark mode is **not supported**. CareMate is light-only (`userInterfaceStyle: light`, Uniwind/Gluestack forced to `light`), even when the device system appearance is dark. Appearance toggles were removed from Settings.

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

| Token | Value | Typical use |
|-------|-------|-------------|
| `layoutSpacing.screenHorizontal` | 20px | Screen edge inset |
| `layoutSpacing.cardPadding` | 16px | Inside cards |
| `layoutSpacing.welcomeToSubtitle` | 6px | Title → supporting line |
| `layoutSpacing.sectionTitleToContent` | 16px | Section header → content; **default gap between home sections / stacked cards** |
| `layoutSpacing.betweenSections` | 32px | Reserved for rare major breaks (prefer 16px on main tabs) |
| `spacing.xs` – `spacing.xl` | 4 – 32px | General scale |
| `radius.sm` – `radius.xxl` | Border radius scale | — |
| `shadow.soft` / `shadow.card` | Elevation | Cards |

### Tab spacing rhythm

Main tabs (Home, Learn, Nearby, Apps, Me) use a tightened rhythm so stacks of cards do not feel airy:

| Pattern | Target |
|---------|--------|
| Greeting / title → subtitle | ~6px |
| Hero → first control / search | ~16px |
| Stacked cards / ad slots / section blocks | ~8–16px (`spacing.sm` or `sectionTitleToContent`) |
| Chip / filter rows | horizontal scroll; ~10px between chips |
| List item separators | ~12px |

Avoid stacking a component’s own `marginBottom` on top of a parent `gap` (use `OfflineBanner` `flush` and `HealthCategoriesRow` filter flush mode on Learn/Nearby).

Notifications inbox uses an indigo header/card accent (`#4F46E5`) distinct from Nearby blue and brand teal.

Catalog ad cards use **blue** washes (sky for house, richer blue for sponsored) — see [Ads](./ads.md).

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
