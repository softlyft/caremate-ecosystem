import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { hashClientIp } from '@/lib/otp-rate-limit';

describe('otp rate limit helpers', () => {
  it('hashes client IPs stably and ignores empty', () => {
    assert.equal(hashClientIp(null), null);
    assert.equal(hashClientIp(''), null);
    assert.equal(hashClientIp('1.2.3.4'), hashClientIp('1.2.3.4'));
    assert.notEqual(hashClientIp('1.2.3.4'), hashClientIp('1.2.3.5'));
    assert.match(hashClientIp('1.2.3.4')!, /^[a-f0-9]{32}$/);
  });
});
