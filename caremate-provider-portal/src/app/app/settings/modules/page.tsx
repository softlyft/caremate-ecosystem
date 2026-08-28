import { PageHeader, PageShell } from '@/components/page-header';
import { TextLink } from '@/components/ui/text-link';
import { requireProviderSession } from '@/lib/auth';
import { listActivatableModules } from '@/domains/modules/catalog';
import { getEnabledModules } from '@/domains/modules/repository';
import { ModuleToggleForm } from '@/components/features/module-toggle-form';
import { canManageOrg } from '@/constants/roles';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function ModulesSettingsPage() {
  const session = await requireProviderSession();
  const enabled = await getEnabledModules(session.activeOrganizationId);
  const activatable = listActivatableModules();
  const canManage = canManageOrg(session.activeRole);

  return (
    <PageShell>
      <TextLink href="/app/settings">← Settings</TextLink>
      <PageHeader
        title="Modules"
        description="Activate optional CareMate capabilities for this organization. Core engagement features stay on by default."
      />

      <Card>
        <CardHeader>
          <CardTitle>Optional modules</CardTitle>
          <CardDescription>
            Only Laboratory is available to activate right now. More modules will appear here as
            they ship.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {activatable.map((mod) => {
            const on = enabled.has(mod.key);
            return (
              <div
                key={mod.key}
                className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground">{mod.name}</p>
                    <Badge variant={on ? 'success' : 'secondary'}>
                      {on ? 'Active' : 'Off'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted">{mod.description}</p>
                </div>
                {canManage ? (
                  <ModuleToggleForm moduleKey={mod.key} enabled={on} />
                ) : (
                  <p className="text-xs text-muted">Owner or administrator can change this.</p>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </PageShell>
  );
}
