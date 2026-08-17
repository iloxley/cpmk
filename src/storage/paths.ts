import path from 'node:path';
import { pathUnsafe } from '../domain/errors.js';

export function displayPath(root: string, target: string): string {
  const relative = path.relative(root, target);
  return relative.split(path.sep).join('/');
}

export function isInsideRoot(root: string, target: string): boolean {
  const relative = path.relative(root, target);
  return (
    relative === '' ||
    (!relative.startsWith('..') && !path.isAbsolute(relative))
  );
}

export function assertInsideRoot(root: string, target: string): void {
  if (!isInsideRoot(root, target)) {
    throw pathUnsafe('path escapes the project root', target);
  }
}

export function memoryDir(root: string): string {
  return path.join(root, '.cpmk', 'memory');
}

export function generatedDir(root: string): string {
  return path.join(root, '.cpmk', 'generated');
}

export function pluginsDir(root: string): string {
  return path.join(root, '.cpmk', 'plugins');
}

export function configPath(root: string): string {
  return path.join(root, '.cpmk', 'config.json');
}

export function cpmkDir(root: string): string {
  return path.join(root, '.cpmk');
}

export function entryPath(root: string, id: string): string {
  return path.join(memoryDir(root), `${id}.json`);
}
