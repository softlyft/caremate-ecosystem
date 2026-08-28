'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { setPrivateCareTeamMemberAction } from '@/domains/billing/actions';
import type { ProviderMemberRole } from '@/types/database';

type ToggleSeatTeamAction = typeof setPrivateCareTeamMemberAction;

export type OrgSeatTeamMembership = {
  user_id: string;
  role: ProviderMemberRole | string;
};

export function OrgSeatTeamToggle({
  teamName,
  description,
  membership,
  onTeam,
  canManage,
  seatsUsed,
  seatLimit,
  toggleAction = setPrivateCareTeamMemberAction,
}: {
  teamName: string;
  description: string;
  membership: OrgSeatTeamMembership | null;
  onTeam: boolean;
  canManage: boolean;
  seatsUsed: number;
  seatLimit: number;
  toggleAction?: ToggleSeatTeamAction;
}) {
  const [pending, startTransition] = useTransition();

  if (!membership) {
    return (
      <p className="text-sm text-muted">
        Mark this connected user as staff before adding them to the {teamName}.
      </p>
    );
  }

  if (membership.role === 'viewer') {
    return <p className="text-sm text-muted">Viewers cannot join the {teamName}.</p>;
  }

  const atLimit = !onTeam && seatsUsed >= seatLimit;

  return (
    <div className="space-y-3 text-sm">
      <p className="font-medium text-foreground">
        {teamName} · {onTeam ? 'Member' : 'Not on team'}
      </p>
      <p className="text-muted">
        {description} Seats used: {seatsUsed} / {seatLimit}.
      </p>
      {canManage ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            startTransition(async () => {
              try {
                await toggleAction(fd);
                toast.success(
                  onTeam ? `Removed from ${teamName}` : `Added to ${teamName}`,
                );
              } catch (err) {
                toast.error(err instanceof Error ? err.message : 'Could not update team');
              }
            });
          }}
        >
          <input type="hidden" name="user_id" value={membership.user_id} />
          <input type="hidden" name="enabled" value={onTeam ? 'false' : 'true'} />
          <Button
            type="submit"
            size="sm"
            variant={onTeam ? 'secondary' : 'default'}
            disabled={pending || (!onTeam && atLimit)}
          >
            {pending ? 'Saving…' : onTeam ? 'Remove from team' : `Add to ${teamName}`}
          </Button>
          {!onTeam && atLimit ? (
            <p className="mt-2 text-xs text-orange-700">
              Seat limit reached. Upgrade the organization plan in Settings → Billing.
            </p>
          ) : null}
        </form>
      ) : null}
    </div>
  );
}
