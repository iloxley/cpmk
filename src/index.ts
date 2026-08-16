export { buildContext } from './application/context.js';
export { diagnoseProject } from './application/doctor.js';
export { initProject } from './application/init.js';
export { listMemory } from './application/list.js';
export { rememberEntry } from './application/remember.js';
export { CpmkError } from './domain/errors.js';
export { renderContext } from './domain/render.js';
export { selectEntries } from './domain/selection.js';
export { discoverRoot } from './storage/root.js';
export type {
  CpmkConfig,
  Diagnostic,
  DoctorResult,
  MemoryEntry,
} from './domain/types.js';
