import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { categoryName, HEALTH_CATEGORIES } from './categories';
import {
  LEARN_CONTENT_TYPE_LABELS,
  LEARN_CONTENT_TYPES,
  PROVIDER_TYPE_LABELS,
  PROVIDER_TYPES,
} from './content';
import {
  canAssignRoles,
  canEditCatalog,
  canManageBilling,
  canManageCommunity,
  canManageUsers,
  canViewAuditLogs,
  isStaffRole,
  STAFF_ROLES,
} from './roles';

describe('portal RBAC helpers', () => {
  it('recognizes only staff roles', () => {
    for (const role of STAFF_ROLES) {
      assert.equal(isStaffRole(role), true);
    }
    assert.equal(isStaffRole('user'), false);
    assert.equal(isStaffRole(null), false);
    assert.equal(isStaffRole(undefined), false);
    assert.equal(isStaffRole(42), false);
  });

  it('gates user management to admin and support', () => {
    assert.equal(canManageUsers('admin'), true);
    assert.equal(canManageUsers('support'), true);
    assert.equal(canManageUsers('editor'), false);
    assert.equal(canManageUsers(null), false);
  });

  it('gates catalog edits to admin and editor', () => {
    assert.equal(canEditCatalog('admin'), true);
    assert.equal(canEditCatalog('editor'), true);
    assert.equal(canEditCatalog('support'), false);
    assert.equal(canEditCatalog(undefined), false);
  });

  it('restricts role assignment to admin', () => {
    assert.equal(canAssignRoles('admin'), true);
    assert.equal(canAssignRoles('editor'), false);
    assert.equal(canAssignRoles('support'), false);
  });

  it('restricts billing management to admin', () => {
    assert.equal(canManageBilling('admin'), true);
    assert.equal(canManageBilling('editor'), false);
    assert.equal(canManageBilling('support'), false);
  });

  it('gates community mutations to admin and editor', () => {
    assert.equal(canManageCommunity('admin'), true);
    assert.equal(canManageCommunity('editor'), true);
    assert.equal(canManageCommunity('support'), false);
    assert.equal(canManageCommunity(null), false);
  });

  it('allows all staff to view audit logs', () => {
    assert.equal(canViewAuditLogs('admin'), true);
    assert.equal(canViewAuditLogs('editor'), true);
    assert.equal(canViewAuditLogs('support'), true);
    assert.equal(canViewAuditLogs('user' as never), false);
    assert.equal(canViewAuditLogs(null), false);
  });
});

describe('portal catalog constants', () => {
  it('resolves health category names', () => {
    assert.equal(HEALTH_CATEGORIES.length, 8);
    assert.equal(categoryName('nutrition'), 'Nutrition');
    assert.equal(categoryName('unknown'), 'unknown');
  });

  it('exposes Learn and provider type labels', () => {
    assert.ok(LEARN_CONTENT_TYPES.includes('article'));
    assert.equal(LEARN_CONTENT_TYPE_LABELS.health_alert, 'Health Alert');
    assert.ok(PROVIDER_TYPES.includes('hospital'));
    assert.equal(PROVIDER_TYPE_LABELS.blood_bank, 'Blood Bank');
  });
});
