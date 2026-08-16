import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import AjvModule from 'ajv';
import type { ErrorObject, ValidateFunction } from 'ajv';
import { assertConfigBounds } from './config.js';
import { assertEntryFieldBounds } from './entry.js';
import { invalidJson, unsupportedSchema, validationError } from './errors.js';
import { SCHEMA_VERSION, type CpmkConfig, type MemoryEntry } from './types.js';

type AjvConstructor = new (options: {
  allErrors: boolean;
  strict: boolean;
  useDefaults: boolean;
  coerceTypes: boolean;
}) => { compile(schema: object): ValidateFunction };

const Ajv = AjvModule as unknown as AjvConstructor;

const ajv = new Ajv({
  allErrors: true,
  strict: true,
  useDefaults: false,
  coerceTypes: false,
});

const schemaDir = fileURLToPath(new URL('../../schemas/', import.meta.url));

function loadSchema(name: string): object {
  const raw: unknown = JSON.parse(
    readFileSync(path.join(schemaDir, name), 'utf8'),
  );
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new Error(`schema ${name} must be an object`);
  }
  return raw;
}

const validateConfigSchema = ajv.compile(loadSchema('config.schema.json'));
const validateEntrySchema = ajv.compile(loadSchema('memory-entry.schema.json'));

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function formatAjvErrors(errors: ErrorObject[] | null | undefined): string {
  if (!errors || errors.length === 0) {
    return 'does not match the schema';
  }
  return errors
    .map((error) => {
      const at = error.instancePath === '' ? '/' : error.instancePath;
      return `${at}: ${error.message ?? 'invalid'}`;
    })
    .join('; ');
}

function assertSchemaVersion(value: unknown, filePath: string): void {
  if (!isRecord(value) || !('schemaVersion' in value)) {
    throw validationError('missing schemaVersion', filePath);
  }
  if (value.schemaVersion !== SCHEMA_VERSION) {
    throw unsupportedSchema(value.schemaVersion, filePath);
  }
}

function parseJson(raw: string, filePath: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    throw invalidJson(filePath);
  }
}

function assertMatches(
  validate: ValidateFunction,
  value: unknown,
  filePath: string,
  label: string,
): void {
  if (!validate(value)) {
    throw validationError(
      `${label} is invalid: ${formatAjvErrors(validate.errors)}`,
      filePath,
    );
  }
}

export function parseConfig(raw: string, filePath: string): CpmkConfig {
  const value = parseJson(raw, filePath);
  assertSchemaVersion(value, filePath);
  assertMatches(validateConfigSchema, value, filePath, 'config');
  const config = value as CpmkConfig;
  assertConfigBounds(config, filePath);
  return config;
}

export function parseEntry(raw: string, filePath: string): MemoryEntry {
  const value = parseJson(raw, filePath);
  assertSchemaVersion(value, filePath);
  assertMatches(validateEntrySchema, value, filePath, 'memory entry');
  const entry = value as MemoryEntry;
  assertEntryFieldBounds(entry, filePath);
  return entry;
}

export function validateConfigValue(
  value: unknown,
  filePath = '<config>',
): CpmkConfig {
  assertSchemaVersion(value, filePath);
  assertMatches(validateConfigSchema, value, filePath, 'config');
  const config = value as CpmkConfig;
  assertConfigBounds(config, filePath);
  return config;
}

export function validateEntryValue(
  value: unknown,
  filePath = '<entry>',
): MemoryEntry {
  assertSchemaVersion(value, filePath);
  assertMatches(validateEntrySchema, value, filePath, 'memory entry');
  const entry = value as MemoryEntry;
  assertEntryFieldBounds(entry, filePath);
  return entry;
}
