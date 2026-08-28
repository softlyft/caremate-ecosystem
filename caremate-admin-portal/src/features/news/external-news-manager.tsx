'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { TextLink } from '@/components/ui/text-link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  deleteExternalNews,
  setExternalNewsPublished,
  syncExternalNews,
} from '@/domains/news/actions';
import { getNewsRegions } from '@/domains/news/regions';
import type { Article } from '@/types/database';

function formatDay(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function ExternalNewsManager({
  articles,
  canEdit,
  currentsConfigured,
}: {
  articles: Article[];
  canEdit: boolean;
  currentsConfigured: boolean;
}) {
  const [pendingRegion, setPendingRegion] = useState<'INT' | 'NG' | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function runSync(region: 'INT' | 'NG') {
    setPendingRegion(region);
    startTransition(async () => {
      try {
        const result = await syncExternalNews(region);
        toast.success(
          `${region}: fetched ${result.fetched} · inserted ${result.inserted} · updated ${result.updated}`,
        );
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Sync failed');
      } finally {
        setPendingRegion(null);
      }
    });
  }

  function runPublish(id: string, published: boolean) {
    setPendingId(id);
    startTransition(async () => {
      try {
        await setExternalNewsPublished(id, published);
        toast.success(published ? 'Published' : 'Unpublished — devices will drop it on next sync');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Update failed');
      } finally {
        setPendingId(null);
      }
    });
  }

  function runDelete(id: string) {
    setPendingId(id);
    startTransition(async () => {
      try {
        await deleteExternalNews(id);
        toast.success('Soft-deleted');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Delete failed');
      } finally {
        setPendingId(null);
      }
    });
  }

  return (
    <div className="space-y-4">
      {canEdit ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            loading={isPending && pendingRegion === 'INT'}
            loadingLabel="Syncing INT…"
            disabled={!currentsConfigured || (isPending && pendingRegion !== 'INT')}
            onClick={() => runSync('INT')}
          >
            Sync INT (15)
          </Button>
          <Button
            type="button"
            variant="secondary"
            loading={isPending && pendingRegion === 'NG'}
            loadingLabel="Syncing NG…"
            disabled={!currentsConfigured || (isPending && pendingRegion !== 'NG')}
            onClick={() => runSync('NG')}
          >
            Sync NG (15)
          </Button>
          {!currentsConfigured ? (
            <p className="text-sm text-muted">
              Set <code className="rounded bg-surface-muted px-1">CURRENTS_API_KEY</code> on the
              admin portal to enable sync.
            </p>
          ) : (
            <p className="text-sm text-muted">
              Manual sync only. New stories publish by default; unpublish to hide from devices.
            </p>
          )}
        </div>
      ) : null}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Regions</TableHead>
                <TableHead>First seen</TableHead>
                <TableHead>Status</TableHead>
                {canEdit ? <TableHead /> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {articles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canEdit ? 5 : 4} className="text-muted">
                    No external news yet. Sync INT or NG to pull from Currents.
                  </TableCell>
                </TableRow>
              ) : (
                articles.map((article) => {
                  const regions = getNewsRegions(article);
                  const published = Boolean(article.published_at);
                  const busy = isPending && pendingId === article.id;
                  return (
                    <TableRow key={article.id}>
                      <TableCell>
                        <div className="max-w-md">
                          <p className="font-medium text-foreground">{article.title}</p>
                          {article.source_url ? (
                            <TextLink href={article.source_url} external className="text-xs">
                              Source
                            </TextLink>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {regions.length === 0 ? (
                            <Badge variant="secondary">—</Badge>
                          ) : (
                            regions.map((region) => (
                              <Badge key={region} variant="secondary">
                                {region}
                              </Badge>
                            ))
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted">
                        {formatDay(article.first_seen_at)}
                      </TableCell>
                      <TableCell>
                        {published ? (
                          <Badge variant="success">Published</Badge>
                        ) : (
                          <Badge variant="warning">Unpublished</Badge>
                        )}
                      </TableCell>
                      {canEdit ? (
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              loading={busy}
                              onClick={() => runPublish(article.id, !published)}
                            >
                              {published ? 'Unpublish' : 'Publish'}
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              loading={busy}
                              onClick={() => runDelete(article.id)}
                            >
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
