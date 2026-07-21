import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireLeaderAccess } from '@/lib/auth';
import { listPendingForChapter } from '@/domains/memberships/repository';
import {
  approveMembershipAction,
  rejectMembershipAction,
} from '@/domains/memberships/actions';
import { createAnnouncementAction } from '@/domains/announcements/actions';
import { addGalleryItemAction } from '@/domains/gallery/actions';
import { getProfile } from '@/domains/profile/repository';
import { SubmitButton } from '@/components/ui/submit-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function LeaderPage() {
  let session;
  try {
    session = await requireLeaderAccess();
  } catch {
    redirect('/app/dashboard');
  }

  const pending = await listPendingForChapter(session.activeChapterId);
  const pendingWithNames = await Promise.all(
    pending.map(async (m) => {
      const profile = await getProfile(m.user_id);
      return { ...m, fullName: profile?.full_name ?? m.user_id };
    }),
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-brand-navy">Leader tools</h1>
          <p className="mt-1 text-sm text-muted">
            Manage {session.activeChapterName} memberships and content
          </p>
        </div>
        <Link
          href="/app/events/manage"
          className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-white hover:bg-primary-dark"
        >
          Manage events
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending memberships</CardTitle>
          <CardDescription>{pendingWithNames.length} awaiting review</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {pendingWithNames.length === 0 ? (
            <p className="text-sm text-muted">No pending requests.</p>
          ) : (
            pendingWithNames.map((m) => (
              <div
                key={m.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3"
              >
                <div>
                  <p className="text-sm font-medium">{m.fullName}</p>
                  <p className="text-xs text-muted">
                    Requested {new Date(m.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <form action={approveMembershipAction}>
                    <input type="hidden" name="membership_id" value={m.id} />
                    <SubmitButton size="sm" loadingLabel="Approving…">
                      Approve
                    </SubmitButton>
                  </form>
                  <form action={rejectMembershipAction}>
                    <input type="hidden" name="membership_id" value={m.id} />
                    <SubmitButton size="sm" variant="secondary" loadingLabel="Rejecting…">
                      Reject
                    </SubmitButton>
                  </form>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Post announcement</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createAnnouncementAction} className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" name="title" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="body">Body</Label>
                <Textarea id="body" name="body" required />
              </div>
              <SubmitButton loadingLabel="Publishing…">Publish</SubmitButton>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Add gallery item</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={addGalleryItemAction} className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="image_url">Image URL</Label>
                <Input id="image_url" name="image_url" type="url" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="caption">Caption</Label>
                <Input id="caption" name="caption" />
              </div>
              <SubmitButton loadingLabel="Adding…">Add to gallery</SubmitButton>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
