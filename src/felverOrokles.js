import { ancestryValidation, fixedParentRace } from "./szarmazas.js";

const traits = {
  Elf: [
    { id: "elf-night", name: "Elf éjjellátás", page: 37, effect: "A látótávolságot és a fényviszonyokat a Mesélő rögzíti." },
    { id: "elf-hearing", name: "Elf hallás és látás", page: 37, effect: "A próba és az örökölt hatás mértéke Mesélői döntés." },
  ],
  Ork: [
    { id: "ork-archery", name: "Ork íjászati felár", page: 25, effect: "+5% az Íjászat induló Jp-költségére.", skills: ["Íjászat"], modifier: 5 },
    { id: "ork-night", name: "Ork hő- és éjjellátás", page: 25, effect: "A látási feltételeket a Mesélő állapítja meg." },
  ],
  Gnóm: [
    { id: "gnome-melee", name: "Gnóm közelharci felár", page: 49, effect: "+5% a Cselezés és Lefegyverzés induló Jp-költségére.", skills: ["Cselezés", "Lefegyverzés"], modifier: 5 },
  ],
  Manó: [
    { id: "goblin-resistance", name: "Manó méreg- és betegség-ellenállás", page: 31, effect: "Az érintett próbák módosítását a Mesélő adja meg." },
  ],
  Törpe: [
    { id: "dwarf-night", name: "Törpe éjjellátás", page: 47, effect: "A hatótávot és a fényfeltételeket a Mesélő rögzíti." },
  ],
};

// 53. oldal: a tulajdonságot maga a tisztavérű szülő hordozza.
// Az ismert nagyszülők a szülő tisztavérűségét ellenőrzik.
export function inheritanceOptions(ancestry) {
  if (!ancestry || !(Object.hasOwn(fixedParentRace, ancestry.race) || ancestry.race === "Szürkemanó")) return [];
  const lineage = ancestryValidation(ancestry);
  if (lineage.error || (lineage.magical && !ancestry.magicApproved)) return [];
  const parents = ancestry.parents ?? [];
  const signature = JSON.stringify(parents.map((parent) =>
    [parent?.race, (parent?.parents ?? []).map((ancestor) => ancestor?.race ?? "")]));
  return parents.flatMap((parent, index) => {
    const grandparents = (parent?.parents ?? []).filter((ancestor) => ancestor?.race);
    if (!parent?.race || grandparents.some((ancestor) => ancestor.race !== parent.race)) return [];
    return (traits[parent.race] ?? []).map((trait) => ({
      ...trait, key: `${index}:${trait.id}`, signature,
      source: `${index + 1}. szülő · ${parent.race}`,
    }));
  });
}

export function currentInheritance(ancestry, records = {}) {
  return Object.fromEntries(inheritanceOptions(ancestry)
    .filter(({ key, signature }) => records[key]?.signature === signature)
    .map(({ key }) => [key, records[key]]));
}

export function inheritedModifier(character, skill) {
  const approved = inheritanceOptions(character.ancestry)
    .filter(({ key, signature, skills }) =>
      skills?.includes(skill) && character.inheritedTraits?.[key]?.signature === signature &&
      character.inheritedTraits[key].approved === true);
  return Math.max(0, ...approved.map(({ modifier }) => modifier));
}
