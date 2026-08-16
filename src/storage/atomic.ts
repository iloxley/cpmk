import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { ioError } from '../domain/errors.js';
import { nodeFs, type FsOps, type WritableHandle } from './fs-ops.js';

export function serializeJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function replaceFile(
  tmp: string,
  target: string,
  ops: FsOps,
): Promise<void> {
  try {
    await ops.rename(tmp, target);
    return;
  } catch (error) {
    if (process.platform !== 'win32') {
      throw error;
    }
  }

  const backup = `${target}.${randomBytes(4).toString('hex')}.bak`;
  try {
    await ops.rename(target, backup);
  } catch {
    await ops.rename(tmp, target);
    return;
  }

  try {
    await ops.rename(tmp, target);
    await ops.unlink(backup).catch(() => undefined);
  } catch (error) {
    await ops.rename(backup, target).catch(() => undefined);
    throw error;
  }
}

export async function writeAtomicFile(
  targetPath: string,
  contents: string,
  ops: FsOps = nodeFs,
): Promise<void> {
  const directory = path.dirname(targetPath);
  const tmp = path.join(
    directory,
    `.${path.basename(targetPath)}.${randomBytes(8).toString('hex')}.tmp`,
  );
  let handle: WritableHandle | undefined;
  try {
    handle = await ops.open(tmp, 'w');
    await handle.writeFile(contents, 'utf8');
    await handle.sync();
    await handle.close();
    handle = undefined;
    await replaceFile(tmp, targetPath, ops);
  } catch (error) {
    if (handle) {
      await handle.close().catch(() => undefined);
    }
    await ops.unlink(tmp).catch(() => undefined);
    throw ioError('atomic write failed', targetPath, error);
  }
}
