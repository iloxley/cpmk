import { describe, expect, it } from 'vitest';
import { parseCli } from '../../src/cli/args.js';
import { exitCodeFor, formatUnexpected, run } from '../../src/cli/run.js';
import { CpmkError } from '../../src/domain/errors.js';

describe('parseCli', () => {
  it('parses help, version, and the five commands', () => {
    expect(parseCli(['--help'])).toEqual({ kind: 'help' });
    expect(parseCli(['--version'])).toEqual({ kind: 'version' });
    expect(parseCli(['init', '--name', 'demo', '--root', '/tmp/p'])).toEqual({
      kind: 'init',
      name: 'demo',
      root: '/tmp/p',
    });
    expect(
      parseCli([
        'remember',
        'hello',
        '--type',
        'decision',
        '--tag',
        'a',
        '--tag',
        'b',
      ]),
    ).toEqual({
      kind: 'remember',
      content: 'hello',
      type: 'decision',
      tags: ['a', 'b'],
    });
    expect(parseCli(['list', '--json', '--tag', 'a'])).toEqual({
      kind: 'list',
      json: true,
      tag: 'a',
    });
    expect(
      parseCli(['context', '--budget', '4000', '--output', 'out.md']),
    ).toEqual({
      kind: 'context',
      budget: 4000,
      output: 'out.md',
    });
    expect(parseCli(['doctor', '--json'])).toEqual({
      kind: 'doctor',
      json: true,
    });
    expect(parseCli(['session', 'start', '--title', 'API work'])).toEqual({
      kind: 'session-start',
      title: 'API work',
    });
    expect(parseCli(['session', 'status', '--json'])).toEqual({
      kind: 'session-status',
      json: true,
    });
    expect(parseCli(['session', 'end', 'Pause here'])).toEqual({
      kind: 'session-end',
      summary: 'Pause here',
    });
    expect(parseCli(['session', 'resume'])).toEqual({
      kind: 'session-resume',
    });
    expect(
      parseCli(['cursor', 'generate', '--budget', '4000', '--output', 'out']),
    ).toEqual({
      kind: 'cursor-generate',
      budget: 4000,
      output: 'out',
    });
    expect(parseCli(['dashboard', '--port', '0'])).toEqual({
      kind: 'dashboard',
      port: 0,
    });
  });

  it('rejects unknown commands and invalid usage', () => {
    expect(() => parseCli([])).toThrow(/missing command/);
    expect(() => parseCli(['sync'])).toThrow(/unknown command/);
    expect(() => parseCli(['remember'])).toThrow(/content/);
    expect(() => parseCli(['context', '--budget', 'nope'])).toThrow(/budget/);
    expect(() => parseCli(['list', '--tag', 'a', '--tag', 'b'])).toThrow(
      /single --tag/,
    );
    expect(() => parseCli(['session'])).toThrow(
      /session requires start, status, end, or resume/,
    );
    expect(() => parseCli(['session', 'start', 'extra'])).toThrow(
      /session start does not take extra arguments/,
    );
    expect(() => parseCli(['cursor'])).toThrow(/cursor requires generate/);
    expect(() => parseCli(['dashboard', '--port', 'nope'])).toThrow(/port/);
    expect(() => parseCli(['dashboard', '--port', '70000'])).toThrow(/port/);
  });
});

describe('run help and version', () => {
  it('prints help and version without touching disk', async () => {
    const lines: string[] = [];
    const io = {
      stdout: (text: string) => lines.push(`out:${text}`),
      stderr: (text: string) => lines.push(`err:${text}`),
      cwd: () => '/tmp',
    };
    expect(await run(['--help'], io)).toBe(0);
    expect(await run(['--version'], io)).toBe(0);
    expect(await run(['sync'], io)).toBe(2);
    expect(lines.some((line) => line.startsWith('err:'))).toBe(true);
  });
});

describe('error mapping', () => {
  it('maps typed errors and sanitizes unexpected failures', () => {
    const error = new CpmkError({
      code: 'VALIDATION',
      message: 'bad',
      exitCode: 1,
      path: '.cpmk/config.json',
    });
    expect(exitCodeFor(error)).toBe(1);
    expect(formatUnexpected(error)).toBe('.cpmk/config.json: bad\n');
    expect(exitCodeFor(new Error('boom'))).toBe(3);
    expect(formatUnexpected(new Error('boom'))).toBe('internal error\n');
    expect(formatUnexpected({ code: 'EPERM' })).toBe('internal error: EPERM\n');
  });
});
