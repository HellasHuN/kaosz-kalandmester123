import { academicAccess, academicTheoryRank } from "./teszt/academic.js";
import { ownsScroll } from "./teszt/scrolls.js";
import { effectiveAttribute } from "./karakterFoeertekek.js";
import { spells } from "./varazslatAdatok.js";
import { roundPercentageResult } from "./kerekites.js";

export const forms = {
  academic: {
    label: "Akadémikus", acquisition: "megtanult formula",
    description: "Az általános Mágiaelmélet adja az elméleti alapot. Az opcionális akadémikus szakosodás TESZT 1.0 háziszabály. A varázslathoz akadémikus Mágiahasználat és megtanult formula szükséges. Az egyszerre felhasználható Ep-t az Esszenciafelszabadítás korlátozza.",
  },
  free: {
    label: "Szabad", acquisition: "Mesélő által elbírálandó minta",
    description: "A Szabad Mágiahasználat szintje és a hatás nehézsége adja a próba célszámát. A mintához képest +2 nehézség és +20% Ep. Az egyszerre felhasználható Ep-t az Esszenciafelszabadítás korlátozza.",
  },
  practical: {
    label: "Praktikus", acquisition: "megtanult és elszámolt rigmus",
    description: "A megtanult rigmus próbája a Tudathoz kötődik. A rögzítéshez a tanulás Jp-jét előzetesen el kell számolni.",
  },
  sacred: {
    label: "Szakrális", acquisition: "kikért varázslat",
    description: "Papság vagy istenség, engedélyezett kódex, Elhivatottság és Esszenciafelszabadítás. Az ima, invokáció és áldozat részleteit a papság szabályai szerint kell ellenőrizni.",
  },
  wild: {
    label: "Vadmágia", acquisition: "Mesélő által elbírálandó minta",
    description: "Spontán mágia adottság és Esszenciakontroll. A mintához képest +2 nehézség, változatlan Ep-igénnyel.",
  },
};

export function readMagic(character) {
  return {
    activeEp: null, shield: null, academicCodices: [], sacredCodices: [],
    patron: "", druid: false, shaman: false, evilPriest: false, acquisitions: [], restrictedSpells: [], ...character.magic,
  };
}

export function magicLimits(character) {
  const essence = effectiveAttribute(character, 3) ?? 0;
  const activeEp = Math.max(0, effectiveAttribute(character, 3, 1) ?? 0);
  const shieldRating = Math.max(0, effectiveAttribute(character, 3, -1) ?? 0);
  const activation = character.skills?.["Esszenciapajzs-aktivizálás"] ?? 0;
  const shieldPercent = [20, 30, 40, 50, 60, 70, 80, 100, 120, 140, 170][activation] ?? 20;
  const shield = roundPercentageResult(shieldRating * shieldPercent / 100);
  const release = roundPercentageResult(activeEp * (character.skills?.["Esszenciafelszabadítás"] ?? 0) / 10);
  return { activeEp, shield, release, zoneM: essence };
}

const magicUseSkills = {
  academic: "Mágiahasználat (akadémikus)",
  free: "Mágiahasználat (szabad)",
};

// Alapkönyv, 152. oldal. A sor a jártasságszint, az oszlop a végleges nehézség.
const emeraldTargets = [
  [85, 25, 5, 3, 3, 3, 3, 1, 1, 1, 0, 0],
  [90, 85, 25, 3, 3, 3, 3, 1, 1, 1, 0, 0],
  [90, 90, 85, 20, 3, 3, 3, 1, 1, 1, 0, 0],
  [96, 96, 96, 90, 35, 5, 5, 4, 4, 4, 1, 1],
  [96, 96, 96, 95, 90, 35, 5, 4, 4, 4, 1, 1],
  [96, 96, 96, 95, 95, 90, 35, 4, 4, 4, 1, 1],
  [96, 96, 96, 95, 95, 95, 90, 30, 4, 4, 1, 1],
  [99, 99, 99, 97, 97, 97, 97, 95, 55, 15, 5, 1],
  [99, 99, 99, 97, 97, 97, 97, 96, 95, 55, 15, 5],
  [99, 99, 99, 97, 97, 97, 97, 96, 96, 95, 65, 25],
];

