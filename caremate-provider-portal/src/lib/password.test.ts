import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { meetsPasswordRequirements } from '@/lib/password';

describe('password requirements', () => {
  it('requires length, lower, upper, digit, and symbol', () => {
    assert.equal(meetsPasswordRequirements('Short1!'), false);
    assert.equal(meetsPasswordRequirements('alllower1!'), false);
    assert.equal(meetsPasswordRequirements('ALLUPPER1!'), false);
    assert.equal(meetsPasswordRequirements('NoDigits!!'), false);
    assert.equal(meetsPasswordRequirements('NoSymbol12'), false);
    assert.equal(meetsPasswordRequirements('ValidPass1!'), true);
  });
});
