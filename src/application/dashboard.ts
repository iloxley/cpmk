import { randomBytes } from 'node:crypto';
import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from 'node:http';
import { CpmkError } from '../domain/errors.js';
import { archiveEntry } from './archive.js';
import { listMemory } from './list.js';
import { rememberEntry } from './remember.js';
import { sessionStatus } from './session.js';

export const DASHBOARD_DEFAULT_PORT = 7435;
const MAX_BODY_BYTES = 32 * 1024;

export interface DashboardServer {
  url: string;
  port: number;
  token: string;
  close(): Promise<void>;
}

function isLoopbackHost(hostHeader: string | undefined): boolean {
  if (hostHeader === undefined) {
    return false;
  }
  const host = hostHeader.toLowerCase();
  return (
    host === '127.0.0.1' ||
    host === 'localhost' ||
    host.startsWith('127.0.0.1:') ||
    host.startsWith('localhost:')
  );
}

function sendJson(
  response: ServerResponse,
  status: number,
  body: unknown,
): void {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
  });
  response.end(`${JSON.stringify(body)}\n`);
}

function sendAppError(
  response: ServerResponse,
  requestPath: string,
  error: unknown,
): void {
  if (error instanceof CpmkError) {
    sendJson(response, 400, {
      ok: false,
      data: null,
      diagnostics: [
        {
          severity: 'error',
          code: error.code,
          path: error.path ?? requestPath,
          message: error.message,
        },
      ],
    });
    return;
  }
  sendJson(response, 500, {
    ok: false,
    data: null,
    diagnostics: [
      {
        severity: 'error',
        code: 'INTERNAL',
        path: requestPath,
        message: 'dashboard handler failed',
      },
    ],
  });
}

function sendText(
  response: ServerResponse,
  status: number,
  body: string,
  contentType: string,
): void {
  response.writeHead(status, { 'content-type': contentType });
  response.end(body);
}

async function readBody(request: IncomingMessage): Promise<string> {
  let body = '';
  for await (const chunk of request) {
    const piece =
      typeof chunk === 'string'
        ? chunk
        : Buffer.from(chunk as Uint8Array).toString('utf8');
    body += piece;
    if (Buffer.byteLength(body) > MAX_BODY_BYTES) {
      throw new Error('payload too large');
    }
  }
  return body;
}

function renderPage(token: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>CPMK dashboard</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 1.5rem; line-height: 1.4; }
    main { max-width: 52rem; }
    label { display: block; margin: 0.5rem 0 0.25rem; }
    input, select, textarea, button { font: inherit; }
    textarea { width: 100%; min-height: 5rem; }
    table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
    th, td { text-align: left; vertical-align: top; padding: 0.4rem 0.5rem 0.4rem 0; border-bottom: 1px solid #ccc; }
    .status { margin: 0.75rem 0; }
  </style>
</head>
<body>
  <main>
    <h1>CPMK dashboard</h1>
    <p class="status" id="session">Loading session…</p>
    <form id="filters" aria-label="Filter memories">
      <label for="type">Type</label>
      <input id="type" name="type" autocomplete="off">
      <label for="tag">Tag</label>
      <input id="tag" name="tag" autocomplete="off">
      <label for="status">Status</label>
      <input id="status" name="status" value="active" autocomplete="off">
      <button type="submit">Filter</button>
    </form>
    <form id="remember" aria-label="Remember an entry">
      <label for="content">Content</label>
      <textarea id="content" name="content" required></textarea>
      <label for="remember-type">Type</label>
      <input id="remember-type" name="remember-type" value="fact">
      <button type="submit">Remember</button>
    </form>
    <table>
      <caption>Memory entries</caption>
      <thead><tr><th>ID</th><th>Type</th><th>Title</th><th></th></tr></thead>
      <tbody id="rows"></tbody>
    </table>
  </main>
  <script>
    const token = ${JSON.stringify(token)};
    async function api(path, options = {}) {
      const headers = Object.assign({ 'X-CPMK-Token': token }, options.headers || {});
      const response = await fetch(path, Object.assign({}, options, { headers }));
      return response.json();
    }
    async function refresh() {
      const filters = new FormData(document.getElementById('filters'));
      const query = new URLSearchParams();
      for (const [key, value] of filters.entries()) {
        if (String(value).trim()) query.set(key, String(value).trim());
      }
      const session = await api('/api/session');
      const sessionEl = document.getElementById('session');
      sessionEl.textContent = session.data && session.data.open
        ? 'Open session: ' + session.data.id
        : 'session: none';
      const listed = await api('/api/entries?' + query.toString());
      const rows = document.getElementById('rows');
      rows.replaceChildren();
      for (const entry of listed.data || []) {
        const tr = document.createElement('tr');
        for (const value of [entry.id, entry.type, entry.title]) {
          const td = document.createElement('td');
          td.textContent = value;
          tr.appendChild(td);
        }
        const action = document.createElement('td');
        if (entry.status === 'active') {
          const button = document.createElement('button');
          button.type = 'button';
          button.textContent = 'Archive';
          button.addEventListener('click', async () => {
            await api('/api/archive', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ id: entry.id }),
            });
            await refresh();
          });
          action.appendChild(button);
        }
        tr.appendChild(action);
        rows.appendChild(tr);
      }
    }
    document.getElementById('filters').addEventListener('submit', (event) => {
      event.preventDefault();
      refresh();
    });
    document.getElementById('remember').addEventListener('submit', async (event) => {
      event.preventDefault();
      const content = document.getElementById('content').value;
      const type = document.getElementById('remember-type').value;
      await api('/api/remember', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ content, type }),
      });
      document.getElementById('content').value = '';
      await refresh();
    });
    refresh();
  </script>
