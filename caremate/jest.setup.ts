jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

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