export function freeMagicTrial(character, difficulty) {
  const level = character.skills?.[magicUseSkills.free] ?? 0;
  return { level, target: emeraldTargets[level - 1]?.[difficulty - 1] ?? null };
}

export function academicMagicTrial(character, magic, spell, difficulty) {
  const level = character.skills?.[magicUseSkills.academic] ?? 0;
  const base = emeraldTargets[level - 1]?.[difficulty - 1];
  const benefits = academicAccess(magic, spell);
  return { ...benefits, level, target: base == null ? null : Math.min(100, base + benefits.bonus) };
}

function normalizeCodexName(value) {
  return value.normalize("NFC").trim().toLocaleLowerCase("hu")
    .replace(/\s+/gu, " ").replace(/\s+kódex(?=\s*\)|$)/u, "");
}

export function hasCodexPermission(permissions, codex) {
  return permissions.some((name) => normalizeCodexName(name) === normalizeCodexName(codex));
}

export function formRequirements(character, magic, form) {
  const skills = character.skills ?? {};
  const wildGift = [character.advantages, character.disadvantages]
    .some((traits) => traits?.includes("Spontán mágia"));
  if (wildGift && form !== "wild") return ["Spontán mágiával a többi mágiaforma nem használható biztonságosan."];
  switch (form) {
    case "academic":
    case "free":
      return skills[magicUseSkills[form]] > 0 ? [] : [`Szükséges jártasság: ${magicUseSkills[form]}.`];
    case "practical":
      return [];
    case "sacred":
      return [
        ...(!magic.patron.trim() ? ["A Mesélőnek rögzítenie kell az istenséget vagy papságot."] : []),
        ...(!skills["Elhivatottság*"] ? ["Szükséges jártasság: Elhivatottság."] : []),
      ];
    case "wild":
      return [
        ...(!wildGift ? ["Szükséges adottság: Spontán mágia előny vagy hátrány."] : []),
        ...(!(skills["Esszenciakontroll"] > 0) ? ["Az irányított vadmágiához Esszenciakontroll szükséges."] : []),
      ];
    default:
      return ["Ismeretlen mágiaforma."];
  }
}

export function selectableForms(character, magic) {
  return Object.keys(forms).filter((form) => formRequirements(character, magic, form).length === 0);
}

export function spellAccess(character, magic, spell, form) {
  const reasons = formRequirements(character, magic, form);
  if ((form === "practical") !== (spell.codex === "Praktikus mágia")) {
    reasons.push("A tétel más mágiaformához tartozik.");
  }
  const skills = character.skills ?? {};
  const theory = academicTheoryRank(skills);
  const fromScroll = form === "practical" && spell.codex === "Praktikus mágia" && ownsScroll(character.equipment, spell);
  const spellLevel = form === "academic" && Number.isInteger(spell.difficulty) ? spell.difficulty : 0;
  if (spellLevel > (skills[magicUseSkills[form]] ?? 0)) {
    reasons.push(`${magicUseSkills[form]}: ${skills[magicUseSkills[form]] ?? 0}. szint, szükséges: ${spellLevel}.`);
  }
  if (form === "academic") {
    if (theory < Math.max(1, spellLevel)) reasons.push(`Mágiaelmélet: ${theory}. szint, szükséges: ${Math.max(1, spellLevel)}.`);
    if (!academicAccess(magic, spell).allowed) reasons.push("Másik kódexhez vagy ághoz külön KM-engedély szükséges.");
  }
  if (form === "sacred" && !spell.evilPrayer && !hasCodexPermission(magic.sacredCodices, spell.codex)) {
    reasons.push("A papság számára ez a kódex nincs engedélyezve.");
  }
  if (spell.druidOnly && (form !== "sacred" || !magic.druid)) reasons.push("Csak druida használhatja.");
  if (spell.druidOrShaman && !magic.druid && !magic.shaman) reasons.push("Csak druida vagy sámán használhatja.");
  if (spell.deityOnly) reasons.push("Ezt a varázslatot csak Zhénia hozhatja létre.");
  if (spell.requiredSkill && !character.skills?.[spell.requiredSkill]) reasons.push(`Szükséges jártasság: ${spell.requiredSkill}.`);
  if (spell.evilPrayer && (form !== "sacred" || !magic.evilPriest)) reasons.push("A gonosz istenek papjainak imája.");
  if (magic.restrictedSpells.some((entry) => entry.form === form && entry.spellId === spell.id)) {
    reasons.push("A Mesélő a karakter számára ennél a mágiaformánál kizárta a tételt.");
  }
  const recorded = magic.acquisitions.some((entry) => entry.spellId === spell.id && entry.form === form);
  const needsAcquisition = !fromScroll && !spell.evilPrayer && (form === "academic" || form === "practical" || form === "sacred");
  return { allowed: reasons.length === 0, reasons, recorded, needsAcquisition, fromScroll };
}

