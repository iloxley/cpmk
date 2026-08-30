import { describe, expect, it } from 'vitest';
import {
  escapeHtml,
  isSafeHref,
  loadPackagedDoc,
  packagedDocPath,
  renderMarkdownDocument,
} from '../../src/application/guide-html.js';

describe('renderMarkdownDocument', () => {
  it('renders headings, fences, lists, tables, and safe links', () => {
    const html = renderMarkdownDocument(`# Title

Intro **bold** and \`code\`.

- item one
- item two

1. first
2. second

\`\`\`
cpmk list
\`\`\`

[guide](USER_GUIDE.md)
[safe](https://example.com/docs)
[bad](javascript:alert(1))

| Path | Commit? |
| --- | --- |
| \`.cpmk/memory\` | Yes |

---
`);
    expect(html).toContain('<h1>Title</h1>');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<code>code</code>');
    expect(html).toContain('<ul>');
    expect(html).toContain('<ol>');
    expect(html).toContain('<pre><code>cpmk list</code></pre>');
    expect(html).toContain('<a href="USER_GUIDE.md">guide</a>');
    expect(html).toContain('<a href="https://example.com/docs">safe</a>');
    expect(html).toContain('bad');
    expect(html).not.toContain('javascript:alert');
    expect(html).toContain('<th>');
    expect(html).toContain('<td>');
    expect(html).toContain('<hr>');
  });

  it('escapes HTML in authored text', () => {
    expect(renderMarkdownDocument('Use <script>alert(1)</script>')).toContain(
      '&lt;script&gt;',
    );
    expect(escapeHtml('a&b')).toBe('a&amp;b');
  });

  it('rejects unsafe hrefs', () => {
    expect(isSafeHref('javascript:alert(1)')).toBe(false);
    expect(isSafeHref('https://ok.example')).toBe(true);
    expect(isSafeHref('#section')).toBe(true);
    expect(isSafeHref('../README.md')).toBe(true);
    expect(isSafeHref('not a link')).toBe(false);
  });

  it('loads packaged operator docs', async () => {
    await expect(loadPackagedDoc('guide')).resolves.toContain(
      '# CPMK user guide',
    );
    await expect(loadPackagedDoc('demo')).resolves.toContain(
      '# CPMK demo walkthroughs',
    );
    expect(packagedDocPath('guide')).toContain('USER_GUIDE.md');
  });
});
