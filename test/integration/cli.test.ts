import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { runPackagedCli } from '../helpers/cli.js';
import { withTempDir } from '../helpers/temp.js';

describe('packaged CLI', () => {
  it('runs the Milestone 1 command flow in an isolated directory', async () => {
    await withTempDir(async (directory) => {
      const missing = await runPackagedCli(['list'], directory);
      expect(missing.status).toBe(2);
      expect(missing.stdout).toBe('');
      expect(missing.stderr).toMatch(/no CPMK project found/);

      const init = await runPackagedCli(
        ['init', '--name', 'basic-project'],
        directory,
      );
      expect(init.status).toBe(0);
      expect(init.stdout).toContain('.cpmk');

      const remember = await runPackagedCli(
        [
          'remember',
          'Use strict TypeScript',
          '--type',
          'convention',
          '--tag',
          'typescript',
        ],
        directory,
      );
      expect(remember.status).toBe(0);
      expect(remember.stdout.trim()).toMatch(/^[0-9A-Z]{26}$/);

      await runPackagedCli(
        [
          'remember',
          'Never commit credentials',
          '--type',
          'warning',
          '--tag',
          'security',
        ],
        directory,
      );

      const list = await runPackagedCli(['list', '--json'], directory);
      expect(list.status).toBe(0);
      const entries: unknown = JSON.parse(list.stdout);
      expect(Array.isArray(entries)).toBe(true);
      expect(list.stdout.startsWith('[')).toBe(true);

      const context = await runPackagedCli(
        ['context', '--budget', '2000'],
        directory,
      );
      expect(context.status).toBe(0);
      expect(context.stdout.startsWith('# CPMK Project Context\n')).toBe(true);
      expect(context.stdout.indexOf('## Warnings')).toBeLessThan(
        context.stdout.indexOf('## Conventions'),
      );

      const output = path.join(directory, 'generated-context.md');
      const written = await runPackagedCli(
        ['context', '--output', output, '--budget', '2000'],
        directory,
      );
      expect(written.status).toBe(0);
      expect(written.stdout).toBe('');
      expect(await readFile(output, 'utf8')).toContain(
        '# CPMK Project Context',
      );

      const doctor = await runPackagedCli(['doctor', '--json'], directory);
      expect(doctor.status).toBe(0);
      const payload: { ok: boolean } = JSON.parse(doctor.stdout) as {
        ok: boolean;
      };
      expect(payload.ok).toBe(true);
    });
  });

  it('discovers a parent project from a nested working directory', async () => {
    await withTempDir(async (directory) => {
      await runPackagedCli(['init', '--name', 'nested'], directory);
      const nested = path.join(directory, 'src', 'app');
      await mkdir(nested, { recursive: true });
      const list = await runPackagedCli(['list', '--json'], nested);
      expect(list.status).toBe(0);
      expect(list.stdout).toBe('[]\n');
    });
  });

  it('uses --root without walking upward for init', async () => {
    await withTempDir(async (directory) => {
      const child = path.join(directory, 'child');
      await mkdir(child);
      await runPackagedCli(['init', '--name', 'parent'], directory);
      const initChild = await runPackagedCli(
        ['init', '--root', child, '--name', 'child'],
        directory,
      );
      expect(initChild.status).toBe(0);
      expect(initChild.stdout).toContain(path.join('child', '.cpmk'));
    });
  });
});
