const {
  SUPABASE_NOT_CONFIGURED_MESSAGE,
  createUnconfiguredSupabaseClient,
} = jest.requireActual<typeof import('@/lib/supabase')>('@/lib/supabase');

describe('createUnconfiguredSupabaseClient', () => {
  it('throws a clear error on any client access', () => {
    const client = createUnconfiguredSupabaseClient();

    expect(() => client.auth).toThrow(SUPABASE_NOT_CONFIGURED_MESSAGE);
    expect(() => client.from('profiles')).toThrow(SUPABASE_NOT_CONFIGURED_MESSAGE);
    expect(() => client.rpc('anything' as never)).toThrow(SUPABASE_NOT_CONFIGURED_MESSAGE);
  });
});
