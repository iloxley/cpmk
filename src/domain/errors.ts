export type ErrorCode =
  | 'USAGE'
  | 'PROJECT_NOT_FOUND'
  | 'ALREADY_INITIALIZED'
  | 'VALIDATION'
  | 'UNSUPPORTED_SCHEMA'
  | 'INVALID_JSON'
  | 'PATH_UNSAFE'
  | 'IO'
  | 'INTERNAL';

export class CpmkError extends Error {
  readonly code: ErrorCode;
  readonly exitCode: 1 | 2 | 3;
  readonly path?: string;

  constructor(options: {
    code: ErrorCode;
    message: string;
    exitCode: 1 | 2 | 3;
    path?: string;
    cause?: unknown;
  }) {
    super(options.message, { cause: options.cause });
    this.name = 'CpmkError';
    this.code = options.code;
    this.exitCode = options.exitCode;
    if (options.path !== undefined) {
      this.path = options.path;
    }
  }
}

export function usageError(message: string): CpmkError {
  return new CpmkError({ code: 'USAGE', message, exitCode: 2 });
}

export function projectNotFound(start: string): CpmkError {
  return new CpmkError({
    code: 'PROJECT_NOT_FOUND',
    message: `no CPMK project found from ${start}; run cpmk init first`,
    exitCode: 2,
    path: start,
  });
}

export function alreadyInitialized(cpmkDir: string): CpmkError {
  return new CpmkError({
    code: 'ALREADY_INITIALIZED',
    message: 'a .cpmk directory already exists; refusing to overwrite it',
    exitCode: 1,
    path: cpmkDir,
  });
}

export function validationError(message: string, filePath?: string): CpmkError {
  return new CpmkError({
    code: 'VALIDATION',
    message,
    exitCode: 1,
    ...(filePath === undefined ? {} : { path: filePath }),
  });
}

export function unsupportedSchema(
  version: unknown,
  filePath: string,
): CpmkError {
  return new CpmkError({
    code: 'UNSUPPORTED_SCHEMA',
    message: `unsupported schemaVersion ${String(version)}; this release supports version 1 only. Upgrade CPMK or migrate the file`,
    exitCode: 1,
    path: filePath,
  });
}

export function invalidJson(filePath: string): CpmkError {
  return new CpmkError({
    code: 'INVALID_JSON',
    message: 'file is not valid JSON; repair or remove it',
    exitCode: 1,
    path: filePath,
  });
}

export function pathUnsafe(message: string, filePath?: string): CpmkError {
  return new CpmkError({
    code: 'PATH_UNSAFE',
    message,
    exitCode: 1,
    ...(filePath === undefined ? {} : { path: filePath }),
  });
}

export function ioError(
  message: string,
  filePath?: string,
  cause?: unknown,
): CpmkError {
  return new CpmkError({
    code: 'IO',
    message,
    exitCode: 1,
    ...(filePath === undefined ? {} : { path: filePath }),
    ...(cause === undefined ? {} : { cause }),
  });
}
