import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { POINT_VALUES } from '@/constants/points';

type LeaderboardEntry = { userId: string; points: number };

function rankLeaderboard(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  return [...entries].sort((a, b) => b.points - a.points || a.userId.localeCompare(b.userId));
}

describe('leaderboard ranking', () => {
  it('ranks by points descending', () => {
    const ranked = rankLeaderboard([
      { userId: 'b', points: 10 },
      { userId: 'a', points: 25 },
      { userId: 'c', points: 15 },
    ]);
    assert.deepEqual(
      ranked.map((e) => e.userId),
      ['a', 'c', 'b'],
    );
  });

  it('uses stable tie-breaker on user id', () => {
    const ranked = rankLeaderboard([
      { userId: 'z', points: 10 },
      { userId: 'a', points: 10 },
    ]);
    assert.deepEqual(
      ranked.map((e) => e.userId),
      ['a', 'z'],
    );
  });
});

describe('contribution points', () => {
  it('assigns expected point values', () => {
    assert.ok(POINT_VALUES.onboarding > 0);
    assert.ok(POINT_VALUES.event_register > 0);
    assert.ok(POINT_VALUES.event_attend > POINT_VALUES.event_register);
    assert.ok(POINT_VALUES.resource_download > 0);
  });
});
