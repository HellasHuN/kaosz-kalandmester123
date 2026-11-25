export function segmentEntries(entries, mode) {
  return entries.filter(entry => mode === "km" || entry.visible)
    .slice().sort((first, second) => first.segment - second.segment);
}

export function addSegment(entries, { id, name, segment, visible }) {
  if (!name.trim() || !Number.isSafeInteger(segment) || segment < 1 || entries.some(entry => entry.id === id)) return entries;
  return [...entries, { id, name: name.trim(), segment, visible: visible === true }];
}

export function segmentGroups(entries) {
  return Map.groupBy(entries, entry => entry.segment);
}
