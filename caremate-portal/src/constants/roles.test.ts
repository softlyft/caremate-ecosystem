import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  canAssignRoles,
  canEditCatalog,
  canManageBilling,
  canManageUsers,
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
});
