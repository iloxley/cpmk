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
  if (result.ok) {
    return `CPMK doctor: pass\nRoot: ${result.data.root}\nEntries: ${result.data.entryCount}\n`;
  }
  const lines = result.diagnostics.map(
    (diagnostic) =>
      `${diagnostic.severity} ${diagnostic.code} ${diagnostic.path}: ${diagnostic.message}`,
  );
  return `CPMK doctor: fail\n${lines.join('\n')}\n`;
}

export function formatDoctorJson(result: DoctorResult): string {
  return `${JSON.stringify({
    ok: result.ok,
    data: result.data,
    diagnostics: result.diagnostics,
  })}\n`;
}