export function spellCost(spell, form, { units, target } = {}) {
  const { ep } = spell;
  let amount;
  if (ep?.kind === "fixed") amount = ep.amount;
  if (ep?.kind === "perUnit" && Number.isSafeInteger(units) && units > 0 &&
      (ep.maxUnits == null || units <= ep.maxUnits)) amount = ep.amount * units;
  if (ep?.kind === "flight" && target) {
    if (target.self) amount = 5;
    else if (target.kg > 0 && target.kg <= 200) amount = target.kg <= 100 ? 10 : target.kg <= 150 ? 20 : 40;
    if (amount != null) amount = Number.isSafeInteger(units) && units > 0 ? amount * units : undefined;
  }
  return {
    ep: amount == null ? null : form === "free" ? roundPercentageResult(amount * 12 / 10) : amount,
    difficulty: Number.isFinite(spell.difficulty)
      ? spell.difficulty + (form === "free" || form === "wild" ? 2 : 0) : null,
  };
}

const spellsById = new Map(spells.map((spell) => [spell.id, spell]));

function reservedEp(entry) {
  if (Number.isFinite(entry.ep) && entry.ep >= 0) return entry.ep;
  const spell = spellsById.get(entry.spellId);
  return spell && entry.ep == null ? spellCost(spell, "sacred", entry).ep : null;
}

export function unresolvedSacredReservations(magic) {
  return magic.acquisitions.filter((entry) => entry.form === "sacred" && reservedEp(entry) == null);
}

export function approveLegacyReservation(magic, entry, ep, approved) {
  if (approved !== true || !Number.isFinite(ep) || ep < 0 ||
      !unresolvedSacredReservations(magic).includes(entry)) return magic;
  return { ...magic, acquisitions: magic.acquisitions.map((item) => item === entry ? { ...item, ep, epApproved: true } : item) };
}

export function availableMagicEp(character, magic, ownReservation) {
  if (magic.activeEp == null) return null;
  let available = Math.min(magic.activeEp, magicLimits(character).activeEp);
  for (const entry of magic.acquisitions) {
    if (entry.form !== "sacred" || entry === ownReservation) continue;
    const ep = reservedEp(entry);
    if (ep == null) return null;
    available -= ep;
  }
  return available;
}

export function spellReadiness(character, magic, spell, form, context = {}) {
  const access = spellAccess(character, magic, spell, form);
  if (!access.allowed) return { state: "denied", reasons: access.reasons };
  if (access.needsAcquisition && !access.recorded) return { state: "pending", reasons: ["A megszerzés még nincs rögzítve."] };
  const cost = spellCost(spell, form, context);
  const limits = magicLimits(character);
  const reservation = form === "sacred" && access.needsAcquisition &&
    magic.acquisitions.find((entry) => entry.spellId === spell.id && entry.form === form);
  if (reservation?.epApproved === true && cost.ep == null && !context.units && !context.target) {
    cost.ep = reservedEp(reservation);
  }
  const available = availableMagicEp(character, magic, reservation);
  const checksRelease = form === "academic" || form === "sacred";
  if (spell.ep?.kind === "flight" && context.target && !context.target.self && context.target.kg > 200) {
    return { state: "blocked", reasons: ["Másik célpont legfeljebb 200 kg lehet."] };
  }
  if (form === "wild") {
    const risk = wildEnergyStatus(character, magic, cost.ep);
    if (risk) return risk;
  }
  if (form === "free") {
    const limit = freeEnergyStatus(character, magic, cost.ep);
    if (limit) return limit;
  }
  if (reservation && cost.ep != null) {
    const reserved = reservedEp(reservation);
    if (reserved == null) return { state: "review", reasons: ["A kikérésben lefoglalt Ep nem állapítható meg."] };
    if (cost.ep !== reserved) return { state: "blocked", reasons: ["Az Ep-igény eltér a kikért varázslatban rögzített összegtől."] };
  }
  if (cost.ep != null && ((available != null && cost.ep > available) ||
      (checksRelease && cost.ep > limits.release))) {
    return { state: "blocked", reasons: ["A szokásos használathoz kevés a rendelkezésre álló vagy felszabadítható Ep."] };
  }
  if (available == null || cost.ep == null || cost.difficulty == null || !context.conditionsConfirmed) {
    return { state: "review", reasons: ["Az Ep-t, a konkrét költséget és a helyzeti feltételeket ellenőrizni kell."] };
  }
  return { state: "ready", reasons: [] };
}

