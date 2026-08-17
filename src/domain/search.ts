import { compareByUpdatedThenId } from './ordering.js';
import { usageError } from './errors.js';
import type { MemoryEntry } from './types.js';

export interface ScoredEntry {
  entry: MemoryEntry;
  score: number;
}

export function tokenizeQuery(query: string): string[] {
  const tokens = query
    .toLowerCase()
    .split(/[^a-z0-9]+/u)
    .filter((token) => token.length > 0);
  return [...new Set(tokens)];
}

export function scoreEntry(
  entry: MemoryEntry,
  tokens: readonly string[],
): number {
  if (tokens.length === 0) {
    return 0;
  }
  const title = entry.title.toLowerCase();
  const content = entry.content.toLowerCase();
  const tags = new Set(entry.tags);
  let score = 0;
  for (const token of tokens) {
    if (title.includes(token)) {
      score += 3;
    }
    if (tags.has(token)) {
      score += 2;
    }
    if (content.includes(token)) {
      score += 1;
    }
  }
  return score;
}

export function rankSearchResults(
  entries: readonly MemoryEntry[],
  query: string,
): ScoredEntry[] {
  const tokens = tokenizeQuery(query);
  if (tokens.length === 0) {
    throw usageError('search query must contain letters or numbers');
  }
  return entries
    .map((entry) => ({ entry, score: scoreEntry(entry, tokens) }))
    .filter((item) => item.score > 0)
    .sort((left, right) => {
      if (left.score !== right.score) {
        return right.score - left.score;
      }
      return compareByUpdatedThenId(left.entry, right.entry);
    });
}
