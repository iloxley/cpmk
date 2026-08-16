export function unicodeLength(value: string): number {
  return Array.from(value).length;
}

export function truncateUnicode(value: string, max: number): string {
  return Array.from(value).slice(0, max).join('');
}
