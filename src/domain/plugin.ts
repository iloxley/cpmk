import { validationError } from './errors.js';
import type { Diagnostic } from './types.js';

export const PLUGIN_PERMISSIONS = ['doctor.contribute'] as const;
export type PluginPermission = (typeof PLUGIN_PERMISSIONS)[number];

export interface PluginManifest {
  schemaVersion: 1;
  name: string;
  version: string;
  engines: { cpmk: string };
  permissions: PluginPermission[];
  doctor?: {
    warnings: Array<{ code: string; path: string; message: string }>;
  };
}

const NAME_PATTERN = /^[a-z0-9][a-z0-9-]{0,39}$/u;
const VERSION_PATTERN = /^\d+\.\d+\.\d+$/u;
const ENGINE_PATTERN = /^>=(\d+)\.(\d+)\.(\d+)$/u;

export function parseVersion(value: string): [number, number, number] {
  const match = /^(\d+)\.(\d+)\.(\d+)$/u.exec(value);
  if (match === null) {
    throw validationError('CLI version is not semver');
  }
  return [
    Number.parseInt(match[1] ?? '0', 10),
    Number.parseInt(match[2] ?? '0', 10),
    Number.parseInt(match[3] ?? '0', 10),
  ];
}

export function engineSatisfied(required: string, actual: string): boolean {
  const engine = ENGINE_PATTERN.exec(required);
  if (engine === null) {
    return false;
  }
  const want = [
    Number.parseInt(engine[1] ?? '0', 10),
    Number.parseInt(engine[2] ?? '0', 10),
    Number.parseInt(engine[3] ?? '0', 10),
  ];
  const have = parseVersion(actual);
  for (let index = 0; index < 3; index += 1) {
    const left = have[index] ?? 0;
    const right = want[index] ?? 0;
    if (left > right) {
      return true;
    }
    if (left < right) {
      return false;
    }
  }
  return true;
}

export function parsePluginManifest(
  raw: string,
  directoryName: string,
  filePath: string,
): PluginManifest {
  let value: unknown;
  try {
    value = JSON.parse(raw) as unknown;
  } catch {
    throw validationError('plugin.json is not valid JSON', filePath);
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw validationError('plugin.json must be an object', filePath);
  }
  const record = value as Record<string, unknown>;
  const allowed = new Set([
    'schemaVersion',
    'name',
    'version',
    'engines',
    'permissions',
    'doctor',
  ]);
  for (const key of Object.keys(record)) {
    if (!allowed.has(key)) {
      throw validationError(`unknown plugin property ${key}`, filePath);
    }
  }
  if (record.schemaVersion !== 1) {
    throw validationError('plugin schemaVersion must be 1', filePath);
  }
  if (typeof record.name !== 'string' || !NAME_PATTERN.test(record.name)) {
    throw validationError('plugin name is invalid', filePath);
  }
  if (record.name !== directoryName) {
    throw validationError('plugin name must match its directory', filePath);
  }
  if (
    typeof record.version !== 'string' ||
    !VERSION_PATTERN.test(record.version)
  ) {
    throw validationError('plugin version must be semver', filePath);
  }
  const engines = record.engines;
  if (
    typeof engines !== 'object' ||
    engines === null ||
    typeof (engines as { cpmk?: unknown }).cpmk !== 'string' ||
    !ENGINE_PATTERN.test((engines as { cpmk: string }).cpmk)
  ) {
    throw validationError(
      'plugin engines.cpmk must look like >=0.9.0',
      filePath,
    );
  }
  if (
    !Array.isArray(record.permissions) ||
    record.permissions.some(
      (item) =>
        typeof item !== 'string' ||
        !(PLUGIN_PERMISSIONS as readonly string[]).includes(item),
    )
  ) {
    throw validationError('plugin permissions are invalid', filePath);
  }
  let doctor: PluginManifest['doctor'];
  if (record.doctor !== undefined) {
    const block = record.doctor as { warnings?: unknown };
    if (
      typeof record.doctor !== 'object' ||
      record.doctor === null ||
      !Array.isArray(block.warnings)
    ) {
      throw validationError(
        'plugin doctor.warnings must be an array',
        filePath,
      );
    }
    const warnings = block.warnings.map((item) => {
      const warning = item as {
        code?: unknown;
        path?: unknown;
        message?: unknown;
      };
      if (
        typeof warning.code !== 'string' ||
        typeof warning.path !== 'string' ||
        typeof warning.message !== 'string'
      ) {
        throw validationError('plugin doctor warning is invalid', filePath);
      }
      return {
        code: warning.code,
        path: warning.path,
        message: warning.message,
      };
    });
    doctor = { warnings };
  }
  return {
    schemaVersion: 1,
    name: record.name,
    version: record.version,
    engines: { cpmk: (engines as { cpmk: string }).cpmk },
    permissions: record.permissions as PluginPermission[],
    ...(doctor === undefined ? {} : { doctor }),
  };
}

export function pluginDoctorDiagnostics(
  manifest: PluginManifest,
  cliVersion: string,
): Diagnostic[] {
  if (!engineSatisfied(manifest.engines.cpmk, cliVersion)) {
    return [];
  }
  if (!manifest.permissions.includes('doctor.contribute')) {
    return [];
  }
  return (manifest.doctor?.warnings ?? []).map((warning) => ({
    severity: 'warning' as const,
    code: warning.code,
    path: warning.path,
    message: warning.message,
  }));
}
