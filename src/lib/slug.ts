export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 200) || `item-${Date.now()}`;
}

export function ensureUniqueSlug(
  base: string,
  exists: (slug: string) => Promise<boolean>,
): Promise<string> {
  return (async () => {
    let candidate = base;
    let i = 2;
    while (await exists(candidate)) {
      candidate = `${base}-${i}`;
      i += 1;
    }
    return candidate;
  })();
}
