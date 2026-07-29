import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  DEFAULT_PAGE_SIZE,
  emptyPage,
  pageRange,
  paginatedResult,
  parsePage,
} from '@/lib/pagination';

describe('pagination helpers', () => {
  it('parses page numbers safely', () => {
    assert.equal(parsePage(undefined), 1);
    assert.equal(parsePage('0'), 1);
    assert.equal(parsePage('-2'), 1);
    assert.equal(parsePage('3'), 3);
    assert.equal(parsePage('abc'), 1);
  });

  it('computes inclusive ranges', () => {
    assert.deepEqual(pageRange(1, 50), { from: 0, to: 49 });
    assert.deepEqual(pageRange(2, 50), { from: 50, to: 99 });
  });

  it('builds paginated results', () => {
    const result = paginatedResult([{ id: 1 }], 125, 2, DEFAULT_PAGE_SIZE);
    assert.equal(result.total, 125);
    assert.equal(result.totalPages, 3);
    assert.equal(result.page, 2);
    assert.equal(emptyPage().total, 0);
  });
});
