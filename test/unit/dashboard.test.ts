import { request as httpRequest } from 'node:http';
import { describe, expect, it } from 'vitest';
import { startDashboard } from '../../src/application/dashboard.js';
import { initProject } from '../../src/application/init.js';
import { rememberEntry } from '../../src/application/remember.js';
import { fixedClock, fixedIds, withTempDir } from '../helpers/temp.js';

async function json(
  url: string,
  init?: RequestInit,
): Promise<{ status: number; body: unknown }> {
  const response = await fetch(url, init);
  return { status: response.status, body: await response.json() };
}

describe('startDashboard', () => {
  it('serves loopback reads and token-protected mutations', async () => {
    await withTempDir(async (directory) => {
      await initProject({ root: directory, name: 'dash' });
      const created = await rememberEntry({
        projectRoot: directory,
        content: 'existing fact',
        clock: fixedClock(),
        ids: fixedIds(),
      });
      const server = await startDashboard({
        projectRoot: directory,
        port: 0,
        token: 'test-token',
      });
      try {
        const page = await fetch(server.url);
        expect(page.status).toBe(200);
        expect(await page.text()).toContain('CPMK dashboard');

        const health = await json(`${server.url}api/health`);
        expect(health).toEqual({ status: 200, body: { ok: true } });

        const listed = await json(`${server.url}api/entries?status=active`);
        expect(listed.status).toBe(200);
        expect(listed.body).toMatchObject({ ok: true });

        const session = await json(`${server.url}api/session`);
        expect(session.body).toMatchObject({
          ok: true,
          data: { open: false, id: null },
        });

        const forbidden = await json(`${server.url}api/remember`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ content: 'no token' }),
        });
        expect(forbidden.status).toBe(403);

        const remembered = await json(`${server.url}api/remember`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'X-CPMK-Token': 'test-token',
          },
          body: JSON.stringify({
            content: 'from the dashboard',
            type: 'task',
            tags: ['ui'],
          }),
        });
        expect(remembered.status).toBe(200);
        const rememberedId = (remembered.body as { data: { id: string } }).data
          .id;

        const archived = await json(`${server.url}api/archive`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'X-CPMK-Token': 'test-token',
          },
          body: JSON.stringify({ id: created.id }),
        });
        expect(archived.status).toBe(200);

        const badHost = await new Promise<number>((resolve, reject) => {
          const req = httpRequest(
            {
              host: '127.0.0.1',
              port: server.port,
              path: '/api/health',
              headers: { Host: 'example.com' },
            },
            (response) => {
              response.resume();
              resolve(response.statusCode ?? 0);
            },
          );
          req.on('error', reject);
          req.end();
        });
        expect(badHost).toBe(403);

        const badJson = await json(`${server.url}api/remember`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'X-CPMK-Token': 'test-token',
          },
          body: '{',
        });
        expect(badJson.status).toBe(400);

        const missingContent = await json(`${server.url}api/remember`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'X-CPMK-Token': 'test-token',
          },
          body: JSON.stringify({}),
        });
        expect(missingContent.status).toBe(400);

        const missingId = await json(`${server.url}api/archive`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'X-CPMK-Token': 'test-token',
          },
          body: JSON.stringify({}),
        });
        expect(missingId.status).toBe(400);

        const invalidType = await json(`${server.url}api/entries?type=note`);
        expect(invalidType.status).toBe(400);

        const missing = await fetch(`${server.url}nope`);
        expect(missing.status).toBe(404);

        const huge = await json(`${server.url}api/archive`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'X-CPMK-Token': 'test-token',
          },
          body: JSON.stringify({ id: 'x'.repeat(40_000) }),
        });
        expect(huge.status).toBe(413);

        expect(rememberedId).toMatch(/^[0-9A-Z]{26}$/);
      } finally {
        await server.close();
      }
    });
  });
});