export function freeEnergyStatus(character, magic, ep) {
  if (ep == null) return { state: "review", reasons: ["A konkrét Ep-igényt a Mesélő állapítja meg."] };
  const limits = magicLimits(character);
  if (ep > limits.activeEp) return { state: "blocked", reasons: ["A hatás Ep-igénye meghaladja a Varázserő maximumát."] };
  const available = availableMagicEp(character, magic);
  if (available == null) return { state: "review", reasons: ["A szabad Ep-keret nem állapítható meg."] };
  if (ep > available) return { state: "blocked", reasons: ["A hatáshoz jelenleg kevés a szabad Ep."] };
  if (ep > limits.release) return { state: "overflow", reasons: ["A hatás meghaladja az Esszenciafelszabadítás keretét. A túlcsordulásról a Mesélő dönt."] };
  return null;
}

export function wildEnergyStatus(character, magic, ep) {
  if (ep == null) return { state: "review", reasons: ["A konkrét Ep-igényről a Mesélő dönt."] };
  const { activeEp: maximum } = magicLimits(character);
  if (ep > maximum) return { state: "overflow", reasons: ["A hatás meghaladja a Varázserő maximumát. Túlcsorduláskor a sikeres és a sikertelen próbánál is megtámadják a vadmágust az esszenciaszörnyek."] };
  if (magic.activeEp == null) return { state: "review", reasons: ["Az aktuális Varázserő nincs rögzítve."] };
  if (ep > Math.min(magic.activeEp, maximum)) return { state: "blocked", reasons: ["A hatáshoz jelenleg kevés az aktív Ep."] };
  return null;
}

export function recordAcquisition(character, magic, spell, form, context) {
  const access = spellAccess(character, magic, spell, form);
  if (!access.allowed || !access.needsAcquisition || access.recorded) return magic;
  const entry = { spellId: spell.id, form };
  if (form === "sacred") {
    const { ep } = spellCost(spell, form, context);
    if (sacredRequestLimit(character, magic, ep)) return magic;
    entry.ep = ep;
    if (context.units) entry.units = context.units;
    if (context.target) entry.target = context.target;
  }
  return { ...magic, acquisitions: [...magic.acquisitions, entry] };
}

export function sacredRequestLimit(character, magic, ep) {
  if (ep == null) return "A konkrét Ep-igény ellenőrzendő.";
  if (magic.activeEp == null) return "Az aktuális Varázserő nincs rögzítve.";
  const limits = magicLimits(character);
  if (ep > limits.release) return "Kevés az egyszerre felszabadítható Ep.";
  const available = availableMagicEp(character, magic);
  if (available == null) return "A szabad Ep-keret nem állapítható meg.";
  if (ep > available) return "Kevés a szabad Ep az aktuális Varázserőből.";
  return "";
}


export function finishSacredSpell(character, magic, spell, context, cast) {
  const entry = magic.acquisitions.find((item) => item.form === "sacred" && item.spellId === spell.id);
  if (!entry || reservedEp(entry) == null || (cast && spellReadiness(character, magic, spell, "sacred", context).state !== "ready")) return magic;
  return {
    ...magic,
    activeEp: cast ? magic.activeEp - reservedEp(entry) : magic.activeEp,
    acquisitions: magic.acquisitions.filter((item) => item !== entry),
  };
}
