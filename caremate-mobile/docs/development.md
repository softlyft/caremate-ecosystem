# Development Guide

[← Back to index](./README.md)

## Daily workflow

```bash
# Start dev server
npx expo start --clear

# Before PR / CI locally
npm run format:write   # apply Prettier
npm run format         # check Prettier (CI)
npm run lint
npm run typecheck
npm run test
```

GitHub Actions:

- `.github/workflows/ci.yml` — format → lint → typecheck → test on PRs and pushes to main/staging
- `.github/workflows/ios-testflight.yml` — dev TestFlight on **`main`** (see [Mobile release](./mobile-release.md))
- `.github/workflows/ios-app-store.yml` — App Store build on **`prod`**
- `.github/workflows/android-play.yml` — Play production AAB on **`prod`**
- `.github/workflows/mobile-cd.yml` — sideload Android APK artifact after CI on **`main`**
---

## Coding standards

From `CareMate.md` and project conventions:

### TypeScript

- Strict mode — no implicit `any`
- Define interfaces in `src/types/` before implementations
- Use path alias `@/` for imports

### Architecture

- **Business logic in repositories**, not screens
- **No direct Supabase calls in UI**
- **No server collections in Zustand**
- Screens handle presentation + loading/empty/error states only

### Components

- Avoid god components — split when a screen exceeds ~200 lines
- Use `AppText` with variants, not raw `Text`
- Reuse `LoadingState`, `EmptyState`, `Button`, `Input` from `components/ui/`

### Offline-first

Every new persistent feature must:
1. Write to SQLite first
2. Queue sync operation
3. Work without network

Exception: mini-apps (currently AsyncStorage only).

---

## Adding a new screen

1. Create file under `src/app/` following Expo Router conventions
2. If it needs a header, register in parent `_layout.tsx`:
   ```typescript
   <Stack.Screen name="my-screen" options={{ headerShown: true, title: 'My Screen' }} />
   ```
3. Use `LoadingState` while data loads
4. Wire data via `useQuery` + repository

---

## Adding a new repository

1. Define types in `src/types/index.ts`
2. Add Drizzle table to `database/schema.ts`
3. Add `CREATE TABLE` to `database/client.ts`
4. Create `repositories/my-repository.ts` extending `BaseRepository`
5. Add sync handler in `sync/engine.ts`
6. Add `QUERY_KEYS` entry
7. Document in [Data Layer](./data-layer.md)

---

## Adding a TanStack Query hook pattern

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/config';
import { myRepository } from '@/repositories/my-repository';
import { useCurrentUserId } from '@/hooks/use-current-user-id';

function useMyData() {
  const userId = useCurrentUserId();
  return useQuery({
    queryKey: QUERY_KEYS.myData(userId),
    queryFn: () => myRepository.findByUserId(userId),
  });
}

function useSaveMyData() {
  const queryClient = useQueryClient();
  const userId = useCurrentUserId();
  return useMutation({
    mutationFn: (data) => myRepository.save(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.myData(userId) });
    },
  });
}
```

---

## Forms

Use React Hook Form + Zod (see login/register screens):

```typescript
const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const { control, handleSubmit } = useForm({
  resolver: zodResolver(schema),
});
```

---

## Styling guide

| Context | Approach |
|---------|----------|
| Home, mini-apps | `StyleSheet` + `palette` + `AppText` |
| Settings, Gluestack layouts | `className` + Uniwind |
| Icons | `lucide-react-native` |

Do not rely on Tailwind text size classes for critical typography on native — use `AppText` variants.

---

## Database changes

**Current process (manual):**
1. Edit `schema.ts`
2. Add matching `CREATE TABLE` or `ALTER` SQL to `client.ts`
3. Update repository mapping

**Future process (Drizzle Kit):**
1. Edit `schema.ts`
2. `npm run db:generate`
3. Apply migration in `client.ts` or migration runner

---

## Debugging

| Issue | Approach |
|-------|----------|
| SQLite errors | Check `BootstrapGate` error message; retry on device |
| Sync not working | Verify `.env`, network, Supabase RLS policies |
| Route not found | Check file path matches route; restart with `--clear` |
| Types wrong after new route | Restart Expo to regenerate `.expo/types/` |
| Mini-app state lost | AsyncStorage cleared on reinstall — expected |

### React Query Devtools

Not currently installed. Inspect cache via logging in development.

---

## Git conventions

- Do not commit `.env` (secrets)
- Do not commit `caremate.db` if created locally
- `node_modules/` is gitignored

---

## Testing

| Tool | Status |
|------|--------|
| Jest (`jest-expo`) | Configured — `npm run test` |
| Detox E2E | Not configured |
| TypeScript | `npm run typecheck` |
| ESLint | `npm run lint` |
| Prettier | `npm run format` / `npm run format:write` |

Unit tests live next to code (e.g. `src/utils/__tests__/helpers-test.ts`) or as `*-test.ts(x)` files. Prefer:
- Unit tests for `utils/` and repository mapping logic
- Integration tests for sync queue processing
- E2E for critical flows (emergency profile, auth)
---

## AI / agent development

- Read [`AGENTS.md`](../AGENTS.md) — points to Expo SDK 57 docs
- Read [`CareMate.md`](../CareMate.md) — architectural intent
- Use this `docs/` folder for current implementation state

---

## Related docs

- [Project Structure](./project-structure.md)
- [Architecture](./architecture.md)
- [Getting Started](./getting-started.md)
