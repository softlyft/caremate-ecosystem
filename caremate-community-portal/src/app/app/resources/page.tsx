import { requireCommunitySession } from '@/lib/auth';
import { searchResources } from '@/domains/resources/repository';
import { recordDownloadAction } from '@/domains/resources/actions';
import { Button } from '@/components/ui/button';
import { SubmitButton } from '@/components/ui/submit-button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function ResourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await requireCommunitySession();
  const { q } = await searchParams;
  const resources = await searchResources({
    query: q,
    chapterId: session.activeChapterId,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-brand-navy">Resources</h1>
        <p className="mt-1 text-sm text-muted">Guides, toolkits, and shared materials</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search</CardTitle>
          <CardDescription>Find chapter and global resources</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-2 sm:flex-row">
            <Input name="q" placeholder="Search by title or description" defaultValue={q} />
            <Button type="submit" variant="secondary">
              Search
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        {resources.length === 0 ? (
          <Card className="sm:col-span-2">
            <CardContent className="p-6 text-sm text-muted">No resources found.</CardContent>
          </Card>
        ) : (
          resources.map((resource) => (
            <Card key={resource.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-base">{resource.title}</CardTitle>
                  {resource.is_global && <Badge variant="secondary">Global</Badge>}
                </div>
                <CardDescription>{resource.description || 'No description'}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {resource.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {resource.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
                <form action={recordDownloadAction}>
                  <input type="hidden" name="resource_id" value={resource.id} />
                  <SubmitButton size="sm" loadingLabel="Downloading…">
                    Download
                  </SubmitButton>
                </form>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
