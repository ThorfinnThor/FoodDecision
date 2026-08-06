export function cleanStoredIds(value: unknown) {
  if (!Array.isArray(value)) return [] as string[];
  return [...new Set(value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean))].slice(0, 250);
}

export function mergeStoredIds(current: unknown, additions: unknown) {
  return cleanStoredIds([...cleanStoredIds(current), ...cleanStoredIds(additions)]);
}

export function withoutStoredIds(current: unknown, removals: unknown) {
  const removed = new Set(cleanStoredIds(removals));
  return cleanStoredIds(current).filter((id) => !removed.has(id));
}

export function toggleStoredIds(current: unknown, id: string) {
  const ids = cleanStoredIds(current);
  const selected = !ids.includes(id);
  return {
    ids: selected ? mergeStoredIds(ids, [id]) : withoutStoredIds(ids, [id]),
    selected,
  };
}
