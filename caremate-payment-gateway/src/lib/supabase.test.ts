import { beforeEach, describe, expect, it, vi } from 'vitest';

const getSession = vi.fn();
const setSession = vi.fn();
const invoke = vi.fn();
const replaceState = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: {
      getSession: (...args: unknown[]) => getSession(...args),
      setSession: (...args: unknown[]) => setSession(...args),
    },
    functions: {
      invoke: (...args: unknown[]) => invoke(...args),
    },
  }),
}));

describe('hydrateSessionFromHash', () => {
  beforeEach(() => {
    getSession.mockReset();
    setSession.mockReset();
    invoke.mockReset();
    replaceState.mockReset();
    vi.resetModules();
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key');
  });

  it('returns the existing session when the hash is empty', async () => {
    vi.stubGlobal('window', {
      location: { hash: '', pathname: '/checkout', search: '?plan=personal' },
      history: { replaceState },
    });
    getSession.mockResolvedValue({ data: { session: { access_token: 'a' } } });

    const { hydrateSessionFromHash } = await import('@/lib/supabase');
    await expect(hydrateSessionFromHash()).resolves.toEqual({ access_token: 'a' });
    expect(setSession).not.toHaveBeenCalled();
  });

  it('exchanges a handoff code for session tokens', async () => {
    vi.stubGlobal('window', {
      location: {
        hash: '#handoff=abc123',
        pathname: '/checkout',
        search: '',
      },
      history: { replaceState },
    });
    invoke.mockResolvedValue({
      data: { access_token: 'at', refresh_token: 'rt' },
      error: null,
    });
    setSession.mockResolvedValue({
      data: { session: { access_token: 'at' } },
      error: null,
    });

    const { hydrateSessionFromHash } = await import('@/lib/supabase');
    await expect(hydrateSessionFromHash()).resolves.toEqual({ access_token: 'at' });
    expect(invoke).toHaveBeenCalledWith('exchange-checkout-handoff', {
      body: { code: 'abc123' },
    });
    expect(setSession).toHaveBeenCalledWith({
      access_token: 'at',
      refresh_token: 'rt',
    });
    expect(replaceState).toHaveBeenCalledWith(null, '', '/checkout');
  });

  it('ignores legacy access_token hash and falls back to getSession', async () => {
    vi.stubGlobal('window', {
      location: {
        hash: '#access_token=at&refresh_token=rt',
        pathname: '/checkout',
        search: '',
      },
      history: { replaceState },
    });
    getSession.mockResolvedValue({ data: { session: null } });

    const { hydrateSessionFromHash } = await import('@/lib/supabase');
    await expect(hydrateSessionFromHash()).resolves.toBeNull();
    expect(setSession).not.toHaveBeenCalled();
    expect(invoke).not.toHaveBeenCalled();
  });

  it('throws when the handoff exchange fails', async () => {
    vi.stubGlobal('window', {
      location: {
        hash: '#handoff=bad',
        pathname: '/checkout',
        search: '',
      },
      history: { replaceState },
    });
    invoke.mockResolvedValue({
      data: null,
      error: new Error('invalid handoff'),
    });

    const { hydrateSessionFromHash } = await import('@/lib/supabase');
    await expect(hydrateSessionFromHash()).rejects.toThrow('invalid handoff');
  });
});
