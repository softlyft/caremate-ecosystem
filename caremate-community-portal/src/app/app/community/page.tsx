import { formatDistanceToNow } from 'date-fns';
import { requireCommunitySession } from '@/lib/auth';
import { getChapter } from '@/domains/chapters/repository';
import { listAnnouncements } from '@/domains/announcements/repository';
import { listGallery } from '@/domains/gallery/repository';
import { getChapterLeaderboard } from '@/domains/leaderboard/repository';
import {
  bookmarkAnnouncementAction,
  reactAnnouncementAction,
} from '@/domains/announcements/actions';
import { CHAPTER_TYPE_LABELS } from '@/constants/chapter-types';
import { Badge } from '@/components/ui/badge';
import { SubmitButton } from '@/components/ui/submit-button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function CommunityPage() {
  const session = await requireCommunitySession();
  const [chapter, announcements, gallery, leaderboard] = await Promise.all([
    getChapter(session.activeChapterId),
    listAnnouncements(session.activeChapterId),
    listGallery(session.activeChapterId, 12),
    getChapterLeaderboard(session.activeChapterId, 10),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-brand-navy">Community</h1>
        <p className="mt-1 text-sm text-muted">
          {chapter?.name ?? session.activeChapterName} · chapter hub
        </p>
      </div>

      {chapter && (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>{chapter.name}</CardTitle>
              <Badge variant="secondary">{CHAPTER_TYPE_LABELS[chapter.chapter_type]}</Badge>
            </div>
            <CardDescription>
              {chapter.description || 'No description yet.'} · {chapter.member_count} members ·{' '}
              {[
                chapter.country_code,
                ...Object.values(chapter.administrative_hierarchy ?? {}),
              ].join(' · ')}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Announcements</CardTitle>
            <CardDescription>News and updates from your chapter</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {announcements.length === 0 ? (
              <p className="text-sm text-muted">No announcements yet.</p>
            ) : (
              announcements.map((a) => (
                <div key={a.id} className="rounded-lg border border-border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">{a.title}</p>
                      <p className="mt-1 text-sm text-muted">{a.body}</p>
                      <p className="mt-2 text-xs text-muted">
                        {formatDistanceToNow(new Date(a.published_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <form action={reactAnnouncementAction}>
                      <input type="hidden" name="announcement_id" value={a.id} />
                      <input type="hidden" name="reaction" value="like" />
                      <SubmitButton size="sm" variant="secondary" loadingLabel="Liking…">
                        Like
                      </SubmitButton>
                    </form>
                    <form action={reactAnnouncementAction}>
                      <input type="hidden" name="announcement_id" value={a.id} />
                      <input type="hidden" name="reaction" value="celebrate" />
                      <SubmitButton size="sm" variant="secondary" loadingLabel="Celebrating…">
                        Celebrate
                      </SubmitButton>
                    </form>
                    <form action={bookmarkAnnouncementAction}>
                      <input type="hidden" name="announcement_id" value={a.id} />
                      <SubmitButton size="sm" variant="ghost" loadingLabel="Saving…">
                        Bookmark
                      </SubmitButton>
                    </form>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Leaderboard</CardTitle>
            <CardDescription>Top contributors</CardDescription>
          </CardHeader>
          <CardContent>
            {leaderboard.length === 0 ? (
              <p className="text-sm text-muted">No points yet.</p>
            ) : (
              <ul className="space-y-3">
                {leaderboard.map((entry, idx) => (
                  <li key={entry.userId} className="flex items-center justify-between text-sm">
                    <span>
                      {idx + 1}. {entry.fullName}
                    </span>
                    <span className="text-muted">{entry.totalPoints} pts</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Gallery</CardTitle>
          <CardDescription>Moments from chapter events</CardDescription>
        </CardHeader>
        <CardContent>
          {gallery.length === 0 ? (
            <p className="text-sm text-muted">No gallery items yet.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {gallery.map((item) => (
                <figure key={item.id} className="overflow-hidden rounded-lg border border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.image_url}
                    alt={item.caption ?? 'Gallery image'}
                    className="aspect-square w-full object-cover"
                  />
                  {item.caption && (
                    <figcaption className="truncate px-2 py-1.5 text-xs text-muted">
                      {item.caption}
                    </figcaption>
                  )}
                </figure>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
