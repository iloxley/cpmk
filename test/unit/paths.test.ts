import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { CpmkError } from '../../src/domain/errors.js';
import {
  assertInsideRoot,
  displayPath,
  isInsideRoot,
} from '../../src/storage/paths.js';

describe('path containment', () => {
  it('accepts paths inside the root and rejects escapes', () => {
    const root = path.resolve('/tmp/project');
    expect(isInsideRoot(root, path.join(root, '.cpmk/config.json'))).toBe(true);
    expect(isInsideRoot(root, root)).toBe(true);
    expect(isInsideRoot(root, path.resolve(root, '..', 'outside'))).toBe(false);
    expect(() => {
      assertInsideRoot(root, path.resolve(root, '..', 'outside.txt'));
    }).toThrow(CpmkError);
  });

  it('renders diagnostics with stable slashes', () => {
    const root = path.resolve('/tmp/project');
    expect(
      displayPath(root, path.join(root, '.cpmk', 'memory', 'a.json')),
    ).toBe('.cpmk/memory/a.json');
  });
});
