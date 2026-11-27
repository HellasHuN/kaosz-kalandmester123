const storageKey = "kaosz-karakterek";
const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isText = (value) => typeof value === "string";
const isId = (value) => Number.isSafeInteger(value) || (isText(value) && value.length > 0);
const optional = (value, check) => value == null || check(value);
const arrayOf = (check) => (value) => Array.isArray(value) && value.every(check);
const mapOf = (check) => (value) => isRecord(value) &&
  Object.entries(value).every(([key, entry]) => key !== "__proto__" && !Object.hasOwn(Object.prototype, key) && check(entry));
const hasFields = (value, checks) => isRecord(value) && Object.entries(checks)
  .every(([key, check]) => optional(value[key], check));
const isRank = (value) => Number.isSafeInteger(value) && value >= 0 && value <= 10;
const isNumber = Number.isFinite;
const isNonnegative = (value) => isNumber(value) && value >= 0;
const stringList = arrayOf(isText);
const ranks = mapOf(isRank);
const scalar = (value) => isText(value) || isNumber(value) || typeof value === "boolean";

function validAncestor(node, root = false) {
  return hasFields(node, { race: isText }) &&
    ((!root && node.parents == null) || arrayOf((parent) => parent == null || validAncestor(parent))(node.parents));
}

function validEpAccounting(entry) {
  return isNonnegative(entry.previousEp) && isNonnegative(entry.remainingEp) && entry.remainingEp <= entry.previousEp;
}

function validMagic(magic) {
  const spellReference = (entry) => isRecord(entry) && isText(entry.spellId) && isText(entry.form);
  const effect = (entry) => isRecord(entry) && isId(entry.id) && isText(entry.name) && isText(entry.description) &&
    isNumber(entry.difficulty) && isNumber(entry.ep);
  // Explicit null is valid for the tracked resources, whose initial state is unknown.
  return hasFields(magic, { activeEp: isNonnegative, shield: isNonnegative,
    academicSpecialization: entry => isRecord(entry) && isText(entry.codex) && optional(entry.branch, isText),
    academicExceptions: mapOf(entry => hasFields(entry, {
      allowed: value => typeof value === "boolean",
      bonus: value => typeof value === "boolean",
      granted: value => typeof value === "boolean",
      grantAddedAcquisition: value => typeof value === "boolean",
      componentFree: value => typeof value === "boolean",
    })),
  }) &&
    Object.entries({
      patron: isText, academicCodices: stringList, sacredCodices: stringList,
      acquisitions: arrayOf((entry) => spellReference(entry) &&
        hasFields(entry, { ep: isNonnegative, units: isNonnegative, target: isRecord })),
      castingLog: arrayOf(entry => isRecord(entry) && isId(entry.id) && isText(entry.spellName) &&
        isText(entry.recordedAt) && isText(entry.outcome) && optional(entry.consequence, isText) && optional(entry.reservation, spellReference) &&
        (entry.status === "pending" || entry.status === "adjudicated"
          ? isId(entry.spellId) && Number.isSafeInteger(entry.roll) && entry.roll >= 1 && entry.roll <= 100 &&
            isNumber(entry.target) && (entry.status === "pending" ||
              (isText(entry.adjudicatedAt) && isText(entry.consequence) && validEpAccounting(entry)))
          : validEpAccounting(entry))),
      restrictedSpells: arrayOf(spellReference), wildEffects: arrayOf(effect), freeEffects: arrayOf(effect),
    }).every(([key, check]) => magic[key] === undefined || check(magic[key]));
}

function validEquipment(equipment) {
  const item = (entry) => isRecord(entry) && isId(entry.id) && isText(entry.catalogId) &&
    hasFields(entry, { quantity: scalar }) && mapOf((value) => value == null || scalar(value))(entry.values);
  return hasFields(equipment, { notes: isText, items: (items) => arrayOf(item)(items) || mapOf(scalar)(items) });
}

