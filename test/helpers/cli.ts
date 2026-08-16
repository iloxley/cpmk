import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);

export function cliPath(): string {
  const built = path.join(repoRoot, 'dist/cli.js');
  if (!existsSync(built)) {
    execSync('npm run build', { cwd: repoRoot, stdio: 'pipe' });
  }
  return built;
}

export interface CliResult {
  status: number;
  stdout: string;
  stderr: string;
}

export async function runPackagedCli(
  args: readonly string[],
  cwd: string,
): Promise<CliResult> {
  return await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cliPath(), ...args], {
      cwd,
      env: { ...process.env, NO_COLOR: '1' },
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk: Buffer | string) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (status) => {
      resolve({ status: status ?? 3, stdout, stderr });
    });
  });
}
