'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { markReadAction, listUnreadAction } from '@/domains/notifications/actions';
import { Button } from '@/components/ui/button';
import type { CommunityNotification } from '@/types/database';

export function NotificationBell({ initialCount = 0 }: { initialCount?: number }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<CommunityNotification[]>([]);
  const [count, setCount] = useState(initialCount);
  const [pending, startTransition] = useTransition();
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [loadingList, setLoadingList] = useState(false);

  const load = () => {
    startTransition(async () => {
      setLoadingList(true);
      try {
        const unread = await listUnreadAction();
        setItems(unread);
        setCount(unread.length);
        setOpen(true);
      } finally {
        setLoadingList(false);
      }
    });
  };

  const markOne = (id: string) => {
    startTransition(async () => {
      setMarkingId(id);
      try {
        const fd = new FormData();
        fd.set('notification_id', id);
        await markReadAction(fd);
        setItems((prev) => prev.filter((n) => n.id !== id));
        setCount((c) => Math.max(0, c - 1));
      } finally {
        setMarkingId(null);
      }
    });
  };

  return (
    <div className="relative">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="relative"
        loading={loadingList}
        onClick={() => (open ? setOpen(false) : load())}
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-xl border border-border bg-surface shadow-lg">
          <div className="border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-foreground">Notifications</p>
            <p className="text-xs text-muted">{pending && loadingList ? 'Loading…' : `${count} unread`}</p>
          </div>
          <ul className="max-h-72 overflow-y-auto">
            {items.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-muted">You&apos;re all caught up.</li>
            ) : (
              items.map((n) => (
                <li key={n.id} className="border-b border-border px-4 py-3 last:border-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{n.title}</p>
                      {n.body && <p className="mt-0.5 text-xs text-muted">{n.body}</p>}
                      {n.link_path && (
                        <Link
                          href={n.link_path}
                          className="mt-1 inline-block text-xs font-medium text-primary hover:underline"
                          onClick={() => setOpen(false)}
                        >
                          Open
                        </Link>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="shrink-0 text-xs"
                      disabled={pending}
                      loading={markingId === n.id}
                      loadingLabel="…"
                      onClick={() => markOne(n.id)}
                    >
                      Read
                    </Button>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
