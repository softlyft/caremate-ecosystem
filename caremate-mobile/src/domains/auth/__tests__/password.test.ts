import { meetsPasswordRequirements } from '@/domains/auth/password';

describe('password requirements', () => {
  it('requires length, lower, upper, digit, and symbol', () => {
    expect(meetsPasswordRequirements('Short1!')).toBe(false);
    expect(meetsPasswordRequirements('alllower1!')).toBe(false);
    expect(meetsPasswordRequirements('ALLUPPER1!')).toBe(false);
    expect(meetsPasswordRequirements('NoDigits!!')).toBe(false);
    expect(meetsPasswordRequirements('NoSymbol12')).toBe(false);
    expect(meetsPasswordRequirements('ValidPass1!')).toBe(true);
  });
});
