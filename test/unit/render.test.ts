import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseEntry } from '../../src/domain/validate.js';
import { renderContext } from '../../src/domain/render.js';
import type { MemoryEntry } from '../../src/domain/types.js';

const specEntry = parseEntry(
  readFileSync(
    path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      '../fixtures/entry.valid.json',
    ),
    'utf8',
  ),
  'entry.json',
);

function entry(overrides: Partial<MemoryEntry>): MemoryEntry {
  return { ...specEntry, ...overrides };
}

describe('renderContext', () => {
  it('matches the specification golden document', () => {
    expect(renderContext([specEntry])).toBe(`# CPMK Project Context

## Decisions

### Use SQLite later, not in core
Milestone 1 stores one JSON file per memory entry.

Tags: \`architecture\`, \`storage\`
`);
  });

  it('omits empty type sections and keeps type order', () => {
    const rendered = renderContext([
      entry({
        id: '01JEXAMPLE0000000000000001',
        type: 'fact',
        title: 'A fact',
        content: 'fact body',
        tags: [],
      }),
      entry({
        id: '01JEXAMPLE0000000000000002',
        type: 'warning',
        title: 'A warning',
        content: 'warn body',
        tags: ['security'],
      }),
    ]);
    expect(rendered.indexOf('## Warnings')).toBeLessThan(
      rendered.indexOf('## Facts'),
    );
    expect(rendered).not.toContain('## Decisions');
  });

  it('is byte-identical for the same inputs', () => {
    const first = renderContext([specEntry]);
    const second = renderContext([specEntry]);
    expect(Buffer.from(first).equals(Buffer.from(second))).toBe(true);
  });
});
