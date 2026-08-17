import type { MemoryEntry } from './types.js';

export interface SyncConflict {
  id: string;
  local: MemoryEntry;
  incoming: MemoryEntry;
}

export interface MergeResult {
  add: MemoryEntry[];
  conflicts: SyncConflict[];
  unchanged: number;
}

export function canonicalEntry(entry: MemoryEntry): MemoryEntry {
  return {
    schemaVersion: entry.schemaVersion,
    id: entry.id,
    type: entry.type,
    title: entry.title,
    content: entry.content,
    tags: [...entry.tags],
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    source: entry.source,
    status: entry.status,
  };
}

export function entriesEqual(left: MemoryEntry, right: MemoryEntry): boolean {
  return (
    JSON.stringify(canonicalEntry(left)) ===
    JSON.stringify(canonicalEntry(right))
  );
}

export function mergeEntries(
  local: readonly MemoryEntry[],
  incoming: readonly MemoryEntry[],
): MergeResult {
  const localById = new Map(local.map((entry) => [entry.id, entry]));
  const add: MemoryEntry[] = [];
  const conflicts: SyncConflict[] = [];
  let unchanged = 0;

  for (const entry of incoming) {
    const current = localById.get(entry.id);
    if (current === undefined) {
      add.push(canonicalEntry(entry));
      continue;
    }
    if (entriesEqual(current, entry)) {
      unchanged += 1;
      continue;
    }
    conflicts.push({
      id: entry.id,
      local: canonicalEntry(current),
      incoming: canonicalEntry(entry),
    });
  }

  conflicts.sort((a, b) => (a.id < b.id ? -1 : 1));
  add.sort((a, b) => (a.id < b.id ? -1 : 1));
  return { add, conflicts, unchanged };
}
