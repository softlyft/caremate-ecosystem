'use client';

import { useState } from 'react';
import { TipForm } from '@/features/tips/tip-form';
import { Button } from '@/components/ui/button';
import type { HealthTip } from '@/types/database';
import { categoryName } from '@/constants/categories';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export function TipsManager({ tips, canEdit }: { tips: HealthTip[]; canEdit: boolean }) {
  const [mode, setMode] = useState<'list' | 'create' | 'edit'>('list');
  const [editing, setEditing] = useState<HealthTip | undefined>();

  if (mode === 'create' && canEdit) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => setMode('list')}>
          ← Back
        </Button>
        <TipForm onDone={() => setMode('list')} />
      </div>
    );
  }

  if (mode === 'edit' && editing && canEdit) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => setMode('list')}>
          ← Back
        </Button>
        <TipForm tip={editing} onDone={() => setMode('list')} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {canEdit ? (
        <Button type="button" onClick={() => setMode('create')}>
          New tip
        </Button>
      ) : null}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Body</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Status</TableHead>
                {canEdit ? <TableHead /> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {tips.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canEdit ? 5 : 4} className="text-muted">
                    No health tips yet.
                  </TableCell>
                </TableRow>
              ) : (
                tips.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>{categoryName(t.category_id)}</TableCell>
                    <TableCell className="max-w-md">{t.body}</TableCell>
                    <TableCell>{t.sort_order}</TableCell>
                    <TableCell>
                      {t.is_active ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    {canEdit ? (
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditing(t);
                            setMode('edit');
                          }}
                        >
                          Edit
                        </Button>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
