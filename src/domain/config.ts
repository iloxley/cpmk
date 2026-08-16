import {
  CONFIG_SCHEMA_URL,
  DEFAULT_CONTEXT_BUDGET,
  DEFAULT_DENY_GLOBS,
  SCHEMA_VERSION,
  type CpmkConfig,
} from './types.js';
import { validationError } from './errors.js';

export function createDefaultConfig(name: string): CpmkConfig {
  return {
    $schema: CONFIG_SCHEMA_URL,
    schemaVersion: SCHEMA_VERSION,
    project: { name },
    context: { defaultBudget: DEFAULT_CONTEXT_BUDGET },
    privacy: { denyGlobs: [...DEFAULT_DENY_GLOBS] },
  };
}

export function assertConfigBounds(
  config: CpmkConfig,
  filePath?: string,
): void {
  if (config.project.name.trim().length === 0) {
    throw validationError('project.name must be a non-empty string', filePath);
  }
  if (
    !Number.isInteger(config.context.defaultBudget) ||
    config.context.defaultBudget < 1
  ) {
    throw validationError(
      'context.defaultBudget must be a positive integer',
      filePath,
    );
  }
}
