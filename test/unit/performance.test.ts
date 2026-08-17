import { describe, expect, it } from 'vitest';
import { buildContext } from '../../src/application/context.js';
import { initProject } from '../../src/application/init.js';
import { listMemory } from '../../src/application/list.js';
import { rememberEntry } from '../../src/application/remember.js';
import { fixedClock, withTempDir } from '../helpers/temp.js';

function sequentialIds(start = 0) {
  let next = start;
  return {
    next(): string {
      const suffix = next.toString(10).padStart(16, '0');
      next += 1;
      return `01JEXAMPLE${suffix}`;
    },
  };
}

describe('performance regression', () => {
  it('lists and renders 100 entries within a CI-safe budget', async () => {
    await withTempDir(async (directory) => {
      await initProject({ root: directory, name: 'perf' });
      const ids = sequentialIds();
      const clock = fixedClock();
      for (let index = 0; index < 100; index += 1) {
        await rememberEntry({
          projectRoot: directory,
          content: `Entry number ${index} for the performance net`,
          clock,
          ids,
        });
      }
      const started = Date.now();
      const listed = await listMemory({ projectRoot: directory });
      await buildContext({ projectRoot: directory, budget: 20_000 });
      const elapsed = Date.now() - started;
      expect(listed).toHaveLength(100);
      expect(elapsed).toBeLessThan(5000);
    });
  }, 30_000);
});
