import { describe, expect, it } from 'vitest';
import { initProject } from '../../src/application/init.js';
import { rememberEntry } from '../../src/application/remember.js';
import { searchMemory } from '../../src/application/search.js';
import { formatSearchHuman } from '../../src/cli/format.js';
import { rankSearchResults, scoreEntry } from '../../src/domain/search.js';
import type { MemoryEntry } from '../../src/domain/types.js';
import { fixedClock, fixedIds, withTempDir } from '../helpers/temp.js';

const entry: MemoryEntry = {
  schemaVersion: 1,
  id: '01JEXAMPLE0000000000000000',
  type: 'convention',
  title: 'Use RFC 9457',
  content: 'API errors use problem details.',
  tags: ['api'],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  source: 'manual',
  status: 'active',
};

describe('rankSearchResults', () => {
  it('scores title, tags, and content then drops misses', () => {
    expect(scoreEntry(entry, ['rfc', 'api', 'problem'])).toBe(7);
    expect(scoreEntry(entry, [])).toBe(0);
    const ranked = rankSearchResults(
      [
        entry,
        {
          ...entry,
          id: '01JEXAMPLE0000000000000001',
          title: 'Unrelated',
          content: 'nothing here',
          tags: [],
        },
      ],
      'RFC api',
    );
    expect(ranked).toHaveLength(1);
    expect(ranked[0]?.entry.id).toBe(entry.id);
    expect(() => rankSearchResults([entry], '   !!!')).toThrow(
      /letters or numbers/,
    );
    expect(formatSearchHuman([])).toBe('');
    expect(formatSearchHuman(ranked)).toContain(entry.id);
  });
});

describe('searchMemory', () => {
  it('filters then ranks stored entries', async () => {
    await withTempDir(async (directory) => {
      await initProject({ root: directory, name: 'search' });
      await rememberEntry({
        projectRoot: directory,
        content: 'API errors use RFC 9457 problem details',
        type: 'convention',
        tags: ['api'],
        clock: fixedClock(),
        ids: fixedIds(),
      });
      await rememberEntry({
        projectRoot: directory,
        content: 'A warning about keys',
        type: 'warning',
        clock: fixedClock(),
        ids: fixedIds('01JEXAMPLE0000000000000001'),
      });
      const results = await searchMemory({
        projectRoot: directory,
        query: 'RFC',
        type: 'convention',
      });
      expect(results).toHaveLength(1);
      expect(results[0]?.entry.type).toBe('convention');
    });
  });
});
