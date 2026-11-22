'use client';

import { useRouter } from '@/lib/router';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { banUser, sendPasswordReset, setUserRole, unbanUser } from '@/domains/users/actions';
import { STAFF_ROLES, STAFF_ROLE_LABELS, type StaffRole } from '@/constants/roles';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';

const DISABLE_CONFIRM =
  'Disable this account? The user cannot sign in while disabled, and their email stays reserved until you Enable the account (or they delete their account in CareMate).';

export function UserActions({
  userId,
  email,
  banned,
  role,
  canManage,
  canAssign,
}: {
  userId: string;
  email: string;
  banned: boolean;
  role: StaffRole | null;
  canManage: boolean;
  canAssign: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [pendingAction, setPendingAction] = useState<'account' | 'reset' | null>(null);

  if (!canManage && !canAssign) return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {canManage ? (
          <>
            {banned ? (
              <Button
                variant="secondary"
                disabled={pending}
                loading={pendingAction === 'account'}
                loadingLabel="Enabling…"
                onClick={() =>
                  start(async () => {
                    setPendingAction('account');
                    try {
                      await unbanUser(userId);
                      toast.success('User enabled');
                      router.refresh();
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : 'Failed');
                    } finally {
                      setPendingAction(null);
                    }
                  })
                }
              >
                Enable account
              </Button>
            ) : (
              <Button
                variant="danger"
                disabled={pending}
                loading={pendingAction === 'account'}
                loadingLabel="Disabling…"
                onClick={() => {
                  if (!window.confirm(DISABLE_CONFIRM)) return;
                  start(async () => {
                    setPendingAction('account');
                    try {
                      await banUser(userId);
                      toast.success('User disabled');
                      router.refresh();
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : 'Failed');
                    } finally {
                      setPendingAction(null);
                    }
                  });
                }}
              >
                Disable account
              </Button>
            )}
            <Button
              variant="outline"
              disabled={pending || email === '—'}
              loading={pendingAction === 'reset'}
              loadingLabel="Sending…"
              onClick={() =>
                start(async () => {
                  setPendingAction('reset');
                  try {
                    await sendPasswordReset(email);
                    toast.success(
                      'Reset code emailed. Ask the user to open CareMate → Forgot password → Already have a code?, then enter the 6-digit code.',
                    );
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : 'Failed');
                  } finally {
                    setPendingAction(null);
                  }
                })
              }
            >
              Send reset code
            </Button>
          </>
        ) : null}

        {canAssign ? (
          <Select
            className="w-40"
            disabled={pending || banned}
            title={banned ? 'Enable the account before assigning a staff role' : undefined}
            value={role ?? ''}
            onChange={(e) => {
              const value = e.target.value;
              start(async () => {
                try {
                  await setUserRole(userId, value === '' ? null : (value as StaffRole));
                  toast.success('Role updated');
                  router.refresh();
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : 'Failed');
                }
              });
            }}
          >
            <option value="">No portal role</option>
            {STAFF_ROLES.map((r) => (
              <option key={r} value={r}>
                {STAFF_ROLE_LABELS[r]}
              </option>
            ))}
          </Select>
        ) : null}
      </div>
      {canAssign && banned ? (
        <p className="text-sm text-muted">
          Enable the account before assigning a staff role.
        </p>
      ) : null}
    </div>
  );
}
