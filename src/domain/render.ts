import {
  CONTEXT_TYPE_ORDER,
  type EntryType,
  type MemoryEntry,
} from './types.js';

export const CONTEXT_HEADER = '# CPMK Project Context\n\n';

const SECTION_HEADINGS: Record<EntryType, string> = {
  warning: 'Warnings',
  decision: 'Decisions',
  convention: 'Conventions',
  handoff: 'Handoffs',
  task: 'Tasks',
  fact: 'Facts',
};

export function renderEntry(entry: MemoryEntry): string {
  const tags = entry.tags.map((tag) => `\`${tag}\``).join(', ');
  return `### ${entry.title}\n${entry.content}\n\nTags: ${tags}\n`;
}

export function renderSection(
  type: EntryType,
  entries: readonly MemoryEntry[],
): string {
  if (entries.length === 0) {
    return '';
  }
  return `## ${SECTION_HEADINGS[type]}\n\n${entries.map(renderEntry).join('\n')}`;
}

export function renderContext(entries: readonly MemoryEntry[]): string {
  const grouped = new Map<EntryType, MemoryEntry[]>();
  for (const type of CONTEXT_TYPE_ORDER) {
    grouped.set(type, []);
  }
  for (const entry of entries) {
    grouped.get(entry.type)?.push(entry);
  }

  const sections: string[] = [];
  for (const type of CONTEXT_TYPE_ORDER) {
    const group = grouped.get(type) ?? [];
    const section = renderSection(type, group);
    if (section.length > 0) {
      sections.push(section);
    }
  }

  const document = CONTEXT_HEADER + sections.join('\n');
  return document.endsWith('\n') ? document : `${document}\n`;
}
