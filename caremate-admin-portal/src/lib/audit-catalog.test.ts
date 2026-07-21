import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { AUDIT_ACTION, AUDIT_ENTITY, auditOperationKind, formatAuditAction } from './audit-catalog';
import { cn } from './utils';

describe('audit-catalog', () => {
  it('classifies create-like actions', () => {
    assert.equal(auditOperationKind(AUDIT_ACTION.createArticle), 'create');
    assert.equal(auditOperationKind(AUDIT_ACTION.adminActivateSubscription), 'create');
    assert.equal(auditOperationKind(AUDIT_ACTION.ingestProvider), 'create');
    assert.equal(auditOperationKind(AUDIT_ACTION.uploadMedia), 'create');
  });

  it('classifies update-like actions', () => {
    assert.equal(auditOperationKind(AUDIT_ACTION.updateArticle), 'update');
    assert.equal(auditOperationKind(AUDIT_ACTION.setRole), 'update');
    assert.equal(auditOperationKind(AUDIT_ACTION.verifyAdAdvertiser), 'update');
    assert.equal(auditOperationKind(AUDIT_ACTION.unbanUser), 'update');
    assert.equal(auditOperationKind(AUDIT_ACTION.adminUpgradeToFamily), 'update');
    assert.equal(auditOperationKind(AUDIT_ACTION.passwordReset), 'update');
  });

  it('classifies delete-like actions', () => {
    assert.equal(auditOperationKind(AUDIT_ACTION.deleteArticle), 'delete');
    assert.equal(auditOperationKind(AUDIT_ACTION.archiveProvider), 'delete');
    assert.equal(auditOperationKind(AUDIT_ACTION.banUser), 'delete');
    assert.equal(auditOperationKind(AUDIT_ACTION.rejectAdAdvertiser), 'delete');
  });

  it('returns other for unknown actions and formats labels', () => {
    assert.equal(auditOperationKind('sync_something'), 'other');
    assert.equal(formatAuditAction(AUDIT_ACTION.createArticle), 'create article');
    assert.equal(AUDIT_ENTITY.subscription, 'subscription');
  });
});

describe('cn helper', () => {
  it('merges class names and resolves tailwind conflicts', () => {
    assert.equal(cn('px-2', 'px-4'), 'px-4');
    assert.equal(cn('text-sm', false && 'hidden', 'font-medium'), 'text-sm font-medium');
  });
});
