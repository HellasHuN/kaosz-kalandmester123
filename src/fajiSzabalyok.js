export const subraces = {
  Elf: ["Erdei elf", "Bérci könnyűléptű"],
  Ork: ["Hegyi ork", "Üregi (dombi) ork", "Mocsári ork"],
  Manó: ["Barlangi manó", "Vízimanó"],
  Tündérke: ["Tündérke", "Tündérmanó"],
  Gnóm: ["Átlagos gnóm", "Fekete gnóm", "Városi gnóm"],
  Gyíklény: ["Tecath", "Scyss"],
};

// Az értékek főértékpontok, nem jártasságpontok (alapkönyv, 21. o.).
export const racialAbilities = {
  Ork: [["Erőállat-átváltozás", 20, "25", "", "Az erőállatot és az átváltozás mértékét a Mesélő határozza meg."]],
  Ogár: [
    ["Agyarak és karmok", 10, "28"], ["Békanyelv", 15, "28"], ["Faroknyúlvány", 20, "28"],
    ["Két fej", 35, "28"], ["Kitinbőr", 25, "28", "bőr", "A természetes védelem 5-ös; a harci feloldás külön kezelendő."],
    ["Mérges fekélyek", 15, "28", "bőr"], ["Ragacsos bőr", 20, "29", "bőr"],
    ["Rossz szag", 5, "29"], ["Savas nyál", 15, "29"], ["Spóraérintés", 5, "29"],
    ["Vándorszem", 10, "29"], ["Veremszáj", 20, "29"], ["Zsákgyomor", 10, "29"],
  ],
  Manó: [
    ["Kiemelkedő méreg- és betegség-ellenállás", 10, "31", "ellenállás", "Az érintett Szívósság-próbán +30; az alapérték változatlan."],
    ["Teljes méreg- és betegségimmunitás", 20, "31", "ellenállás"],
    ["Méreg érzékelése", 5, "31", "", "Teljes immunitás mellett választható."],
  ],
  Gennymanó: [["Természetes mágiaérzékelés", 20, "34"], ["Mágikus tolvajlás", 30, "34"]],
  Elf: [["A Fa Ereje", 15, "37"]],
  Gilf: [
    ["Regeneráció", 20, "40", "regeneráció", "A sérülések gyógyulását érinti."],
    ["Regeneráció és visszatérés a halálból", 30, "40", "regeneráció"],
  ],
  Tündérke: [
    ...["Torz Tükör", "Csillámfény", "Idézés", "Tündérkincs", "Titokzatos Hang", "Szivárvány"].map((name) => [name, 5, "42–43", "trükk"]),
    ...["Szüzet Hívó", "Torz Test", "Illanó Köd", "Megvadult Föld", "Hamis Gyümölcsök", "Rothadó Gyümölcsök",
      "Tiszta Víz", "Rovarsereg"].map((name) => [name, 15, "43–44", "mágia"]),
    ...["Beolvadás", "Megtorpanó Idő", "Zöld Akarat", "Óvó Liget"].map((name) => [name, 30, "44"]),
    ["Valóra Vált Vágy", 50, "44", "", "A hatást a Mesélő határozza meg."],
  ],
  Törpe: [["Csodamesterség", 20, "46–47"]],
  Gnóm: [["Hatodik érzék", 20, "48"], ["Jóslás", 20, "48"]],
  Ember: [["Ember-mhyori", 25, "50", "", "A gázzá alakulás és az esszenciafogyasztás játék közbeni hatás."]],
  Gyíklény: [["A Kő Éneke", 20, "52–53"]],
};

export const racialRuleNotes = {
  Ork: "Az éjszakai látás, az erőállat és a lykantrópia hatásai az aktuális helyzettől függenek (24–25. o. és errata).",
  Ogár: "A torzulások harci hatásai, a többletvégtagok és az egyedi torzulások külön feloldást igényelnek (27–29. o.).",
  Manó: "A méreg- és betegségpróba módosítása csak az érintett próbán érvényesül (31. o.).",
  Gennymanó: "A mágikus lopás próbához, esszenciához és szabad erszényhez kötött (33–34. o.).",
  Elf: "Az erdei elf Művészetét választott műfajhoz kell kötni. A Fa Ereje és a fémérzékenység hatása helyzetfüggő (37. o.).",
  Gilf: "A regeneráció és a halálból visszatérés a sérülés és az állapot függvénye (39–40. o.).",
  Tündérke: "A kiválasztott csodák önálló faji képességek. Aktiválásuk és időtartamuk csodánként eltér (41–44. o. és errata).",
  Törpe: "A csodamesterség hatása a fémanyagtól és a próbától függ (46–47. o.).",
  Gnóm: "A hatodik érzék és a jóslás értelmezése a Mesélő feladata (48–49. o.).",
  Ember: "Az ember-mhyori képességei az alakváltástól és az aktuális esszenciától függenek (50. o. és errata).",
  Gyíklény: "A természetes páncélzat, a hideg és a Kő Éneke külön helyzetfüggő szabályokat követ (52–53. o.).",
};

export function racialSelectionError(race, subtype, selected, complete = false) {
  const variants = subraces[race];
  if (complete && variants && !variants.includes(subtype)) return "Válaszd ki az alfajt.";
  if (race === "Manó" && selected.includes("Méreg érzékelése") &&
      !selected.includes("Teljes méreg- és betegségimmunitás")) return "A méreg érzékeléséhez teljes immunitás szükséges.";
  if (race === "Tündérke" && complete) {
    const choices = racialAbilities.Tündérke.filter(([name]) => selected.includes(name));
    const tricks = choices.filter(([, , , group]) => group === "trükk").length;
    const magics = choices.filter(([, , , group]) => group === "mágia").length;
    if (tricks < (subtype === "Tündérmanó" ? 3 : 2) || (subtype === "Tündérmanó" && magics < 1)) {
      return "Válaszd ki az alfajhoz járó ingyenes trükköket és mágiát is.";
    }
  }
  return "";
}

export function racialAbilityCost(race, subtype, selected) {
  const choices = (racialAbilities[race] ?? []).filter(([name]) => selected.includes(name));
  const total = choices.reduce((sum, [, cost]) => sum + cost, 0);
  if (race !== "Tündérke") return total;
  const tricks = choices.filter(([, , , group]) => group === "trükk").length;
  const magics = choices.filter(([, , , group]) => group === "mágia").length;
  return total - Math.min(tricks, subtype === "Tündérmanó" ? 3 : 2) * 5 -
    (subtype === "Tündérmanó" && magics > 0 ? 15 : 0);
}
