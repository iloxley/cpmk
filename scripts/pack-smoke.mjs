import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
const tarballName = `cpmk-${pkg.version}.tgz`;

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1' },
  });
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(' ')} failed (${result.status})\n${result.stdout}\n${result.stderr}`,
    );
  }
  return result;
}

run('npm', ['pack'], root);

const work = mkdtempSync(path.join(tmpdir(), 'cpmk-pack-smoke-'));
try {
  run('npm', ['init', '-y'], work);
  run('npm', ['install', path.join(root, tarballName)], work);
  const version = run('npx', ['cpmk', '--version'], work);
  if (!version.stdout.includes(pkg.version)) {
    throw new Error(`expected version ${pkg.version}, got ${version.stdout}`);
  }
  const project = path.join(work, 'sample');
  run(
    process.execPath,
    ['-e', `require('fs').mkdirSync(${JSON.stringify(project)})`],
    work,
  );
  run('npx', ['cpmk', 'init', '--root', project, '--name', 'smoke'], work);
  run(
    'npx',
    ['cpmk', 'remember', '--root', project, 'Pack smoke remembers a fact'],
    work,
  );
  run('npx', ['cpmk', 'list', '--root', project, '--json'], work);
  run('npx', ['cpmk', 'context', '--root', project, '--budget', '400'], work);
  const doctor = run(
    'npx',
    ['cpmk', 'doctor', '--root', project, '--json'],
    work,
  );
  const parsed = JSON.parse(doctor.stdout);
  if (parsed.ok !== true) {
    throw new Error(`doctor failed: ${doctor.stdout}`);
  }
  console.log('pack smoke ok');
} finally {
  rmSync(work, { recursive: true, force: true });
  rmSync(path.join(root, tarballName), { force: true });
}
