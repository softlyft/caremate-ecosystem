import { isUnchangedTimelineEvent } from '@/domains/timeline/event-equality';

describe('isUnchangedTimelineEvent', () => {
  const base = {
    kind: 'vital',
    occurredOn: '2026-03-02',
    occurredAt: '2026-03-02T15:04:00.000Z',
    title: 'Heart Rate',
    summary: '72 bpm',
    payload: '{"value":72}',
    deletedAt: null as string | null,
  };

  it('skips identical rows so rehydrate does not re-enqueue timeline sync', () => {
    expect(
      isUnchangedTimelineEvent(base, base, '{"value":72}'),
    ).toBe(true);
  });

  it('detects payload or field changes', () => {
    expect(
      isUnchangedTimelineEvent(base, { ...base, summary: '73 bpm' }, '{"value":72}'),
    ).toBe(false);
    expect(
      isUnchangedTimelineEvent(base, base, '{"value":73}'),
    ).toBe(false);
  });
});
