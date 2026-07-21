'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { banUser, sendPasswordReset, setUserRole, unbanUser } from '@/domains/users/actions';
import { STAFF_ROLES, STAFF_ROLE_LABELS, type StaffRole } from '@/constants/roles';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';

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
              onClick={() =>
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
                })
              }
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
                  toast.success('Password reset email sent');
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : 'Failed');
                } finally {
                  setPendingAction(null);
                }
              })
            }
          >
            Send password reset
          </Button>
        </>
      ) : null}

      {canAssign ? (
        <Select
          className="w-40"
          disabled={pending}
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
  );
}
