import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CpmkError } from '../../src/domain/errors.js';
import {
  parseConfig,
  parseEntry,
  validateConfigValue,
  validateEntryValue,
} from '../../src/domain/validate.js';
import { createDefaultConfig } from '../../src/domain/config.js';
import {
  CONTENT_MAX_LENGTH,
  TITLE_MAX_LENGTH,
} from '../../src/domain/types.js';

const fixture = readFileSync(
  path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    '../fixtures/entry.valid.json',
  ),
  'utf8',
);

function validEntry(overrides: Record<string, unknown> = {}) {
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

describe('config validation', () => {
  it('accepts the default config', () => {
    expect(
      validateConfigValue(createDefaultConfig('example')).project.name,
    ).toBe('example');
  });

  it('rejects unknown properties', () => {
    expect(() =>
      validateConfigValue({ ...createDefaultConfig('example'), extra: true }),
    ).toThrow(CpmkError);
  });

  it('rejects unsupported schema versions before other fields', () => {
    try {
      validateConfigValue({ schemaVersion: 2 });
      throw new Error('expected failure');
    } catch (error) {
      expect(error).toBeInstanceOf(CpmkError);
      expect((error as CpmkError).code).toBe('UNSUPPORTED_SCHEMA');
    }
  });

  it('rejects missing schemaVersion', () => {
    expect(() => validateConfigValue({ project: { name: 'x' } })).toThrow(
      /missing schemaVersion/,
    );
  });

  it('rejects empty project names', () => {
    const config = createDefaultConfig('   ');
    expect(() => validateConfigValue(config)).toThrow(/project.name/);
  });

  it('parses raw JSON and rejects invalid JSON without echoing contents', () => {
    expect(() => parseConfig('{', 'config.json')).toThrow(/not valid JSON/);
    try {
      parseConfig('{"secret":"value"', 'config.json');
    } catch (error) {
      expect(String(error)).not.toContain('secret');
    }
  });
});

describe('entry validation', () => {
  it('accepts the specification example', () => {
    const entry = parseEntry(fixture, 'entry.json');
    expect(entry.id).toBe('01JEXAMPLE0000000000000000');
    expect(entry.tags).toEqual(['architecture', 'storage']);
  });

  it('rejects unknown properties', () => {
    expect(() => validateEntryValue(validEntry({ extra: true }))).toThrow(
      /invalid/,
    );
  });

  it('accepts title and content length boundaries', () => {
    expect(() =>
      validateEntryValue(validEntry({ title: 'x'.repeat(TITLE_MAX_LENGTH) })),
    ).not.toThrow();
    expect(() =>
      validateEntryValue(
        validEntry({ title: 'x'.repeat(TITLE_MAX_LENGTH + 1) }),
      ),
    ).toThrow(/title/);
    expect(() =>
      validateEntryValue(
        validEntry({ content: 'x'.repeat(CONTENT_MAX_LENGTH) }),
      ),
    ).not.toThrow();
    expect(() =>
      validateEntryValue(
        validEntry({ content: 'x'.repeat(CONTENT_MAX_LENGTH + 1) }),
      ),
    ).toThrow(/content/);
  });

  it('rejects empty title and content after schema minLength', () => {
    expect(() => validateEntryValue(validEntry({ title: '' }))).toThrow();
    expect(() => validateEntryValue(validEntry({ content: '' }))).toThrow();
  });

  it('rejects more than 20 tags and invalid tag shapes', () => {
    const tags = Array.from({ length: 21 }, (_, index) => `tag-${index}`);
    expect(() => validateEntryValue(validEntry({ tags }))).toThrow(/tags/);
    expect(() => validateEntryValue(validEntry({ tags: ['Bad'] }))).toThrow(
      /tag/,
    );
    expect(() =>
      validateEntryValue(validEntry({ tags: ['-leading'] })),
    ).toThrow(/tag/);
  });

  it('rejects updatedAt before createdAt and invalid timestamps', () => {
    expect(() =>
      validateEntryValue(
        validEntry({
          createdAt: '2026-01-02T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        }),
      ),
    ).toThrow(/updatedAt/);
    expect(() =>
      validateEntryValue(validEntry({ createdAt: '2026-01-01' })),
    ).toThrow(/createdAt/);
  });

  it('rejects unsupported entry schema versions', () => {
    expect(() => validateEntryValue(validEntry({ schemaVersion: 9 }))).toThrow(
      /unsupported schemaVersion 9/,
    );
  });
});
