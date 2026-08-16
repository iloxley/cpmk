import { readGitSnapshot, type GitSnapshot } from '../git/status.js';

export interface ProjectStatus {
  projectRoot: string;
  git?: GitSnapshot;
}

export function readProjectStatus(projectRoot: string): ProjectStatus {
  const git = readGitSnapshot(projectRoot);
  return git === undefined ? { projectRoot } : { projectRoot, git };
}