</body>
</html>
`;
}

export async function handleDashboardRequest(options: {
  projectRoot: string;
  token: string;
  request: IncomingMessage;
  response: ServerResponse;
}): Promise<void> {
  const { request, response, token, projectRoot } = options;
  if (!isLoopbackHost(request.headers.host)) {
    sendText(response, 403, 'forbidden host\n', 'text/plain; charset=utf-8');
    return;
  }

  const url = new URL(request.url ?? '/', 'http://127.0.0.1');
  if (request.method === 'GET' && url.pathname === '/') {
    sendText(response, 200, renderPage(token), 'text/html; charset=utf-8');
    return;
  }
  if (request.method === 'GET' && url.pathname === '/api/health') {
    sendJson(response, 200, { ok: true });
    return;
  }
  if (request.method === 'GET' && url.pathname === '/api/entries') {
    const type = url.searchParams.get('type') ?? undefined;
    const tag = url.searchParams.get('tag') ?? undefined;
    const status = url.searchParams.get('status') ?? undefined;
    try {
      const entries = await listMemory({
        projectRoot,
        ...(type === undefined || type.length === 0 ? {} : { type }),
        ...(tag === undefined || tag.length === 0 ? {} : { tag }),
        ...(status === undefined || status.length === 0 ? {} : { status }),
      });
      sendJson(response, 200, { ok: true, data: entries, diagnostics: [] });
    } catch (error) {
      sendAppError(response, url.pathname, error);
    }
    return;
  }
  if (request.method === 'GET' && url.pathname === '/api/session') {
    const data = await sessionStatus({ projectRoot });
    sendJson(response, 200, { ok: true, data, diagnostics: [] });
    return;
  }

  if (request.method === 'POST') {
    if (request.headers['x-cpmk-token'] !== token) {
      sendJson(response, 403, {
        ok: false,
        data: null,
        diagnostics: [
          {
            severity: 'error',
            code: 'FORBIDDEN',
            path: url.pathname,
            message: 'missing or invalid dashboard token',
          },
        ],
      });
      return;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(await readBody(request)) as unknown;
    } catch (error) {
      const tooLarge =
        error instanceof Error && error.message === 'payload too large';
      sendJson(response, tooLarge ? 413 : 400, {
        ok: false,
        data: null,
        diagnostics: [
          {
            severity: 'error',
            code: tooLarge ? 'PAYLOAD' : 'INVALID_JSON',
            path: url.pathname,
            message: tooLarge
              ? 'request body exceeds 32 KiB'
              : 'request body must be JSON',
          },
        ],
      });
      return;
    }
    if (url.pathname === '/api/remember') {
      const body = parsed as {
        content?: unknown;
        title?: unknown;
        type?: unknown;
        tags?: unknown;
      };
      if (typeof body.content !== 'string') {
        sendJson(response, 400, {
          ok: false,
          data: null,
          diagnostics: [
            {
              severity: 'error',
              code: 'VALIDATION',
              path: url.pathname,
              message: 'content must be a string',
            },
          ],
        });
        return;
      }
      try {
        const entry = await rememberEntry({
          projectRoot,
          content: body.content,
          ...(typeof body.title === 'string' ? { title: body.title } : {}),
          ...(typeof body.type === 'string' ? { type: body.type } : {}),
          ...(Array.isArray(body.tags)
            ? { tags: body.tags.filter((tag) => typeof tag === 'string') }
            : {}),
        });
        sendJson(response, 200, { ok: true, data: entry, diagnostics: [] });
      } catch (error) {
        sendAppError(response, url.pathname, error);
      }
      return;
    }
    if (url.pathname === '/api/archive') {
      const id = (parsed as { id?: unknown }).id;
      if (typeof id !== 'string') {
        sendJson(response, 400, {
          ok: false,
          data: null,
          diagnostics: [
            {
              severity: 'error',
              code: 'VALIDATION',
              path: url.pathname,
              message: 'id must be a string',
            },
          ],
        });
        return;
      }
      try {
        const entry = await archiveEntry({ projectRoot, id });
        sendJson(response, 200, { ok: true, data: entry, diagnostics: [] });
      } catch (error) {
        sendAppError(response, url.pathname, error);
      }
      return;
    }
  }

  sendText(response, 404, 'not found\n', 'text/plain; charset=utf-8');
}

export async function startDashboard(options: {
  projectRoot: string;
  port?: number;
  token?: string;
}): Promise<DashboardServer> {
  const token = options.token ?? randomBytes(16).toString('hex');
  const port = options.port ?? DASHBOARD_DEFAULT_PORT;
  const server: Server = createServer((request, response) => {
    void handleDashboardRequest({
      projectRoot: options.projectRoot,
      token,
      request,
      response,
    }).catch(() => {
      if (!response.headersSent) {
        sendJson(response, 500, {
          ok: false,
          data: null,
          diagnostics: [
            {
              severity: 'error',
              code: 'INTERNAL',
              path: request.url ?? '/',
              message: 'dashboard handler failed',
            },
          ],
        });
      }
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      resolve();
    });
  });

  const address = server.address();
  const actualPort =
    typeof address === 'object' && address !== null ? address.port : port;
  return {
    url: `http://127.0.0.1:${actualPort}/`,
    port: actualPort,
    token,
    close: async () => {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    },
  };
}
