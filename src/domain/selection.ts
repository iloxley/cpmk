import { validationError } from './errors.js';
import { sortForContext } from './ordering.js';
import { CONTEXT_HEADER, renderContext } from './render.js';
import { unicodeLength } from './unicode.js';
import type { MemoryEntry } from './types.js';

export function headerBudget(): number {
  return unicodeLength(CONTEXT_HEADER);
}

export function selectEntries(
  entries: readonly MemoryEntry[],
  budget: number,
): MemoryEntry[] {
  const minimum = headerBudget();
  if (!Number.isInteger(budget) || budget < minimum) {
    throw validationError(
      `budget must be an integer of at least ${minimum} characters to fit the context header`,
    );
  }

  const selected: MemoryEntry[] = [];
  for (const entry of sortForContext(entries)) {
    const candidate = [...selected, entry];
    if (unicodeLength(renderContext(candidate)) <= budget) {
      selected.push(entry);
    }
  }
  return selected;
}
