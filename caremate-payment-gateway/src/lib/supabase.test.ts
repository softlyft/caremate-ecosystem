import { beforeEach, describe, expect, it, vi } from 'vitest';

const getSession = vi.fn();
const setSession = vi.fn();
const replaceState = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: {
      getSession: (...args: unknown[]) => getSession(...args),
      setSession: (...args: unknown[]) => setSession(...args),
    },
  }),
}));

describe('hydrateSessionFromHash', () => {
  beforeEach(() => {
    getSession.mockReset();
    setSession.mockReset();
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

  it('sets the session from access/refresh tokens in the hash', async () => {
    vi.stubGlobal('window', {
      location: {
        hash: '#access_token=at&refresh_token=rt',
        pathname: '/checkout',
        search: '',
      },
      history: { replaceState },
    });
    setSession.mockResolvedValue({
      data: { session: { access_token: 'at' } },
      error: null,
    });

    const { hydrateSessionFromHash } = await import('@/lib/supabase');
    await expect(hydrateSessionFromHash()).resolves.toEqual({ access_token: 'at' });
    expect(setSession).toHaveBeenCalledWith({
      access_token: 'at',
      refresh_token: 'rt',
    });
    expect(replaceState).toHaveBeenCalledWith(null, '', '/checkout');
  });

  it('falls back to getSession when hash tokens are incomplete', async () => {
    vi.stubGlobal('window', {
      location: {
        hash: '#access_token=only',
        pathname: '/checkout',
        search: '',
      },
      history: { replaceState },
    });
    getSession.mockResolvedValue({ data: { session: null } });

    const { hydrateSessionFromHash } = await import('@/lib/supabase');
    await expect(hydrateSessionFromHash()).resolves.toBeNull();
    expect(setSession).not.toHaveBeenCalled();
  });

  it('throws when setSession fails', async () => {
    vi.stubGlobal('window', {
      location: {
        hash: '#access_token=at&refresh_token=rt',
        pathname: '/checkout',
        search: '',
      },
      history: { replaceState },
    });
    setSession.mockResolvedValue({
      data: { session: null },
      error: new Error('invalid token'),
    });

    const { hydrateSessionFromHash } = await import('@/lib/supabase');
    await expect(hydrateSessionFromHash()).rejects.toThrow('invalid token');
  });
});
