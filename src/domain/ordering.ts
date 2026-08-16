import { CONTEXT_TYPE_ORDER, type MemoryEntry } from './types.js';

export function compareByUpdatedThenId(a: MemoryEntry, b: MemoryEntry): number {
  if (a.updatedAt !== b.updatedAt) {
    return a.updatedAt < b.updatedAt ? 1 : -1;
  }
  if (a.id === b.id) {
    return 0;
  }
  return a.id < b.id ? -1 : 1;
}

export function compareForContext(a: MemoryEntry, b: MemoryEntry): number {
  const typeDiff =
    CONTEXT_TYPE_ORDER.indexOf(a.type) - CONTEXT_TYPE_ORDER.indexOf(b.type);
  if (typeDiff !== 0) {
    return typeDiff;
  }
  return compareByUpdatedThenId(a, b);
}

export function sortForList(entries: readonly MemoryEntry[]): MemoryEntry[] {
  return [...entries].sort(compareByUpdatedThenId);
}

export function sortForContext(entries: readonly MemoryEntry[]): MemoryEntry[] {
  return [...entries].sort(compareForContext);
}
