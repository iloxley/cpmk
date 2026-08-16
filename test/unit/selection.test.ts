import { describe, expect, it } from 'vitest';
import { CONTEXT_HEADER, renderContext } from '../../src/domain/render.js';
import { headerBudget, selectEntries } from '../../src/domain/selection.js';
import { unicodeLength } from '../../src/domain/unicode.js';
import type { MemoryEntry } from '../../src/domain/types.js';

function entry(overrides: Partial<MemoryEntry> = {}): MemoryEntry {
  return {
    schemaVersion: 1,
    id: '01JEXAMPLE0000000000000000',
    type: 'decision',
    title: 'Use SQLite later, not in core',
    content: 'Milestone 1 stores one JSON file per memory entry.',
    tags: ['architecture', 'storage'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    source: 'manual',
    status: 'active',
    ...overrides,
  };
}

describe('selectEntries', () => {
  it('rejects budgets smaller than the fixed header', () => {
    expect(() => selectEntries([], headerBudget() - 1)).toThrow(/header/);
  });

  it('includes an entry only when the complete document fits', () => {
    const sample = entry();
    const exact = unicodeLength(renderContext([sample]));
    expect(selectEntries([sample], exact)).toEqual([sample]);
    expect(selectEntries([sample], exact - 1)).toEqual([]);
  });

  it('skips an oversized entry and may include a later smaller one', () => {
    const large = entry({
      id: '01JEXAMPLE0000000000000001',
      type: 'warning',
      title: 'Large',
      content: 'x'.repeat(200),
      updatedAt: '2026-01-02T00:00:00.000Z',
    });
    const small = entry({
      id: '01JEXAMPLE0000000000000002',
      type: 'fact',
      title: 'Small',
      content: 'ok',
      tags: [],
    });
    const budget = unicodeLength(renderContext([small])) + 10;
    expect(
      selectEntries([large, small], budget).map((item) => item.id),
    ).toEqual([small.id]);
  });

  it('never truncates entry content', () => {
    const sample = entry({ content: 'exact body' });
    const rendered = renderContext(selectEntries([sample], 10_000));
    expect(rendered).toContain('\nexact body\n');
    expect(rendered).not.toMatch(/exact body\.\.\./);
  });

  it('counts Unicode code points, not UTF-16 units', () => {
    const sample = entry({
      title: 'Emoji',
      content: '😀',
      tags: [],
    });
    const budget = unicodeLength(renderContext([sample]));
    expect(selectEntries([sample], budget)).toHaveLength(1);
    expect(sample.content.length).toBe(2);
    expect(unicodeLength(sample.content)).toBe(1);
  });
});

describe('headerBudget', () => {
  it('matches the rendered header length', () => {
    expect(headerBudget()).toBe(unicodeLength(CONTEXT_HEADER));
  });
});
