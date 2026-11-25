const breedingRules = {
  Elf: {
    Ember: "T",
    Gilf: "T",
    Gnóm: "M",
    Manó: "T",
    Ogár: "N",
    Ork: "M",
    Törpe: "M",
  },
  Ember: {
    Gilf: "M",
    Gnóm: "T",
    Manó: "T",
    Ogár: "M",
    Ork: "T",
    Törpe: "M",
  },
  Gilf: {
    Gnóm: "N",
    Manó: "T",
    Ogár: "N",
    Ork: "M",
    Törpe: "N",
  },
  Gnóm: {
    Manó: "T",
    Ogár: "M",
    Ork: "T",
    Törpe: "M",
  },
  Manó: {
    Ogár: "T",
    Ork: "T",
    Törpe: "T",
  },
  Ogár: {
    Ork: "T",
    Törpe: "N",
  },
  Ork: {
    Törpe: "N",
  },
};

export function getBreedingStatus(race1, race2) {
  if (race1 === race2) return "T";

  return (
    breedingRules[race1]?.[race2] ??
    breedingRules[race2]?.[race1] ??
    "N"
  );
}

export const fixedParentRace = {
  "Félvér elf": "Elf",
  "Félvér gilf": "Gilf",
  "Félvér ogár": "Ogár",
  "Félvér ork": "Ork",
};

export function creationGenderOptions(race) {
  if (race === "Gilf") return ["Nő"];
  if (race === "Gennymanó") return [];
  return ["Férfi", "Nő"];
}

export function ancestryValidation(ancestry) {
  const [first, second] = ancestry.parents ?? [];
  const fixed = fixedParentRace[ancestry.race];
  if (fixed && first?.race !== fixed) return { error: `Az első szülő faja ${fixed}.` };
  const pairs = [[first, second], first?.parents ?? [], second?.parents ?? []];
  let magical = false;
  for (const [a, b] of pairs) {
    if (!a?.race || !b?.race) continue;
    const status = getBreedingStatus(a.race, b.race);
    if (status === "N") return { error: `Tiltott származási pár: ${a.race} és ${b.race}.` };
    magical ||= status === "M";
  }
  const parentLine = (parent) => parent?.parents?.some((ancestor) => ancestor?.race)
    ? parent.parents.filter((ancestor) => ancestor?.race) : parent?.race ? [parent] : [];
  if (first?.parents?.length || second?.parents?.length) {
    for (const a of parentLine(first)) {
      for (const b of parentLine(second)) {
        const status = getBreedingStatus(a.race, b.race);
        if (status === "N") return { error: `Tiltott vérvonalpár: ${a.race} és ${b.race}.` };
        magical ||= status === "M";
      }
    }
  }
  return { magical };
}
