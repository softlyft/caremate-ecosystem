jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('@/lib/supabase', () => {
  const queryBuilder = () => {
    const builder: Record<string, jest.Mock> = {};
    const self = () => builder;
    for (const method of [
      'select',
      'insert',
      'update',
      'delete',
      'upsert',
      'eq',
      'in',
      'order',
      'limit',
    ]) {
      builder[method] = jest.fn(self);
    }
    builder.single = jest.fn(async () => ({ data: null, error: null }));
    builder.maybeSingle = jest.fn(async () => ({ data: null, error: null }));
    return builder;
  };

  return {
    supabase: {
      auth: {
        getSession: jest.fn(async () => ({ data: { session: null }, error: null })),
        getUser: jest.fn(async () => ({ data: { user: null }, error: null })),
        onAuthStateChange: jest.fn(() => ({
          data: { subscription: { unsubscribe: jest.fn() } },
        })),
        signOut: jest.fn(async () => ({ error: null })),
        signInWithPassword: jest.fn(async () => ({ data: { session: null }, error: null })),
        signUp: jest.fn(async () => ({ data: { session: null }, error: null })),
        resetPasswordForEmail: jest.fn(async () => ({ error: null })),
        updateUser: jest.fn(async () => ({ data: { user: null }, error: null })),
      },
      from: jest.fn(queryBuilder),
      rpc: jest.fn(async () => ({ data: null, error: null })),
      functions: {
        invoke: jest.fn(async () => ({ data: null, error: null })),
      },
    },
  };
});

jest.mock('@/mini-apps/_kit/synced-storage', () => ({
  createMiniAppSyncedStorage: () => {
    const { mockCreateMemoryStorage } = require('@/mini-apps/test-utils');
    return mockCreateMemoryStorage();
  },
}));

jest.mock('uuid', () => {
  let sequence = 0;
  return {
    v4: jest.fn(() => {
      sequence += 1;
      return `test-uuid-${sequence}`;
    }),
  };
});

jest.mock('lucide-react-native', () => {
  const icon = () => null;
  return new Proxy(
    {},
    {
      get: () => icon,
    },
  );
});

jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  wrap: (component: unknown) => component,
  captureException: jest.fn(),
  setUser: jest.fn(),
  ReactNativeTracing: jest.fn(),
}));

jest.mock('posthog-react-native', () => ({
  PostHogProvider: ({ children }: { children: unknown }) => children,
  usePostHog: () => null,
}));
