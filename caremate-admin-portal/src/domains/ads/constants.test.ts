import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { AD_SLOT_IDS } from './constants';

describe('ads constants', () => {
  it('lists the known mobile ad slots', () => {
    assert.ok(AD_SLOT_IDS.includes('home.tips'));
    assert.ok(AD_SLOT_IDS.includes('learn.list'));
    assert.ok(AD_SLOT_IDS.includes('nearby.provider'));
    assert.equal(AD_SLOT_IDS.length, 11);
  });
});
