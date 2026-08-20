import { requireCommunitySession } from '@/lib/auth';
import { getProfile } from '@/domains/profile/repository';
import { getSummary, listForUser } from '@/domains/contributions/repository';
import { ROLE_LABELS } from '@/constants/roles';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SubscribeCard } from '@/features/billing/subscribe-card';

function currencyForCountry(countryCode: string | null | undefined): 'NGN' | 'USD' {
  return countryCode?.trim().toUpperCase() === 'NG' ? 'NGN' : 'USD';
}

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ paid?: string }>;
}) {
  const session = await requireCommunitySession();
  const { paid } = await searchParams;
  const [profile, summary, contributions] = await Promise.all([
    getProfile(session.user.id),
    getSummary(session.user.id),
    listForUser(session.user.id, 10),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-brand-navy">Profile</h1>
        <p className="mt-1 text-sm text-muted">
          Your community identity · <Badge variant="secondary">{ROLE_LABELS[session.activeRole]}</Badge>
        </p>
      </div>

      {paid === '1' ? (
        <p className="rounded-lg bg-primary-light px-4 py-3 text-sm font-medium text-primary">
          Payment received. Open the CareMate app with this account to use Premium.
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <p className="text-2xl font-semibold">{summary.totalPoints}</p>
            <p className="text-sm text-muted">Contribution points</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-2xl font-semibold">{session.activeChapterName}</p>
            <p className="text-sm text-muted">Active chapter</p>
          </CardContent>
        </Card>
      </div>

      <SubscribeCard defaultCurrency={currencyForCountry(profile?.country_code)} />

      <Card>
        <CardHeader>
          <CardTitle>CareMate profile</CardTitle>
          <CardDescription>
            These details come from your CareMate app profile and are not copied into Community.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <p className="text-muted">Name</p>
            <p className="font-medium">{profile?.full_name ?? 'CareMate member'}</p>
          </div>
          <div>
            <p className="text-muted">Patient ID</p>
            <p className="font-medium">{profile?.patient_id ?? 'Not assigned'}</p>
          </div>
          <div>
            <p className="text-muted">Email</p>
            <p className="font-medium">{profile?.email ?? session.user.email ?? 'Not set'}</p>
          </div>
          <div>
            <p className="text-muted">Phone</p>
            <p className="font-medium">{profile?.phone ?? 'Not set'}</p>
          </div>
          <p className="text-xs text-muted sm:col-span-2">
            Update these details in the CareMate app.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
        </CardHeader>
        <CardContent>
          {contributions.length === 0 ? (
            <p className="text-sm text-muted">No activity yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {contributions.map((c) => (
                <li key={c.id} className="flex justify-between py-3 text-sm">
                  <span>{c.description || c.action_type}</span>
                  <span className="text-muted">+{c.points}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
