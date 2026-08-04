import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const learnPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../data/learn.json',
);

const EXPECTED_CATEGORIES = [
  'prevention',
  'conditions',
  'symptoms',
  'family',
  'emergency',
  'care_system',
  'medicines',
  'mental',
  'tests',
  'nutrition',
] as const;

function wordCount(text: string): number {
  return (text.match(/\b\w+\b/g) ?? []).length;
}

describe('learn.json evergreen catalog', () => {
  const catalog = JSON.parse(fs.readFileSync(learnPath, 'utf8')) as Record<
    string,
    Array<{ id: string; title: string; summary: string; content: string }>
  >;

  it('has exactly the ten Learn health categories', () => {
    assert.deepEqual(Object.keys(catalog), [...EXPECTED_CATEGORIES]);
  });

  it('has 15 topics per category with ≥100 words of content', () => {
    for (const categoryId of EXPECTED_CATEGORIES) {
      const articles = catalog[categoryId];
      assert.ok(Array.isArray(articles), categoryId);
      assert.equal(articles.length, 15, `${categoryId} topic count`);
      for (const article of articles) {
        assert.ok(article.id.startsWith('evergreen-'), article.id);
        assert.ok(article.title.trim().length > 0, article.id);
        assert.ok(article.summary.trim().length > 0, article.id);
        const words = wordCount(article.content);
        assert.ok(
          words >= 100,
          `${article.id} has ${words} words (need ≥100)`,
        );
      }
    }
  });
});
