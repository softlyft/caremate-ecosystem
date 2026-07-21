import { requireCommunitySession } from '@/lib/auth';
import { listBadges, listCertificates, listUserAwards } from '@/domains/recognition/repository';
import { getSummary, listForUser } from '@/domains/contributions/repository';
import { getChapterLeaderboard, getNationalLeaderboard } from '@/domains/leaderboard/repository';
import { getChapter } from '@/domains/chapters/repository';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function RecognitionPage() {
  const session = await requireCommunitySession();
  const chapter = await getChapter(session.activeChapterId);

  const [catalogBadges, catalogCerts, awards, summary, contributions, chapterBoard, nationalBoard] =
    await Promise.all([
      listBadges(),
      listCertificates(),
      listUserAwards(session.user.id),
      getSummary(session.user.id),
      listForUser(session.user.id, 15),
      getChapterLeaderboard(session.activeChapterId, 10),
      chapter?.country_code
        ? getNationalLeaderboard(chapter.country_code, 10)
        : Promise.resolve([]),
    ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-brand-navy">Recognition</h1>
        <p className="mt-1 text-sm text-muted">
          Badges, certificates, and contribution points
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-2xl font-semibold">{summary.totalPoints}</p>
            <p className="text-sm text-muted">Total points</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-2xl font-semibold">{awards.badges.length}</p>
            <p className="text-sm text-muted">Badges earned</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-2xl font-semibold">{awards.certificates.length}</p>
            <p className="text-sm text-muted">Certificates</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Your badges</CardTitle>
            <CardDescription>
              {awards.badges.length
                ? 'Earned recognition'
                : `${catalogBadges.length} badges available in the catalog`}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {(awards.badges.length ? awards.badges : catalogBadges).map((b) => (
              <Badge key={b.id} variant={awards.badges.length ? 'default' : 'secondary'}>
                {b.name}
                {'awarded_at' in b ? '' : ` · ${b.points_value} pts`}
              </Badge>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Certificates</CardTitle>
            <CardDescription>
              {awards.certificates.length
                ? 'Your certificates'
                : `${catalogCerts.length} certificate types`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {(awards.certificates.length ? awards.certificates : catalogCerts).map((c) => (
              <div key={c.id} className="rounded-lg border border-border px-3 py-2 text-sm">
                <p className="font-medium">{c.name}</p>
                {c.description && <p className="text-xs text-muted">{c.description}</p>}
              </div>
            ))}
            {catalogCerts.length === 0 && awards.certificates.length === 0 && (
              <p className="text-sm text-muted">No certificates yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Chapter leaderboard</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {chapterBoard.map((e, i) => (
                <li key={e.userId} className="flex justify-between">
                  <span>
                    {i + 1}. {e.fullName}
                  </span>
                  <span className="text-muted">{e.totalPoints}</span>
                </li>
              ))}
              {chapterBoard.length === 0 && <li className="text-muted">No rankings yet.</li>}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>National leaderboard</CardTitle>
            <CardDescription>{chapter?.country_code ?? 'Country'}</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {nationalBoard.map((e, i) => (
                <li key={`${e.userId}-${e.chapterId}`} className="flex justify-between">
                  <span>
                    {i + 1}. {e.fullName}
                  </span>
                  <span className="text-muted">{e.totalPoints}</span>
                </li>
              ))}
              {nationalBoard.length === 0 && (
                <li className="text-muted">No national rankings yet.</li>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent contributions</CardTitle>
        </CardHeader>
        <CardContent>
          {contributions.length === 0 ? (
            <p className="text-sm text-muted">No contributions logged yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {contributions.map((c) => (
                <li key={c.id} className="flex justify-between gap-3 py-3 text-sm">
                  <div>
                    <p className="font-medium">{c.action_type}</p>
                    <p className="text-xs text-muted">{c.description}</p>
                  </div>
                  <span className="shrink-0 text-muted">+{c.points}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
