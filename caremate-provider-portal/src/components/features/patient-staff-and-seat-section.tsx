import { MarkAsStaffForm, type OrgStaffMembership } from '@/components/features/mark-as-staff-form';
import {
  OrgSeatTeamToggle,
  type OrgSeatTeamMembership,
} from '@/components/features/org-seat-team-toggle';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type MarkAsStaffAction = typeof import('@/domains/members/actions').markAsStaffAction;
type ToggleSeatTeamAction = typeof import('@/domains/billing/actions').setPrivateCareTeamMemberAction;

export function PatientStaffAndSeatSection({
  patientUserId,
  defaultDisplayName,
  membership,
  canManage,
  markAction,
  staffDescription,
  positionPlaceholder,
  teamName,
  teamDescription,
  seatToggleDescription,
  onTeam,
  seatsUsed,
  seatLimit,
  toggleAction,
  teamBadge,
  teamCardFullWidth = false,
}: {
  patientUserId: string;
  defaultDisplayName: string;
  membership: OrgStaffMembership | null;
  canManage: boolean;
  markAction?: MarkAsStaffAction;
  staffDescription: string;
  positionPlaceholder?: string;
  teamName: string;
  teamDescription: string;
  seatToggleDescription?: string;
  onTeam: boolean;
  seatsUsed: number;
  seatLimit: number;
  toggleAction?: ToggleSeatTeamAction;
  teamBadge?: React.ReactNode;
  teamCardFullWidth?: boolean;
}) {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Organization staff</CardTitle>
          <CardDescription>{staffDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <MarkAsStaffForm
            patientUserId={patientUserId}
            defaultDisplayName={defaultDisplayName}
            membership={membership}
            canManage={canManage}
            markAction={markAction}
            positionPlaceholder={positionPlaceholder}
          />
        </CardContent>
      </Card>

      <Card className={teamCardFullWidth ? 'lg:col-span-2' : undefined}>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>{teamName}</CardTitle>
            {teamBadge}
          </div>
          <CardDescription>{teamDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <OrgSeatTeamToggle
            teamName={teamName}
            description={
              seatToggleDescription ??
              `Only ${teamName} members can chat 1:1 with connected patients in CareMate. Org-wide Messages stay available to write staff without this flag.`
            }
            membership={membership as OrgSeatTeamMembership | null}
            onTeam={onTeam}
            canManage={canManage}
            seatsUsed={seatsUsed}
            seatLimit={seatLimit}
            toggleAction={toggleAction}
          />
        </CardContent>
      </Card>
    </>
  );
}
