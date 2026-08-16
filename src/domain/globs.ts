import path from 'node:path';

export function globToRegExp(glob: string): RegExp {
  let pattern = '';
  for (let index = 0; index < glob.length; index += 1) {
    const char = glob[index];
    const next = glob[index + 1];
    if (char === '*' && next === '*') {
      pattern += '.*';
      index += 1;
      if (glob[index + 1] === '/') {
        pattern += '/?';
        index += 1;
      }
      continue;
    }
    if (char === '*') {
      pattern += '[^/]*';
      continue;
    }
    if (char === '?') {
      pattern += '[^/]';
      continue;
    }
    if (char !== undefined && /[.+^${}()|[\]\\]/u.test(char)) {
      pattern += `\\${char}`;
      continue;
    }
    pattern += char ?? '';
  }
  return new RegExp(`^${pattern}$`, 'u');
}

export function pathMatchesDenyGlob(target: string, glob: string): boolean {
  const normalized = target.split(path.sep).join('/');
  const base = path.posix.basename(normalized);
  const matcher = globToRegExp(glob);
  return (
    matcher.test(normalized) || matcher.test(base) || matcher.test(`/${base}`)
  );
}

export function pathDeniedByGlobs(
  target: string,
  globs: readonly string[],
): string | undefined {
  return globs.find((glob) => pathMatchesDenyGlob(target, glob));
}
