'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import type { CommunityChapter, CommunityCountry } from '@/types/community';
import { EditChapterForm } from '@/features/community/edit-chapter-form';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

function statusVariant(status: string) {
  if (status === 'active') return 'success' as const;
  if (status === 'pending') return 'warning' as const;
  return 'secondary' as const;
}

export function ChaptersTable({
  chapters,
  countries,
}: {
  chapters: CommunityChapter[];
  countries: CommunityCountry[];
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const countryByCode = new Map(countries.map((country) => [country.code, country]));
  const editingChapter = chapters.find((chapter) => chapter.id === editingId) ?? null;

  return (
    <div className="space-y-4">
      {editingChapter ? (
        <EditChapterForm
          chapter={editingChapter}
          countries={countries}
          onClose={() => setEditingId(null)}
        />
      ) : null}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Members</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {chapters.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-muted">
                    No chapters found. Create one above so members can join.
                  </TableCell>
                </TableRow>
              ) : (
                chapters.map((ch) => (
                  <TableRow key={ch.id}>
                    <TableCell>
                      <div className="font-medium">{ch.name}</div>
                      <div className="text-xs text-muted">{ch.slug}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{ch.chapter_type}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {countryByCode.get(ch.country_code)?.name ?? ch.country_code}
                      </div>
                      {(
                        countryByCode.get(ch.country_code)?.administrative_level_config ?? []
                      )
                        .sort((left, right) => left.order - right.order)
                        .map((level) => {
                          const value = ch.administrative_hierarchy?.[level.key];
                          return value ? (
                            <div key={level.key} className="text-xs text-muted">
                              {level.short_label ?? level.label}: {value}
                            </div>
                          ) : null;
                        })}
                    </TableCell>
                    <TableCell>{ch.member_count}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(ch.status)}>{ch.status}</Badge>
                    </TableCell>
                    <TableCell className="text-muted">
                      {formatDistanceToNow(new Date(ch.created_at), { addSuffix: true })}
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setEditingId(ch.id)}
                      >
                        Edit
                      </Button>
                    </TableCell>
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
