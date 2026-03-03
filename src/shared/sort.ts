export function sortByLabel<T>(options: readonly T[], getLabel: (option: T) => string): T[] {
  return [...options].sort((a, b) => getLabel(a).localeCompare(getLabel(b), undefined, { sensitivity: "base" }));
}
