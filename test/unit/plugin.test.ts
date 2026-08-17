import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { diagnoseProject } from '../../src/application/doctor.js';
import { initProject } from '../../src/application/init.js';
import {
  installPlugin,
  listPlugins,
  uninstallPlugin,
} from '../../src/application/plugin.js';
import { rememberEntry } from '../../src/application/remember.js';
import {
  engineSatisfied,
  parsePluginManifest,
  pluginDoctorDiagnostics,
} from '../../src/domain/plugin.js';
import { fixedClock, fixedIds, withTempDir } from '../helpers/temp.js';

const manifest = `{
  "schemaVersion": 1,
  "name": "deny-extra",
  "version": "1.0.0",
  "engines": { "cpmk": ">=0.9.0" },
  "permissions": ["doctor.contribute"],
  "doctor": {
    "warnings": [
      {
        "code": "PLUGIN_HINT",
        "path": ".cpmk",
        "message": "review deny globs before import"
      }
    ]
  }
}
`;

describe('plugin manifests', () => {
  it('parses a valid manifest and compares engines', () => {
    const parsed = parsePluginManifest(manifest, 'deny-extra', 'plugin.json');
    expect(parsed.name).toBe('deny-extra');
    expect(engineSatisfied('>=0.9.0', '0.9.0')).toBe(true);
    expect(engineSatisfied('>=1.0.0', '0.9.0')).toBe(false);
    expect(() => parsePluginManifest(manifest, 'other', 'plugin.json')).toThrow(
      /directory/,
    );
    expect(() =>
      parsePluginManifest('{"schemaVersion":1}', 'x', 'plugin.json'),
    ).toThrow();
    expect(() => parsePluginManifest('{', 'deny-extra', 'p')).toThrow(/JSON/);
    expect(() => parsePluginManifest('[]', 'deny-extra', 'p')).toThrow(
      /object/,
    );
    expect(() =>
      parsePluginManifest(
        '{"schemaVersion":1,"name":"deny-extra","extra":true}',
        'deny-extra',
        'p',
      ),
    ).toThrow(/unknown/);
    expect(
      pluginDoctorDiagnostics(
        {
          ...parsed,
          permissions: [],
        },
        '0.9.0',
      ),
    ).toEqual([]);
    expect(pluginDoctorDiagnostics(parsed, '0.1.0')).toEqual([]);
    expect(pluginDoctorDiagnostics(parsed, '0.9.0')[0]?.code).toBe(
      'PLUGIN_HINT',
    );
    expect(engineSatisfied('nope', '0.9.0')).toBe(false);
    expect(engineSatisfied('>=0.8.0', '0.9.0')).toBe(true);
  });
});

describe('plugin lifecycle', () => {
  it('installs, lists, contributes doctor warnings, and uninstalls', async () => {
    await withTempDir(async (directory) => {
      await initProject({ root: directory, name: 'plug' });
      await rememberEntry({
        projectRoot: directory,
        content: 'fact',
        clock: fixedClock(),
        ids: fixedIds(),
      });
      expect(await listPlugins({ projectRoot: directory })).toEqual([]);
      const source = path.join(directory, 'src-plugin');
      await mkdir(source);
      await writeFile(path.join(source, 'plugin.json'), manifest);
      const installed = await installPlugin({
        projectRoot: directory,
        sourcePath: source,
      });
      expect(installed.name).toBe('deny-extra');
      expect(await listPlugins({ projectRoot: directory })).toEqual([
        { name: 'deny-extra', version: '1.0.0', valid: true },
      ]);
      const doctor = await diagnoseProject({ projectRoot: directory });
      expect(
        doctor.diagnostics.some((item) => item.code === 'PLUGIN_HINT'),
      ).toBe(true);
      await writeFile(
        path.join(directory, '.cpmk/plugins/notes.txt'),
        'not-a-plugin',
      );
      await mkdir(path.join(directory, '.cpmk/plugins/broken'));
      await writeFile(
        path.join(directory, '.cpmk/plugins/broken/plugin.json'),
        '{',
      );
      const listed = await listPlugins({ projectRoot: directory });
      expect(listed.some((item) => item.name === 'broken' && !item.valid)).toBe(
        true,
      );
      await uninstallPlugin({ projectRoot: directory, name: 'deny-extra' });
      await expect(
        uninstallPlugin({ projectRoot: directory, name: 'deny-extra' }),
      ).rejects.toMatchObject({ code: 'VALIDATION' });
    });
  });
});
