export const scrollId = spell => `teszt-mondoka-${spell.id}`;

export function ownsScroll(equipment, spell) {
  const id = scrollId(spell);
  const items = equipment?.items;
  return Array.isArray(items) ? items.some(item => item.catalogId === id && Number(item.quantity) > 0)
    : Number(items?.[id]) > 0;
}
