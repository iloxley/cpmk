import { monotonicFactory } from 'ulidx';

export interface IdGenerator {
  next(): string;
}

export function createUlidGenerator(): IdGenerator {
  const next = monotonicFactory();
  return {
    next: () => next(),
  };
}
