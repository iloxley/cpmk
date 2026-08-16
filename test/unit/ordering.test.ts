import { describe, expect, it } from 'vitest';
import { sortForContext, sortForList } from '../../src/domain/ordering.js';
import type { MemoryEntry } from '../../src/domain/types.js';

function entry(
  overrides: Partial<MemoryEntry> &
    Pick<MemoryEntry, 'id' | 'type' | 'updatedAt'>,
): MemoryEntry {
  return {
    schemaVersion: 1,
    title: overrides.id,
    content: 'body',
    tags: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    source: 'manual',
    status: 'active',
    ...overrides,
  };
}

describe('ordering', () => {
  it('lists by updatedAt descending then ID ascending', () => {
    const listed = sortForList([
      entry({
        id: '01JEXAMPLE0000000000000002',
        type: 'fact',
        updatedAt: '2026-01-01T00:00:00.000Z',
      }),
      entry({
        id: '01JEXAMPLE0000000000000001',
        type: 'fact',
        updatedAt: '2026-01-02T00:00:00.000Z',
      }),
      entry({
        id: '01JEXAMPLE0000000000000000',
        type: 'fact',
        updatedAt: '2026-01-01T00:00:00.000Z',
      }),
    ]);
    expect(listed.map((item) => item.id)).toEqual([
      '01JEXAMPLE0000000000000001',
      '01JEXAMPLE0000000000000000',
      '01JEXAMPLE0000000000000002',
    ]);
  });

  it('orders context by type priority then recency', () => {
    const ordered = sortForContext([
      entry({
        id: '01JEXAMPLE0000000000000005',
        type: 'fact',
        updatedAt: '2026-01-03T00:00:00.000Z',
      }),
      entry({
        id: '01JEXAMPLE0000000000000004',
        type: 'decision',
        updatedAt: '2026-01-01T00:00:00.000Z',
      }),
      entry({
        id: '01JEXAMPLE0000000000000003',
        type: 'warning',
        updatedAt: '2026-01-01T00:00:00.000Z',
      }),
    ]);
    expect(ordered.map((item) => item.type)).toEqual([
      'warning',
      'decision',
      'fact',
    ]);
  });
});
