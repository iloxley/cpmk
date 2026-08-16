import { spawnSync } from 'node:child_process';

export interface GitSnapshot {
  root: string;
  branch: string;
  commit: string;
  dirty: boolean;
}

function git(
  cwd: string,
  args: readonly string[],
): { status: number; stdout: string; stderr: string } {
  const result = spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' },
  });
  return {
    status: result.status ?? 1,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

export function readGitSnapshot(cwd: string): GitSnapshot | undefined {
  const top = git(cwd, ['rev-parse', '--show-toplevel']);
  if (top.status !== 0) {
    return undefined;
  }
  const root = top.stdout.trim();
  const branch = git(root, ['rev-parse', '--abbrev-ref', 'HEAD']);
  const commit = git(root, ['rev-parse', 'HEAD']);
  const porcelain = git(root, ['status', '--porcelain']);
  if (branch.status !== 0 || commit.status !== 0 || porcelain.status !== 0) {
    return undefined;
  }
  return {
    root,
    branch: branch.stdout.trim(),
    commit: commit.stdout.trim(),
    dirty: porcelain.stdout.trim().length > 0,
  };
}