function validCharacter(character, allowedRaces) {
  if (!isRecord(character) || !isId(character.id) || !isText(character.name)) return false;
  return hasFields(character, {
    age: (age) => isText(age) || isNumber(age),
    race: (race) => isText(race) && (!allowedRaces || allowedRaces.includes(race)), subrace: isText,
    playStatus: (status) => status === "draft" || status === "playing",
    profile: (value) => hasFields(value, {
      birthplace: isText, heightCm: scalar, weightKg: scalar, hairColor: isText, eyeColor: isText,
      socialStatus: isText, distinguishingMarks: isText,
    }),
    religion: isText, gender: isText, parent1: isText, parent2: isText,
    jp: isNumber, currentFp: isNumber, maxFp: isNumber, stats: (stats) =>
      (stats.length === 4 || stats.length === 5) && arrayOf(isNumber)(stats),
    adjustments: arrayOf(isNumber), advantages: stringList, disadvantages: stringList,
    talentSkills: stringList, racialAbilities: stringList,
    racialSpecializations: (value) => hasFields(value, {
      approvedNatureSkills: stringList, spikeLocations: stringList, artGenre: isText, weaponType: isText,
    }),
    ancestry: (value) => validAncestor(value, true), ageAllocation: isRecord,
    inheritedTraits: isRecord, traitValues: mapOf((value) => value == null || scalar(value)),
    startingSkillApprovals: (value) => hasFields(value, { exceptions: mapOf(isRecord) }), skills: ranks, skillEffectBaseline: ranks, creationRacialSkills: ranks,
    creationSkillsUnderGrant: ranks, skillNotes: mapOf(isText), skillFoundations: mapOf(isText),
    trainingPackages: mapOf((record) => hasFields(record, { choices: stringList, paidJp: isNonnegative })),
    skillTraining: mapOf((entry) => isRecord(entry) && isRank(entry.level) && isNonnegative(entry.cost)),
    skillSunkJp: mapOf(isNonnegative), skillJpPaid: mapOf(isNonnegative),
    skillJpByLevel: mapOf(arrayOf((price) => price === null || isNonnegative(price))),
    estimatedSkillJp: stringList, magic: validMagic, equipment: validEquipment,
  }) && ["equipment", "trainingPackages"].every((key) => character[key] !== null);
}

function parseCharacters(raw, allowedRaces) {
  if (raw === null) return { characters: [], raw, blocked: false };
  try {
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return { characters: [], raw, blocked: true };
    const ids = new Set();
    const characters = data.filter((character) => {
      if (!validCharacter(character, allowedRaces) || ids.has(String(character.id))) return false;
      ids.add(String(character.id));
      return true;
    });
    return { characters, raw, blocked: characters.length !== data.length };
  } catch {
    return { characters: [], raw, blocked: true };
  }
}

export function readCharacters(storage, allowedRaces) {
  try {
    const backend = typeof storage === "function" ? storage() : storage;
    return parseCharacters(backend.getItem(storageKey), allowedRaces);
  } catch {
    return { characters: [], raw: null, blocked: true };
  }
}

export function writeCharacters(storage, characters, previousRaw) {
  try {
    const backend = typeof storage === "function" ? storage() : storage;
    const currentRaw = backend.getItem(storageKey);
    if (currentRaw !== previousRaw || parseCharacters(currentRaw).blocked) return false;
    backend.setItem(storageKey, JSON.stringify(characters));
    return true;
  } catch {
    return false;
  }
}

export function persistCharacterStatus(storage, characters, previousRaw, characterId, nextStatus) {
  const character = characters.find(({ id }) => id === characterId);
  if (!character || !["draft", "playing"].includes(nextStatus) ||
      (character.playStatus != null && !(character.playStatus === "draft" && nextStatus === "playing"))) return null;
  const updated = characters.map((saved) => saved === character ? { ...saved, playStatus: nextStatus } : saved);
  return writeCharacters(storage, updated, previousRaw) ? updated : null;
}

export function planCharacterImport(raw, current, allowedRaces) {
  const imported = parseCharacters(raw, allowedRaces);
  if (imported.blocked) return { error: "A fájl érvénytelen vagy ismétlődő karaktereket tartalmaz." };
  const existingIds = new Set(current.map(({ id }) => String(id)));
  const added = imported.characters.filter(({ id }) => !existingIds.has(String(id)));
  return { characters: [...current, ...added], added: added.length, conflicts: imported.characters.length - added.length };
}
