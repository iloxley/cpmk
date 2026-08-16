import { describe, expect, it } from 'vitest';
import { defaultTitle, normalizeTags } from '../../src/domain/entry.js';

describe('defaultTitle', () => {
  it('uses the first line and truncates to 80 Unicode characters', () => {
    expect(defaultTitle('Keep the core local-first\nMore detail')).toBe(
      'Keep the core local-first',
    );
    const long = `${'😀'.repeat(90)}\nnext`;
    expect(Array.from(defaultTitle(long))).toHaveLength(80);
  });
});

describe('normalizeTags', () => {
  it('lowercases, de-duplicates, and sorts', () => {
    expect(normalizeTags(['Storage', 'architecture', 'storage'])).toEqual([
      'architecture',
      'storage',
    ]);
  });
});
