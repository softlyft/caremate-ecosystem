import { beforeEach, describe, expect, it, vi } from 'vitest';

const maybeSingle = vi.fn();
const eq = vi.fn(() => ({ eq, maybeSingle }));
const select = vi.fn(() => ({ eq }));
const from = vi.fn(() => ({ select }));
const invoke = vi.fn();
const signInWithPassword = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => from(...(args as [])),
    functions: {
      invoke: (...args: unknown[]) => invoke(...(args as [])),
    },
    auth: {
      signInWithPassword: (...args: unknown[]) => signInWithPassword(...args),
    },
  },
}));

import { fetchActivePrice, fetchPatientId, startProviderCheckout, verifyCheckout } from '@/lib/api';

describe('payment api', () => {
  beforeEach(() => {
    maybeSingle.mockReset();
    eq.mockClear();
    select.mockClear();
    from.mockClear();
    invoke.mockReset();
    eq.mockImplementation(() => ({ eq, maybeSingle }));
  });

  it('returns an active price row', async () => {
    maybeSingle.mockResolvedValue({
      data: {
        id: 'price-1',
        plan_type: 'personal',
        billing_interval: 'monthly',
        currency: 'USD',
        amount_minor: 999,
        provider: 'paystack',
        is_active: true,
      },
      error: null,
    });

    await expect(
      fetchActivePrice({
        planType: 'personal',
        billingInterval: 'monthly',
        currency: 'USD',
      }),
    ).resolves.toMatchObject({ id: 'price-1', amount_minor: 999 });
    expect(from).toHaveBeenCalledWith('subscription_prices');
  });

  it('returns null when price query fails or is empty', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: { message: 'nope' } });
    await expect(
      fetchActivePrice({
        planType: 'personal',
        billingInterval: 'monthly',
        currency: 'USD',
      }),
    ).resolves.toBeNull();
  });

  it('reads patient_id from profiles', async () => {
    maybeSingle.mockResolvedValue({ data: { patient_id: '123456789012' }, error: null });
    await expect(fetchPatientId('user-1')).resolves.toBe('123456789012');

    maybeSingle.mockResolvedValue({ data: null, error: null });
    await expect(fetchPatientId('user-1')).resolves.toBeNull();
  });

  it('starts checkout via the create-checkout edge function', async () => {
    invoke.mockResolvedValue({
      data: {
        url: 'https://pay.example/checkout',
        provider: 'paystack',
        payment_id: 'pay-1',
        reference: 'ref-1',
      },
      error: null,
    });

    await expect(
      startProviderCheckout({
        planType: 'personal',
        billingInterval: 'monthly',
        currency: 'USD',
        householdId: null,
        successUrl: 'caremate://ok',
        cancelUrl: 'caremate://cancel',
      }),
    ).resolves.toMatchObject({ url: 'https://pay.example/checkout', provider: 'paystack' });

    expect(
      invoke,
    ).toHaveBeenCalledWith(
      'create-checkout',
      expect.objectContaining({
        body: expect.objectContaining({
          plan_type: 'personal',
          currency: 'USD',
        }),
      }),
    );
  });

  it('verifies checkout via the verify-checkout edge function', async () => {
    invoke.mockResolvedValue({
      data: { status: 'succeeded', subscription_id: 'sub-1', already_finalized: true },
      error: null,
    });

    await expect(verifyCheckout({ reference: 'ref-1' })).resolves.toEqual({
      status: 'succeeded',
      subscriptionId: 'sub-1',
      alreadyFinalized: true,
    });
    expect(invoke).toHaveBeenCalledWith('verify-checkout', {
      body: { reference: 'ref-1' },
    });
  });

  it('throws when checkout invoke fails or returns no URL', async () => {
    invoke.mockResolvedValue({ data: null, error: new Error('edge down') });
    await expect(
      startProviderCheckout({
        planType: 'personal',
        billingInterval: 'monthly',
        currency: 'USD',
        householdId: null,
        successUrl: 'caremate://ok',
        cancelUrl: 'caremate://cancel',
      }),
    ).rejects.toThrow('edge down');

    invoke.mockResolvedValue({ data: { error: 'no price' }, error: null });
    await expect(
      startProviderCheckout({
        planType: 'personal',
        billingInterval: 'monthly',
        currency: 'USD',
        householdId: null,
        successUrl: 'caremate://ok',
        cancelUrl: 'caremate://cancel',
      }),
    ).rejects.toThrow('no price');
  });
});
