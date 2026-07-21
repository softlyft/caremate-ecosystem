import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  canManageChapter,
  isCommunityRole,
  isLeaderRole,
  ROLE_LABELS,
} from '@/constants/roles';

describe('community roles', () => {
  it('recognizes valid community roles', () => {
    assert.equal(isCommunityRole('member'), true);
    assert.equal(isCommunityRole('lead'), true);
    assert.equal(isCommunityRole('deputy'), true);
    assert.equal(isCommunityRole('owner'), false);
  });

  it('identifies leader roles', () => {
    assert.equal(isLeaderRole('lead'), true);
    assert.equal(isLeaderRole('deputy'), true);
    assert.equal(isLeaderRole('member'), false);
  });

  it('allows chapter management for leads and deputies', () => {
    assert.equal(canManageChapter('lead'), true);
    assert.equal(canManageChapter('deputy'), true);
    assert.equal(canManageChapter('member'), false);
  });

  it('exposes role labels', () => {
    assert.equal(ROLE_LABELS.lead, 'Chapter Lead');
    assert.equal(ROLE_LABELS.member, 'Member');
  });
});
