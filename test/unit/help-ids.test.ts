import { describe, expect, it } from 'vitest';
import { helpText } from '../../src/cli/help.js';
import { createUlidGenerator } from '../../src/domain/ids.js';
import { ID_PATTERN } from '../../src/domain/types.js';
import { run } from '../../src/cli/run.js';

describe('helpText', () => {
  it('covers each command topic', () => {
    expect(helpText()).toContain('cpmk <command>');
    expect(helpText('init')).toContain('cpmk init');
    expect(helpText('remember')).toContain('cpmk remember');
    expect(helpText('list')).toContain('cpmk list');
    expect(helpText('context')).toContain('cpmk context');
    expect(helpText('doctor')).toContain('cpmk doctor');
    expect(helpText('show')).toContain('cpmk show');
    expect(helpText('migrate')).toContain('cpmk migrate');
    expect(helpText('session')).toContain('cpmk session start');
    expect(helpText('cursor')).toContain('cpmk cursor generate');
    expect(helpText('dashboard')).toContain('cpmk dashboard');
  });
});

describe('createUlidGenerator', () => {
  it('produces monotonic 26-character IDs', () => {
    const ids = createUlidGenerator();
    const first = ids.next();
    const second = ids.next();
    expect(first).toMatch(ID_PATTERN);
    expect(second).toMatch(ID_PATTERN);
    expect(second > first).toBe(true);
  });
});

describe('command help', () => {
  it('prints topic help for each command', async () => {
    const output: string[] = [];
    const io = {
      stdout: (text: string) => output.push(text),
      stderr: () => undefined,
      cwd: () => process.cwd(),
    };
    for (const command of [
      'init',
      'remember',
      'list',
      'show',
      'edit',
      'archive',
      'supersede',
      'import',
      'export',
      'context',
      'doctor',
      'migrate',
      'status',
      'handoff',
      'hook',
      'session',
      'cursor',
      'dashboard',
    ]) {
      expect(await run([command, '--help'], io)).toBe(0);
    }
    expect(await run(['help', 'init'], io)).toBe(0);
  });
});
