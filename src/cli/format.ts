import type { ScoredEntry } from '../domain/search.js';
import type { SessionStatusData } from '../application/session.js';
import type { SyncConflictFile, SyncReport } from '../application/sync.js';
import type { DoctorResult, MemoryEntry } from '../domain/types.js';

export function formatListHuman(entries: readonly MemoryEntry[]): string {
  if (entries.length === 0) {
    return '';
  }
  return `${entries
    .map((entry) => {
      const date = entry.updatedAt.slice(0, 10);
      return `${entry.id}  ${entry.type}  ${date}  ${entry.title}`;
    })
    .join('\n')}\n`;
}

export function formatListJson(entries: readonly MemoryEntry[]): string {
  return `${JSON.stringify(entries)}\n`;
}

export function formatDoctorHuman(result: DoctorResult): string {
  if (result.ok && result.diagnostics.length === 0) {
    return `CPMK doctor: pass\nRoot: ${result.data.root}\nEntries: ${result.data.entryCount}\n`;
  }
  if (result.ok) {
    const lines = result.diagnostics.map(
      (diagnostic) =>
        `${diagnostic.severity} ${diagnostic.code} ${diagnostic.path}: ${diagnostic.message}`,
    );
    return `CPMK doctor: pass\nRoot: ${result.data.root}\nEntries: ${result.data.entryCount}\n${lines.join('\n')}\n`;
  }
  const lines = result.diagnostics.map(
    (diagnostic) =>
      `${diagnostic.severity} ${diagnostic.code} ${diagnostic.path}: ${diagnostic.message}`,
  );
  return `CPMK doctor: fail\n${lines.join('\n')}\n`;
}

export function formatShowHuman(entry: MemoryEntry): string {
  const tags = entry.tags.length === 0 ? '' : entry.tags.join(', ');
  return `ID: ${entry.id}
Type: ${entry.type}
Status: ${entry.status}
Source: ${entry.source}
Created: ${entry.createdAt}
Updated: ${entry.updatedAt}
Tags: ${tags}

${entry.title}
${entry.content}
`;
}

export function formatShowJson(entry: MemoryEntry): string {
  return `${JSON.stringify(entry)}\n`;
}

function dirtyLabel(git: SessionStatusData['git']): string {
  if (git === null) {
    return 'n/a';
  }
  return git.dirty ? 'yes' : 'no';
}

export function formatSessionStatusHuman(data: SessionStatusData): string {
  if (!data.open || data.id === null) {
    return 'session: none\n';
  }
  const updated = (data.updatedAt ?? '').slice(0, 10);
  return `session: ${data.id}\ntitle: ${data.title ?? ''}\nupdated: ${updated}\ntasks: ${data.activeTaskCount}\ndirty: ${dirtyLabel(data.git)}\n`;
}

export function formatSessionStatusJson(data: SessionStatusData): string {
  return `${JSON.stringify({ ok: true, data, diagnostics: [] })}\n`;
}

export function formatSyncReportHuman(report: SyncReport): string {
  return `add: ${report.addedCount}\nconflicts: ${report.conflictCount}\nunchanged: ${report.unchanged}\n`;
}

export function formatSyncReportJson(report: SyncReport): string {
  return `${JSON.stringify({ ok: true, data: report, diagnostics: [] })}\n`;
}

export function formatSyncStatusHuman(file: SyncConflictFile): string {
  return `conflicts: ${file.conflicts.length}\n`;
}

export function formatSearchHuman(results: readonly ScoredEntry[]): string {
  if (results.length === 0) {
    return '';
  }
  return `${results
    .map(
      (item) =>
        `${item.entry.id}  ${item.entry.type}  ${item.score}  ${item.entry.title}`,
    )
    .join('\n')}\n`;
}

export function formatSearchJson(
  query: string,
  results: readonly ScoredEntry[],
): string {
  return `${JSON.stringify({
    ok: true,
    data: { query, results },
    diagnostics: [],
  })}\n`;
}

export function formatSyncStatusJson(file: SyncConflictFile): string {
  return `${JSON.stringify({ ok: true, data: file, diagnostics: [] })}\n`;
}

export function formatDoctorJson(result: DoctorResult): string {
  return `${JSON.stringify({
    ok: result.ok,
    data: result.data,
    diagnostics: result.diagnostics,
  })}\n`;
}
