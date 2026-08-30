import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const PACKAGED_DOCS = {
  guide: 'USER_GUIDE.md',
  demo: 'DEMO_WALKTHROUGH.md',
} as const;

export type PackagedDoc = keyof typeof PACKAGED_DOCS;

function packageRoot(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
}

export function packagedDocPath(doc: PackagedDoc): string {
  return path.join(packageRoot(), 'docs', PACKAGED_DOCS[doc]);
}

export async function loadPackagedDoc(doc: PackagedDoc): Promise<string> {
  return readFile(packagedDocPath(doc), 'utf8');
}

export function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function isSafeHref(href: string): boolean {
  const trimmed = href.trim();
  if (trimmed.length === 0 || trimmed.includes(' ')) {
    return false;
  }
  if (
    trimmed.startsWith('#') ||
    trimmed.startsWith('/') ||
    trimmed.startsWith('./')
  ) {
    return true;
  }
  if (trimmed.startsWith('../')) {
    return true;
  }
  if (/^[A-Za-z0-9._-]+\.md(?:#.*)?$/.test(trimmed)) {
    return true;
  }
  return /^https?:\/\//i.test(trimmed);
}

function inline(text: string): string {
  let out = escapeHtml(text);
  out = out.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_match, label: string, href: string) => {
      if (!isSafeHref(href)) {
        return label;
      }
      return `<a href="${escapeHtml(href)}">${label}</a>`;
    },
  );
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  return out;
}

function heading(line: string): string | undefined {
  const match = /^(#{1,4})\s+(.+)$/.exec(line);
  const marks = match?.[1];
  const text = match?.[2];
  if (marks === undefined || text === undefined) {
    return undefined;
  }
  return `<h${marks.length}>${inline(text)}</h${marks.length}>`;
}

export function renderMarkdownDocument(markdown: string): string {
  const lines = markdown.replaceAll('\r\n', '\n').split('\n');
  const html: string[] = [];
  let i = 0;
  let inUl = false;
  let inOl = false;
  let paragraph: string[] = [];

  const flushParagraph = (): void => {
    if (paragraph.length > 0) {
      html.push(`<p>${inline(paragraph.join(' '))}</p>`);
      paragraph = [];
    }
  };

  const flushLists = (): void => {
    if (inUl) {
      html.push('</ul>');
      inUl = false;
    }
    if (inOl) {
      html.push('</ol>');
      inOl = false;
    }
  };

  while (i < lines.length) {
    const line = lines[i] ?? '';

    if (line.startsWith('```')) {
      flushParagraph();
      flushLists();
      const fence: string[] = [];
      i += 1;
      while (i < lines.length && !(lines[i] ?? '').startsWith('```')) {
        fence.push(lines[i] ?? '');
        i += 1;
      }
      html.push(`<pre><code>${escapeHtml(fence.join('\n'))}</code></pre>`);
      i += 1;
      continue;
    }

    if (line.trim() === '') {
      flushParagraph();
      flushLists();
      i += 1;
      continue;
    }

    if (/^---+$/.test(line.trim())) {
      flushParagraph();
      flushLists();
      html.push('<hr>');
      i += 1;
      continue;
    }

    const headingHtml = heading(line);
    if (headingHtml !== undefined) {
      flushParagraph();
      flushLists();
      html.push(headingHtml);
      i += 1;
      continue;
    }

    const ul = /^[-*]\s+(.+)$/.exec(line);
    const ulText = ul?.[1];
    if (ulText !== undefined) {
      flushParagraph();
      if (inOl) {
        html.push('</ol>');
        inOl = false;
      }
      if (!inUl) {
        html.push('<ul>');
        inUl = true;
      }
      html.push(`<li>${inline(ulText)}</li>`);
      i += 1;
      continue;
    }

    const ol = /^(\d+)\.\s+(.+)$/.exec(line);
    const olText = ol?.[2];
    if (olText !== undefined) {
      flushParagraph();
      if (inUl) {
        html.push('</ul>');
        inUl = false;
      }
      if (!inOl) {
        html.push('<ol>');
        inOl = true;
      }
      html.push(`<li>${inline(olText)}</li>`);
      i += 1;
      continue;
    }

    if (line.startsWith('|')) {
      flushParagraph();
      flushLists();
      const rows: string[] = [];
      while (i < lines.length && (lines[i] ?? '').startsWith('|')) {
        rows.push(lines[i] ?? '');
        i += 1;
      }
      html.push(renderTable(rows));
      continue;
    }

    flushLists();
    paragraph.push(line);
    i += 1;
  }

  flushParagraph();
  flushLists();
  return html.join('\n');
}

function renderTable(rows: string[]): string {
  const parsed = rows
    .map((row) =>
      row
        .split('|')
        .slice(1, -1)
        .map((cell) => cell.trim()),
    )
    .filter((cells) => cells.length > 0);
  if (parsed.length === 0) {
    return '';
  }
  const header = parsed[0] ?? [];
  const body = parsed
    .slice(1)
    .filter((cells) => !cells.every((cell) => /^:?-+:?$/.test(cell)));
  const head = `<thead><tr>${header.map((cell) => `<th>${inline(cell)}</th>`).join('')}</tr></thead>`;
  const tbody = `<tbody>${body
    .map(
      (cells) =>
        `<tr>${cells.map((cell) => `<td>${inline(cell)}</td>`).join('')}</tr>`,
    )
    .join('')}</tbody>`;
  return `<table>${head}${tbody}</table>`;
}
