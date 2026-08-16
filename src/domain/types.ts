export const SCHEMA_VERSION = 1;

export const ENTRY_TYPES = [
  'fact',
  'decision',
  'convention',
  'task',
  'handoff',
  'warning',
] as const;

export const ENTRY_SOURCES = ['manual', 'import', 'system'] as const;

export const ENTRY_STATUSES = ['active', 'superseded', 'archived'] as const;

export const CONTEXT_TYPE_ORDER = [
  'warning',
  'decision',
  'convention',
  'handoff',
  'task',
  'fact',
] as const;

export type EntryType = (typeof ENTRY_TYPES)[number];
export type EntrySource = (typeof ENTRY_SOURCES)[number];
export type EntryStatus = (typeof ENTRY_STATUSES)[number];

export interface CpmkConfig {
  $schema?: string;
  schemaVersion: typeof SCHEMA_VERSION;
  project: {
    name: string;
  };
  context: {
    defaultBudget: number;
  };
  privacy: {
    denyGlobs: string[];
  };
}

export interface MemoryEntry {
  schemaVersion: typeof SCHEMA_VERSION;
  id: string;
  type: EntryType;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  source: EntrySource;
  status: EntryStatus;
}

export interface Diagnostic {
  severity: 'error' | 'warning';
  code: string;
  path: string;
  message: string;
}

export interface DoctorResult {
  ok: boolean;
  data: {
    root: string;
    entryCount: number;
    diagnosticCount: number;
  };
  diagnostics: Diagnostic[];
}

export const DEFAULT_DENY_GLOBS = [
  '**/.env*',
  '**/*secret*',
  '**/*credential*',
] as const;

export const CONFIG_SCHEMA_URL =
  'https://raw.githubusercontent.com/cpmk/cpmk/main/schemas/config.schema.json';

export const DEFAULT_CONTEXT_BUDGET = 12000;

export const TITLE_MAX_LENGTH = 120;
export const TITLE_DEFAULT_LENGTH = 80;
export const CONTENT_MAX_LENGTH = 20_000;
export const TAG_MAX_COUNT = 20;
export const TAG_PATTERN = /^[a-z0-9][a-z0-9-]{0,39}$/;
export const ID_PATTERN = /^[0-9A-Z]{26}$/;
export const TIMESTAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
