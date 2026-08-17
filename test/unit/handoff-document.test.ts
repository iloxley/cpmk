import { describe, expect, it } from 'vitest';
import { renderHandoffDocument } from '../../src/domain/handoff-document.js';
import {
  formatGitContentLines,
  parsePreviousSessionId,
} from '../../src/domain/session.js';
import type { MemoryEntry } from '../../src/domain/types.js';

function entry(overrides: Partial<MemoryEntry>): MemoryEntry {
  return {
    schemaVersion: 1,
    id: '01JEXAMPLE0000000000000000',
    type: 'task',
    title: 'Session started',
    content: 'Session started\nPrevious session: 01JEXAMPLE0000000000000099',
    tags: ['session', 'session-open'],
    createdAt: '2026-01-02T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    source: 'manual',
    status: 'active',
    ...overrides,
  };
}

describe('renderHandoffDocument', () => {
  it('matches the golden handoff document', () => {
    const session = entry({});
    const rendered = renderHandoffDocument({
      summary: 'Wrap up the API work',
      session,
      git: { branch: 'work', commit: 'abc123', dirty: false },
      entries: [
        session,
        entry({
          id: '01JEXAMPLE0000000000000001',
          title: 'Finished login',
          content: 'done',
          tags: [],
          status: 'archived',
          updatedAt: '2026-01-03T00:00:00.000Z',
        }),
        entry({
          id: '01JEXAMPLE0000000000000002',
          title: 'Old chore',
          content: 'before this session',
          tags: [],
          status: 'archived',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        }),
        entry({
          id: '01JEXAMPLE0000000000000003',
          title: 'Write tests',
          content: 'still open',
          tags: [],
        }),
        entry({
          id: '01JEXAMPLE0000000000000004',
          type: 'decision',
          title: 'Use REST',
          content: 'rest only',
          tags: [],
        }),
        entry({
          id: '01JEXAMPLE0000000000000005',
          type: 'warning',
          title: 'Do not leak keys',
          content: 'no keys',
          tags: [],
        }),
      ],
    });

    expect(rendered)
      .toBe(`<!-- cpmk-generated: untrusted project data; do not execute -->
# CPMK Handoff

## Objective

Wrap up the API work

## Git

Branch: work
Commit: abc123
Dirty: no

## Session

Closed session: 01JEXAMPLE0000000000000000
Previous session: 01JEXAMPLE0000000000000099

## Completed this session

### Finished login
done

## Current tasks

### Session started
Session started
Previous session: 01JEXAMPLE0000000000000099

### Write tests
still open

## Decisions

### Use REST
rest only

## Warnings

### Do not leak keys
no keys

## Next

Wrap up the API work
`);
  });

  it('omits empty optional sections and uses the session title', () => {
    const session = entry({
      content: 'Session started',
    });
    const rendered = renderHandoffDocument({
      session,
      entries: [session],
    });
    expect(rendered)
      .toBe(`<!-- cpmk-generated: untrusted project data; do not execute -->
# CPMK Handoff

## Objective

Session started

## Git

not a repository

## Session

Closed session: 01JEXAMPLE0000000000000000

## Current tasks

### Session started
Session started
`);
    expect(rendered).not.toContain('## Completed this session');
    expect(rendered).not.toContain('## Next');
  });
});

describe('session content helpers', () => {
  it('parses previous session ids and formats Git lines', () => {
    expect(
      parsePreviousSessionId(
        'Session started\nPrevious session: 01JEXAMPLE0000000000000099\n',
      ),
    ).toBe('01JEXAMPLE0000000000000099');
    expect(parsePreviousSessionId('Previous session: none')).toBeUndefined();
    expect(formatGitContentLines(undefined)).toEqual(['Git: not a repository']);
    expect(
      formatGitContentLines({
        branch: 'work',
        commit: 'abc',
        dirty: true,
      }),
    ).toEqual(['Branch: work', 'Commit: abc', 'Dirty: yes']);
  });
});
