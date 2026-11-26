import { ancestryTheme } from "./teszt/ancestryTheme.js";
import MainMenu from "./teszt/MainMenu.jsx";
import "./teszt/mobileHome.css";
import { markConversationRead, readAdventure, sampleCharacter, writeAdventure } from "./teszt/localAdventure.js";
import "./teszt/testMode.css";
import { persistCharacterStatus, planCharacterImport, readCharacters, writeCharacters } from "./karakterMentes.js";
import { devotionError, devotionSkill } from "./elhivatottsag.js";
import { ancestryValidation, creationGenderOptions, fixedParentRace, getBreedingStatus } from "./szarmazas.js";
import { speedByRace } from "./gyorsasag.js";
import VallasValaszto from "./VallasValaszto.jsx";
import AlkotasiJartassagok from "./AlkotasiJartassagok.jsx";
import { clarifySpecialization } from "./jartassagSzakosodasok.js";
import { legacyTheoryNames, selectAcademicCodex, validAcademicSpecialization } from "./teszt/academic.js";
import { combineCreationGrants, creationGrantedSkills, creationSkillCosts, invalidCreationSkill, purchasedCreationSkills,
  savedCreationSkillTotal, skillsUnderRacialGrant, quoteCreationSkill } from "./alkotasiJartassagok.js";
import { racialAbilities, racialAbilityCost, racialRuleNotes, racialSelectionError, subraces } from "./fajiSzabalyok.js";
import { activeRacialChoices, specializationError, specializationStatCost } from "./fajiSzakosodasok.js";
import { addTrainingPackage, packageError, packageGrants, removeTrainingPackage } from "./kepzesiCsomagok.js";
import FajiSzakosodasValaszto from "./FajiSzakosodasValaszto.jsx";
import { currentInheritance } from "./felverOrokles.js";
import OroklesPanel from "./OroklesPanel.jsx";
import { firstInvalidSkillChange } from "./jartassagElofeltetelek.js";
import { calculateTraitJp, fingerPrices, narratorTraitPrices, traitConflict, traitValueError } from "./karakterTulajdonsagok.js";
import { changeCurrentHealth, maxHealth } from "./eletero.js";
import { roundPercentageResult } from "./kerekites.js";
import { TEHETSEG, preserveUnchangedSkillCosts, talentCost, talentEligibleSkills } from "./jpSzamitas.js";
import { lazy, Suspense, useState, useEffect, useRef } from "react";
import AlkotasiFelszereles from "./AlkotasiFelszereles.jsx";
import "./App.css";
import { elonyok, hatranyok } from "./elonyokHatranyok.js";
import {
  ageOptions, ageStage, allocateStartingStats, attributeAdjustmentLimit, attributes, LEGACY_PERCEPTION, characterAdjustments, characterStats,
  clampAttributeAdjustment, effectiveAttribute,
  perceptionLimits, statLimits, statPoints, STAT_POINTS,
} from "./karakterFoeertekek.js";
const Karakterlap = lazy(() => import("./Karakterlap.jsx"));
const Magia = lazy(() => import("./Magia.jsx"));
const TestMode = lazy(() => import("./teszt/TestMode.jsx"));
const TestSettings = lazy(() => import("./teszt/TestSettings.jsx"));

const races = {
  Elf: [[20, 70], [50, 90], [55, 90], [30, 85]],
  Ember: [[30, 80], [30, 80], [25, 80], [35, 90]],
  Gennymanó: [[15, 45], [60, 100], [20, 85], [20, 70]],
  Gilf: [[35, 85], [35, 85], [35, 85], [30, 100]],
  Gnóm: [[30, 60], [45, 85], [60, 90], [20, 70]],
  Gyíklény: [[30, 70], [35, 85], [20, 75], [20, 70]],
  Manó: [[15, 50], [30, 70], [20, 65], [15, 65]],
  Ogár: [[55, 95], [25, 70], [15, 60], [10, 60]],
  Ork: [[30, 90], [25, 75], [25, 70], [20, 70]],
  Törpe: [[45, 85], [25, 70], [25, 75], [20, 70]],
  Tündérke: [[10, 30], [40, 100], [25, 80], [25, 80]],
  "Félvér elf": [[35, 75], [45, 85], [35, 80], [25, 80]],
  "Félvér gilf": [[35, 80], [30, 75], [30, 80], [25, 85]],
  "Félvér ogár": [[50, 90], [30, 75], [20, 70], [20, 75]],
  Szürkemanó: [[15, 100], [15, 100], [15, 100], [10, 100]],
  "Félvér ork": [[45, 85], [30, 80], [25, 80], [15, 75]],
};
const ageLimits = {
  Elf: [33, 300, 350, 550],
  Ember: [13, 70, 90, 110],
  Gennymanó: [1, 10, 15, 20],
  Gilf: [35, 1000, 1100, 1500],
  Gnóm: [21, 100, 120, 170],
  Gyíklény: [9, 150, 200, 300],
  Manó: [3, 30, 40, 55],
  Ogár: [10, 60, 70, 90],
  Ork: [10, 40, 50, 85],
  Törpe: [30, 150, 200, 250],
  Tündérke: [1, 40, 45, 50],

  "Félvér elf": [15, 0, 0, 0],
  "Félvér gilf": [16, 0, 0, 0],
  "Félvér ogár": [18, 0, 0, 0],
  "Félvér ork": [17, 0, 0, 0],

  Szürkemanó: [13, 70, 90, 110],
};

const parentRaces = [
  "Elf",
  "Ember",
  "Gilf",
  "Gnóm",
  "Manó",
  "Ogár",
  "Ork",
  "Törpe",
];

function getAncestryAgeLimits(node) {
  if (!node) return [];

  const ownLimits = ageLimits[node.race];
  if (!ownLimits) return [];

  const parents = node.parents || [];

  if (parents.length === 0) {
    return ownLimits;
  }

  const firstLimits = parents[0]?.race
    ? getAncestryAgeLimits(parents[0])
    : ownLimits;

  const secondLimits = parents[1]?.race
    ? getAncestryAgeLimits(parents[1])
    : ownLimits;

  if (!firstLimits.length || !secondLimits.length) {
    return ownLimits;
  }

  return [0, 1, 2, 3].map((index) =>
    Math.round(
      (firstLimits[index] + secondLimits[index]) / 2
    )
  );
}
const INITIAL_JP = 10_000;

function creationFields(character) {
  return {
    name: character?.name ?? "",
    age: String(character?.age ?? ""),
    race: character?.race ?? "",
    subrace: character?.subrace ?? "",
    racialAbilities: character?.racialAbilities ?? [],
    racialSpecializations: character?.racialSpecializations ?? {},
    parent1: character?.parent1 ?? "",
    parent2: character?.parent2 ?? "",
    ancestry: character?.ancestry ?? { race: character?.race ?? "", parents: [] },
    inheritedTraits: character?.inheritedTraits ?? {},
    stats: characterStats(character),
    ageAllocation: character?.ageAllocation ?? {},
    advantages: character?.advantages ?? [],
    disadvantages: character?.disadvantages ?? [],
    traitValues: character?.traitValues ?? {},
    talentSkills: character?.talentSkills ?? [],
    approvedTraits: character?.approvedTraits ?? false,
    adjustments: characterAdjustments(character),
    religion: character?.religion ?? character?.magic?.patron ?? "",
    gender: character?.gender ?? "",
    notes: character?.equipment?.notes ?? "",
  };
}

function CreationSection({ Editor, character, onSave }) {
  const editor = useRef(null);
  const [editing, setEditing] = useState(false);
  return <>
    <div className="skills-actions">
      {!editing ? <button type="button" onClick={() => { editor.current.start(); setEditing(true); }}>Szerkesztés</button> : <>
        <button type="button" onClick={() => { if (editor.current.save()) setEditing(false); }}>Alkalmazás a készülő karakterre</button>
        <button type="button" onClick={() => { editor.current.cancel(); setEditing(false); }}>Mégse</button>
      </>}
    </div>
    <Editor ref={editor} character={character} onSave={(_, value) => onSave(value)} />
  </>;
}

function App() {
  const [race, setRace] = useState("");
  const [subrace, setSubrace] = useState("");
  const [selectedRacialAbilities, setSelectedRacialAbilities] = useState([]);
  const [racialSpecializations, setRacialSpecializations] = useState({});
  const [inheritedTraits, setInheritedTraits] = useState({});
  const [page, setPage] = useState("fomenu");
  const [sheetEditingOnOpen, setSheetEditingOnOpen] = useState(false);
  const [adventureTabOnOpen, setAdventureTabOnOpen] = useState("overview");
  const [testMode, setTestMode] = useState(null);
  const [adventureCharacterId, setAdventureCharacterId] = useState(null);
  const [activationFeedback, setActivationFeedback] = useState(null);
  const [adventure, setAdventure] = useState(() => readAdventure({
    getItem: (key) => window.localStorage.getItem(key),
  }));
  const [adventureWriteFailed, setAdventureWriteFailed] = useState(false);
  const [name, setName] = useState("");
  const [religion, setReligion] = useState("");
  const [gender, setGender] = useState("");
  const [notes, setNotes] = useState("");
  const [age, setAge] = useState("");
  const [parent1, setParent1] = useState("");
const [parent2, setParent2] = useState("");
const [ancestry, setAncestry] = useState({
  race: "",
  parents: [],
});
  const [stats, setStats] = useState(() => characterStats());
  const [ageAllocation, setAgeAllocation] = useState({});
const [advantages, setAdvantages] = useState([]);
const [disadvantages, setDisadvantages] = useState([]);
const [approvedTraits, setApprovedTraits] = useState(false);
const [traitValues, setTraitValues] = useState({});
const [talentSkills, setTalentSkills] = useState([]);
  // Az aktív érték eltérése az alap főértéktől.
  // A passzív érték ugyanennyivel csökken.
  const [adjustments, setAdjustments] = useState(() => characterAdjustments());
  function toggleTrait(trait, type) {
  const isAdvantage = type === "elony";
  const current = isAdvantage ? advantages : disadvantages;
  const setter = isAdvantage ? setAdvantages : setDisadvantages;

  if (current.includes(trait.nev)) {
    setter(current.filter(item => item !== trait.nev));
    
    return;
  }

  if (advantages.length + disadvantages.length >= 4 && !approvedTraits) {
    alert("Legfeljebb 4 előny és hátrány választható!");
    return;
  }

  const selected = [...advantages, ...disadvantages];
  const existingConflicts = ["Kimagasló sebgyógyulás", "Vérzékenység", "Kimagasló mágikus ellenállás", "Rossz mágikus ellenállás"];
  if ((creationEditable || existingConflicts.includes(trait.nev)) && traitConflict(trait.nev, selected)) {
    alert("Ez a tulajdonság nem választható a már kiválasztott mellé!");
    return;
  }

  setter([...current, trait.nev]);
  
}
function updateTraitValue(traitName, value) {
  setTraitValues((previous) => ({
    ...previous,
    [traitName]: value,
  }));
}
const [initialSaves] = useState(() => readCharacters(() => window.localStorage, Object.keys(races)));
const [savedCharacters, setSavedCharacters] = useState(initialSaves.characters);
const [saveBlocked, setSaveBlocked] = useState(initialSaves.blocked);
const previousSave = useRef(initialSaves.raw);
const [devotionApproval, setDevotionApproval] = useState(null);
const [selectedCharacterId, setSelectedCharacterId] = useState(null);
const [creationTab, setCreationTab] = useState("details");
const [creationSkills, setCreationSkills] = useState({});
const [creationClarifications, setCreationClarifications] = useState({});
const [creationExtras, setCreationExtras] = useState({});
const selectedCharacter = savedCharacters.find((character) => character.id === selectedCharacterId);
const creationEditable = page === "alkotas" && (selectedCharacterId === null || selectedCharacter?.playStatus === "draft");
const [deletingCharacter, setDeletingCharacter] = useState(null);
const [deleteStep, setDeleteStep] = useState(0);
const [farewellMessage, setFarewellMessage] = useState("");
useEffect(() => {
  if (saveBlocked || savedCharacters === initialSaves.characters || JSON.stringify(savedCharacters) === previousSave.current) return;
  if (writeCharacters(() => window.localStorage, savedCharacters, previousSave.current)) {
    previousSave.current = JSON.stringify(savedCharacters);
  } else {
    setSaveBlocked(true);
  }
}, [savedCharacters, initialSaves, saveBlocked]);
  const total = stats.reduce((sum, value) => sum + value, 0);
function traitPrice(trait, value, talentSkills, race) {
  if (trait.nev === TEHETSEG) {
    return talentSkills.filter(Boolean).reduce((cost, skill) => cost + talentCost(skill), 0);
  }
  return calculateTraitJp(trait.nev, value, race) ??
    (Number(value ?? (Array.isArray(trait.jp) ? 0 : trait.jp)) || 0);
}

function traitPoints({ advantages, disadvantages, traitValues, talentSkills, race }) {
  function sumPrices(names, catalog) {
    return names.reduce((sum, name) => {
      const trait = catalog.find((item) => item.nev === name);
      return trait ? sum + traitPrice(trait, traitValues[name], talentSkills, race) : sum;
    }, 0);
  }

  return {
    selectedAdvantageJp: sumPrices(advantages, elonyok),
    selectedDisadvantageJp: sumPrices(disadvantages, hatranyok),
  };
}
const { selectedAdvantageJp, selectedDisadvantageJp } = traitPoints({ advantages, disadvantages, traitValues, talentSkills, race });
const netTraitJp = selectedDisadvantageJp - selectedAdvantageJp;
  const isHalfBlood =
  race.startsWith("Félvér") || race === "Szürkemanó";

const calculatedAgeLimits =
  ancestry.parents.length === 2 &&
  ancestry.parents.every((parent) => parent?.race)
    ? getAncestryAgeLimits(ancestry)
    : fixedParentRace[race] ? undefined : ageLimits[race];

  const stage = ageStage(age, calculatedAgeLimits);
  const options = ageOptions[stage];
  const configuredStats = ageAllocation.stage === stage ? ageAllocation.stats : undefined;
  const statPercent = age === "" || stage === "adultus" ? 100
    : stage === "senius" && Number(age) === calculatedAgeLimits[2] ? 50
    : stage === "senius" && Number(age) === calculatedAgeLimits[1] ? 80
    : configuredStats;
  const jpPercent = options ? ageAllocation.stage === stage ? ageAllocation.jp : undefined : 100;
  const sameSavedAge = selectedCharacter &&
    Number(age) === Number(selectedCharacter.age) && race === selectedCharacter.race &&
    JSON.stringify(ancestry) === JSON.stringify(creationFields(selectedCharacter).ancestry);
  const legacyAllocation = sameSavedAge && !selectedCharacter.ageAllocation;
  const savedStats = characterStats(selectedCharacter);
  const savedAbilityCost = racialAbilityCost(selectedCharacter?.race, selectedCharacter?.subrace,
    selectedCharacter?.racialAbilities ?? []) + specializationStatCost(selectedCharacter?.race, selectedCharacter?.racialSpecializations);
  const activeSpecializations = activeRacialChoices(race, subrace, racialSpecializations);
  const abilityCost = creationEditable ? racialAbilityCost(race, subrace, selectedRacialAbilities) +
    specializationStatCost(race, activeSpecializations) : savedAbilityCost;
  const savedTotal = savedStats.reduce((sum, value) => sum + value, 0);
  const savedGross = savedTotal + savedAbilityCost;
  const sameSavedAllocation = sameSavedAge && selectedCharacter.ageAllocation?.stats === statPercent;
  const previousBudget = sameSavedAllocation && statPercent != null && statPercent < 100 &&
    savedGross !== statPoints(statPercent) && (
      savedGross === Math.floor((STAT_POINTS - LEGACY_PERCEPTION) * statPercent / 100) + LEGACY_PERCEPTION ||
      savedGross === Math.floor(STAT_POINTS * statPercent / 100)
    );
  const grossStatBudget = legacyAllocation || previousBudget || (selectedCharacter && stage === "extrém")
    ? savedGross
    : statPercent == null ? null : statPoints(statPercent);
  const statBudget = grossStatBudget == null ? null : grossStatBudget - abilityCost;
  const perception = perceptionLimits[race];
  const limits = race ? statLimits(races[race], stage === "senius" ? statPercent : 100, perception?.range).map(([min, max], index) =>
    (index === 4 && selectedCharacter?.race === race && selectedCharacter.statAllocationVersion !== 1) ||
    legacyAllocation || (sameSavedAllocation && stage === "senius") || (selectedCharacter && stage === "extrém")
      ? [Math.min(min, savedStats[index]), Math.max(max, savedStats[index])] : [min, max]) : [];
  const remaining = statBudget == null ? null : statBudget - total;
  const startingJp = jpPercent == null ? null : roundPercentageResult(INITIAL_JP * jpPercent / 100 + netTraitJp);
  const creationOriginal = creationEditable && selectedCharacter
    ? Object.entries(creationClarifications).reduce((original, [name, scope]) =>
      clarifySpecialization(original, name, scope) ?? original, selectedCharacter)
    : undefined;
  const originalFields = creationOriginal && creationFields(creationOriginal);
  const originalTraitPoints = originalFields && traitPoints(originalFields);
  const originalAgeLimits = originalFields?.ancestry.parents?.length === 2 &&
    originalFields.ancestry.parents.every((parent) => parent?.race)
    ? getAncestryAgeLimits(originalFields.ancestry) : ageLimits[originalFields?.race];
  const originalAgeStage = originalFields && ageStage(originalFields.age, originalAgeLimits);
  const unknownOriginalAgeJp = !!ageOptions[originalAgeStage] && originalFields.ageAllocation.jp == null;
  const originalJpPercent = originalFields?.ageAllocation.jp ?? 100;
  const legacyJpPercent = legacyAllocation && jpPercent == null ? originalJpPercent : jpPercent;
  const currentCreationJp = legacyJpPercent == null ? null
    : roundPercentageResult(INITIAL_JP * legacyJpPercent / 100 + netTraitJp);
  const originalStartingJp = originalTraitPoints && roundPercentageResult(
    INITIAL_JP * (unknownOriginalAgeJp ? legacyJpPercent : originalJpPercent) / 100 +
    originalTraitPoints.selectedDisadvantageJp - originalTraitPoints.selectedAdvantageJp);
  const creationBudget = !stage || stage === "extrém" || currentCreationJp == null ? null
    : creationOriginal ? (creationOriginal.jp ?? 0) + savedCreationSkillTotal(creationOriginal) + currentCreationJp - originalStartingJp
      : currentCreationJp;
  const racialSkills = creationGrantedSkills({ race, subrace: subrace || undefined,
    racialSpecializations: activeSpecializations }, creationOriginal);
  const trainingPackages = creationExtras.trainingPackages ?? creationOriginal?.trainingPackages;
  const trainingGrants = packageGrants(trainingPackages);
  const creationGrants = combineCreationGrants(racialSkills, trainingGrants);
  const resolvedInheritance = currentInheritance(ancestry, inheritedTraits);
  const effectiveCreationSkills = { ...creationSkills };
  for (const [skill, minimum] of Object.entries(creationGrants)) {
    effectiveCreationSkills[skill] = Math.max(effectiveCreationSkills[skill] ?? 0, minimum);
  }
  const creationCharacter = {
    ...creationOriginal, ...creationExtras, race, subrace: subrace || undefined,
    racialAbilities: selectedRacialAbilities, stats, adjustments, advantages, disadvantages, traitValues,
    racialSpecializations: activeSpecializations, ancestry, inheritedTraits: resolvedInheritance,
    age, gender, religion, skills: effectiveCreationSkills, creationStage: stage, jp: creationBudget,
    skillEffectBaseline: creationOriginal?.skillEffectBaseline ?? creationOriginal?.skills ?? {},
    talentSkills: advantages.includes(TEHETSEG) ? talentSkills.filter(Boolean) : [],
  };
  const creationCosts = creationSkillCosts(creationCharacter, creationOriginal);

  function changeTrainingPackage(id, record) {
    const result = record
      ? addTrainingPackage(creationCharacter, id, record, creationSkills, racialSkills,
        creationBudget == null ? null : creationBudget - creationCosts.total)
      : removeTrainingPackage(trainingPackages, id, creationSkills);
    if (result.error) return result.error;
    setCreationExtras((previous) => ({ ...previous, trainingPackages: result.packages }));
    return "";
  }

  function clarifyCreationSkill(name, scope) {
    if (!creationOriginal || !clarifySpecialization(creationCharacter, name, scope) ||
        !clarifySpecialization(creationOriginal, name, scope)) return "A szakosodás már létezik vagy nem pontosítható.";
    setCreationClarifications((previous) => ({ ...previous, [name]: scope }));
    setCreationSkills((previous) => Object.fromEntries(Object.entries(previous)
      .map(([key, level]) => [key === name ? scope : key, level])));
    return "";
  }

  function changeCreationSkill(name, level, devotionApproved = false) {
    if (!creationEditable) return "Csak még nem játszott karakter jártasságai módosíthatók itt.";
    if (creationOriginal?.skillTraining?.[name]) return "Ehhez a jártassághoz már folyamatban lévő fejlesztés tartozik.";
    const { error } = quoteCreationSkill(creationCharacter, creationBudget, name, level, creationOriginal, devotionApproved);
    if (error) return error;
    if (name === devotionSkill) setDevotionApproval({ level, religion });
    setCreationSkills((previous) => {
      const next = { ...previous };
      if (level > (creationGrants[name] ?? 0)) next[name] = level;
      else if (!creationGrants[name] || next[name] > creationGrants[name]) delete next[name];
      return next;
    });
    return "";
  }

  function chooseAgeAllocation(key, value) {
    setAgeAllocation((previous) => ({
      ...(previous.stage === stage ? previous : { stage }),
      [key]: value === "" ? undefined : Number(value),
    }));
  }

function changeRace(value) {
  setRace(value);
  if (creationEditable) {
    setSubrace("");
    setSelectedRacialAbilities([]);
    setRacialSpecializations({});
    setInheritedTraits({});
  }
  if (creationEditable && !creationGenderOptions(value).includes(gender)) setGender("");
    setAncestry({
    race: value,
    parents: [],
  });
  setAge("");
  setAgeAllocation({});
  setParent1("");
  setParent2("");

  if (value) {
    setStats(allocateStartingStats(statLimits(races[value], 100, perceptionLimits[value].range), statPoints(), perceptionLimits[value].suggested));
  }

  setAdjustments(characterAdjustments());
  const fixedParent = fixedParentRace[value];
  if (fixedParent) {
  setParent1(fixedParent);

  setAncestry({
    race: value,
    parents: [
      { race: fixedParent, parents: [] },
      { race: "", parents: [] },
    ],
  });
}
}

  function changeStat(index, amount) {
    if (!race) return;

    const next = [...stats];
    const newValue = next[index] + amount;

    if ((amount < 0 && newValue < limits[index][0]) ||
        (amount > 0 && newValue > limits[index][1])) {
      return;
    }

    next[index] = newValue;
    setStats(next);

    // A generálóban a meglévő megoszlás a módosított korláton belül megmarad.
    const nextAdjustments = [...adjustments];
    nextAdjustments[index] = creationEditable
      ? clampAttributeAdjustment(newValue, adjustments[index])
      : 0;
    setAdjustments(nextAdjustments);
  }

  function changeAdjustment(index, amount) {
    const limit = attributeAdjustmentLimit(stats[index]);
    const next = [...adjustments];
    const newValue = next[index] + amount;

    if (Math.abs(newValue) > limit) return;

    next[index] = newValue;
    setAdjustments(next);
  }
  function changeGrandparent(parentIndex, grandparentIndex, value) {
  if (creationEditable) setInheritedTraits({});
  setAncestry((previous) => {
    const parents = [...previous.parents];

    const parent = parents[parentIndex] || {
      race: "",
      parents: [],
    };

    const grandparents = [...(parent.parents || [])];

    grandparents[grandparentIndex] = {
      race: value,
      parents: [],
    };

    parents[parentIndex] = {
      ...parent,
      parents: grandparents,
    };

    return {
      ...previous,
      magicApproved: false,
      parents,
    };
  });
}
function saveCharacter({ notify = true } = {}) {
  if (page === "alkotas" && !creationEditable) return false;
  if (creationEditable && document.querySelector('[data-unsaved="true"]')) {
    alert("Előbb alkalmazd az aktuális fül módosításait a készülő karakterre.");
    return false;
  }
  if (!validateCharacter()) return false;

  const existingCharacter = selectedCharacter;
  const savedFields = creationFields(existingCharacter);

  if (selectedCharacterId !== null && !existingCharacter) {
    alert("A betöltött karaktert már eltávolítottad.");
    return false;
  }

  const selectedTalents = advantages.includes(TEHETSEG) ? talentSkills.filter(Boolean) : [];
  if (creationEditable && advantages.includes(TEHETSEG) && !selectedTalents.length) {
    alert("Válassz legalább egy jártasságot a Született tehetség előnyhöz!");
    return false;
  }
  if (creationEditable && (creationBudget == null || creationBudget < creationCosts.total)) {
    alert("A karakteralkotási módosítások nem férnek bele a Jp-keretbe.");
    return false;
  }

  const character = {
    ...existingCharacter,
    ...(creationEditable && creationOriginal),
    ...(creationEditable && creationExtras),
    ...(religion !== savedFields.religion && { religion: religion.trim() }),
    ...(!creationEditable && notes !== savedFields.notes && { equipment: { ...existingCharacter?.equipment, notes } }),
    ...(gender !== savedFields.gender && { gender }),
    id: existingCharacter?.id ?? Date.now(),
    name: name.trim(),
    age,
    race,
    jp: creationEditable ? creationBudget - creationCosts.total : existingCharacter.jp,
    ...(creationEditable && {
      playStatus: "draft",
      ...(!existingCharacter && { statAllocationVersion: 1 }),
      skills: effectiveCreationSkills,
      skillEffectBaseline: creationCharacter.skillEffectBaseline,
      ...(subrace || existingCharacter?.subrace ? { subrace: subrace || undefined } : {}),
      ...(selectedRacialAbilities.length || existingCharacter?.racialAbilities ? { racialAbilities: selectedRacialAbilities } : {}),
      racialSpecializations: JSON.parse(JSON.stringify(activeSpecializations)),
      racialSpecializationJp: creationCosts.specializationJp,
      ...(Object.keys(resolvedInheritance).length || existingCharacter?.inheritedTraits
        ? { inheritedTraits: resolvedInheritance } : {}),
      ...(Object.keys(racialSkills).length || existingCharacter?.creationSkillsUnderGrant
        ? { creationSkillsUnderGrant: skillsUnderRacialGrant(creationSkills, creationGrants) } : {}),
      ...(Object.keys(racialSkills).length > 0 || existingCharacter?.creationRacialSkills
        ? { creationRacialSkills: racialSkills } : {}),
      ...preserveUnchangedSkillCosts(creationOriginal, effectiveCreationSkills, creationCosts.skillJpPaid,
        creationCosts.skillJpByLevel, creationCosts.estimatedSkillJp),
    }),
    ...(!legacyAllocation && stage !== "extrém" && {
      ageAllocation: {
        stage,
        stats: statPercent,
        jp: creationEditable ? legacyJpPercent : existingCharacter?.ageAllocation?.jp,
      },
    }),
        advantages,
    disadvantages,
    traitValues,
    talentSkills: selectedTalents,
    approvedTraits,
    parent1,
parent2,
ancestry: JSON.parse(JSON.stringify(ancestry)),
    stats: [...stats],
    adjustments: [...adjustments],
  };

  setSavedCharacters((previous) => existingCharacter
    ? previous.map((saved) => saved.id === character.id ? character : saved)
    : [...previous, character]
  );
  setSelectedCharacterId(character.id);
  setName(character.name);
  setReligion(character.religion ?? character.magic?.patron ?? "");
  setAgeAllocation(character.ageAllocation ?? {});
  setTalentSkills(character.talentSkills);
  setCreationTab("details");
  setCreationSkills(purchasedCreationSkills(character));
  setCreationClarifications({});
  setInheritedTraits(character.inheritedTraits ?? {});
  setCreationExtras({});

  if (notify) alert(saveBlocked ? "A karakter az aktuális munkamenetben frissült." : "A karakter sikeresen elmentve!");
  return true;
}
  function loadCharacter(character, forCreation = false) {
    setDevotionApproval(null);
    setCreationTab("details");
    setCreationSkills(forCreation ? purchasedCreationSkills(character) : {});
    setCreationClarifications({});
    setCreationExtras({});
    const fields = creationFields(character);
    setSelectedCharacterId(character?.id ?? null);
    setName(fields.name);
    setAge(fields.age);
    setRace(fields.race);
    setSubrace(fields.subrace);
    setSelectedRacialAbilities(fields.racialAbilities);
    setRacialSpecializations(fields.racialSpecializations);
    setParent1(fields.parent1);
    setParent2(fields.parent2);
    setAncestry(fields.ancestry);
    setInheritedTraits(fields.inheritedTraits);
    setStats(fields.stats);
    setAgeAllocation(fields.ageAllocation);
    setAdvantages(fields.advantages);
    setDisadvantages(fields.disadvantages);
    setTraitValues(fields.traitValues);
    setTalentSkills(fields.talentSkills);
    setApprovedTraits(fields.approvedTraits);
    setAdjustments(fields.adjustments);
    setReligion(fields.religion);
    setGender(fields.gender);
    setNotes(fields.notes);
  }

  const characterFieldsChanged = JSON.stringify({
    name, age: String(age), race, subrace, racialAbilities: selectedRacialAbilities, racialSpecializations,
    parent1, parent2, ancestry, inheritedTraits, stats, ageAllocation,
    advantages, disadvantages, traitValues, talentSkills, approvedTraits, adjustments,
    religion, gender, notes,
  }) !== JSON.stringify(creationFields(selectedCharacter));

  function confirmLeaving() {
    const hasChanges = (page === "alkotas" && (characterFieldsChanged ||
      Object.keys(creationExtras).length > 0 || Object.keys(creationClarifications).length > 0 ||
      JSON.stringify(creationSkills) !== JSON.stringify(purchasedCreationSkills(creationOriginal))))
      || document.querySelector('[data-unsaved="true"]');
    return !hasChanges || window.confirm("Nem mentett módosítások vannak. Biztosan továbblépsz mentés nélkül?");
  }

  function navigate(nextPage, character) {
    if (!confirmLeaving()) return;
    if (nextPage === "alkotas" && character && character.playStatus !== "draft") return;
    if (nextPage === "karakterlap" && character?.playStatus !== "playing") return;
    if (character !== undefined) loadCharacter(character, nextPage === "alkotas");
    setSheetEditingOnOpen(false);
    setAdventureTabOnOpen("overview");
    setPage(nextPage);
    window.scrollTo(0, 0);
    return true;
  }

  function selectTestMode(mode) {
    if (navigate("test-adventure", null)) setTestMode(mode);
  }

  function openPlayerCharacter(character) {
    if (navigate("karakterlap", character)) {
      setTestMode("player");
      setAdventureCharacterId(character.id);
    }
  }

  function openMenuCharacter(character, edit = false) {
    if (character.playStatus === "draft") navigate("alkotas", character);
    else if (character.playStatus === "playing") {
      if (navigate("karakterlap", character)) setSheetEditingOnOpen(edit);
    } else navigate("karakterek", null);
  }

  function openMenuChat(character) {
    if (!navigate("test-adventure", null)) return;
    setTestMode("player");
    setAdventureCharacterId(character.id);
    setAdventureTabOnOpen("messages");
    const next = markConversationRead(adventure, character.id, "player");
    if (next !== adventure) updateAdventure(next);
  }

  function openAdventureFor(character) {
    if (navigate("test-adventure", null)) setAdventureCharacterId(character.id);
  }

  function updateAdventure(next) {
    setAdventure(next);
    setAdventureWriteFailed(!writeAdventure({ setItem: (key, raw) => window.localStorage.setItem(key, raw) }, next));
  }

  function exportCharacters() {
    const raw = saveBlocked && previousSave.current != null ? previousSave.current : JSON.stringify(savedCharacters, null, 2);
    const url = URL.createObjectURL(new Blob([raw], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "kaosz-karakterek.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function importCharacters(raw) {
    if (saveBlocked) return "A meglévő helyi mentés megőrzése érdekében az importálás most nem elérhető.";
    const result = planCharacterImport(raw, savedCharacters, Object.keys(races));
    if (result.error) return result.error;
    if (result.added && window.confirm(`${result.added} új karakter hozzáadása?`)) {
      setSavedCharacters(previous => planCharacterImport(raw, previous, Object.keys(races)).characters);
      return `Hozzáadva: ${result.added}. Már meglévő azonosító miatt kihagyva: ${result.conflicts}.`;
    }
    return result.added ? "Az importálást megszakítottad." : "A fájl nem tartalmaz új karaktert.";
  }

  function openTestCharacter(character) {
    if (!savedCharacters.some(({ id }) => String(id) === String(character.id))) {
      setSavedCharacters(previous => previous.some(({ id }) => String(id) === String(character.id)) ? previous : [...previous, character]);
    }
    navigate("karakterlap", character);
  }

  function setPlayStatus(character, nextStatus) {
    const message = nextStatus === "draft"
      ? `Megerősíted, hogy ${character.name} még soha nem került játékba?`
      : character.playStatus == null
        ? `Megerősíted, hogy ${character.name} már játékban volt?`
        : `Játékba helyezed ${character.name} karaktert? Ezután nem tölthető vissza a karakteralkotásba.`;
    setActivationFeedback(null);
    if (!window.confirm(message)) return;

    const updated = !saveBlocked && persistCharacterStatus(() => window.localStorage, savedCharacters,
      previousSave.current, character.id, nextStatus);
    if (!updated) {
      setActivationFeedback({ error: true, text: "Az állapot mentése sikertelen. A karakter állapota nem változott." });
      return;
    }
    previousSave.current = JSON.stringify(updated);
    setSavedCharacters(updated);
    setActivationFeedback({ text: nextStatus === "playing"
      ? `${character.name} játékba került, és választható a kalandban.`
      : `${character.name} szerkeszthető tervezetként van mentve.` });
  }

  function openCreationTab(nextTab) {
    if (nextTab === creationTab) return;
    if (document.querySelector('[data-unsaved="true"]') &&
        !window.confirm("Elveted az ezen a fülön még nem alkalmazott módosításokat?")) return;
    setCreationTab(nextTab);
  }

  function saveSkills(character, skills, jp, skillJpPaid, skillJpByLevel, estimatedSkillJp, skillTraining, skillNotes, skillFoundations, skillSunkJp,
    original = character) {
    setSavedCharacters((previous) => previous.map((saved) =>
      saved === character ? { ...original, skills, jp,
        ...preserveUnchangedSkillCosts(original, skills, skillJpPaid, skillJpByLevel, estimatedSkillJp),
        skillTraining, skillNotes, skillFoundations, skillSunkJp, skillEffectBaseline: original.skillEffectBaseline ?? original.skills ?? {} } : saved
    ));
  }

  function saveEquipment(character, equipment) {
    setSavedCharacters((previous) => previous.map((saved) =>
      saved === character ? { ...saved, equipment } : saved
    ));
  }

  function saveMagic(character, magic) {
    setSavedCharacters((previous) => previous.map((saved) =>
      saved === character ? { ...saved, magic } : saved
    ));
  }

  function updateHealth(id, amount) {
    setSavedCharacters((previous) => previous.map((character) =>
      character.id === id ? changeCurrentHealth(character, amount) : character
    ));
  }
    function startDelete(character) {
  
  setDeletingCharacter(character);
  setDeleteStep(1);
}

function confirmDelete() {
  setDeleteStep(2);
}

function characterDied() {
  const characterName = deletingCharacter.name;

  setSavedCharacters((previous) =>
    previous.filter((character) => character.id !== deletingCharacter.id)
  );

  setDeletingCharacter(null);
  setDeleteStep(0);
  setFarewellMessage(
    `${characterName} kalandja véget ért. Emléke örökre megmarad a történetekben.`
  );
}

function characterSurvived() {
  const characterName = deletingCharacter.name;

  setDeletingCharacter(null);
  setDeleteStep(0);
  setFarewellMessage(
    `${characterName} életben marad! Talán egy másik kalandban még találkozunk vele.`
  );
}
  
function validateCharacter() {
  let message;
  const skillError = creationEditable && firstInvalidSkillChange(effectiveCreationSkills, creationOriginal?.skills,
    creationCharacter, creationOriginal, trainingGrants);
  const trainingError = creationEditable && Object.entries(trainingPackages ?? {})
    .map(([id, record]) => packageError(creationCharacter, id, record)).find(Boolean);
  const invalidSkill = creationEditable && invalidCreationSkill(creationCharacter, creationOriginal &&
    { ...creationOriginal, ...originalFields, creationStage: originalAgeStage }, creationGrants);
  const selectedTraits = [...advantages, ...disadvantages];
  const originalSelected = [...(creationOriginal?.advantages ?? []), ...(creationOriginal?.disadvantages ?? [])];
  const traitError = creationEditable && selectedTraits.map((trait, index) => {
    const unchanged = race === creationOriginal?.race && originalSelected.includes(trait) &&
      traitValues[trait] === creationOriginal.traitValues?.[trait];
    if (unchanged) return "";
    if (traitConflict(trait, selectedTraits.filter((_, other) => other !== index))) return `Ütköző tulajdonság: ${trait}.`;
    return traitValueError(trait, traitValues[trait], race);
  }).find(Boolean);
  const racialError = creationEditable ? racialSelectionError(race, subrace, selectedRacialAbilities, true) ||
    specializationError(race, subrace, activeSpecializations, selectedRacialAbilities) : "";
  const checkAncestry = creationEditable && isHalfBlood && (!selectedCharacter ||
    JSON.stringify(ancestry) !== JSON.stringify(creationFields(selectedCharacter).ancestry));
  const lineage = checkAncestry ? ancestryValidation(ancestry) : {};
  const checkGender = creationEditable && (!selectedCharacter ||
    race !== selectedCharacter.race || gender !== (selectedCharacter.gender ?? ""));
  if (!name.trim() || !race || !Number.isInteger(Number(age)) || Number(age) < 1) {
    message = "Töltsd ki a nevet, életkort és válaszd ki a fajt!";
  } else if (creationEditable && (effectiveCreationSkills[devotionSkill] ?? 0) > (creationOriginal?.skills?.[devotionSkill] ?? 0) &&
      (devotionApproval?.level !== effectiveCreationSkills[devotionSkill] || devotionApproval.religion !== religion ||
        devotionError(creationCharacter, effectiveCreationSkills[devotionSkill], true))) {
    message = "A jelenlegi vallással és szinttel hagyasd jóvá az Elhivatottságot a Kalandmesterrel.";
  } else if (traitError) {
    message = traitError;
  } else if (creationEditable && advantages.includes("Spontán mágia") &&
      (!creationOriginal?.advantages?.includes("Spontán mágia") || creationOriginal.skills?.Esszenciakontroll) &&
      !effectiveCreationSkills.Esszenciakontroll) {
    message = "A Spontán mágia előnyhöz Esszenciakontroll szükséges.";
  } else if (racialError) {
    message = racialError;
  } else if (creationEditable && race === "Elf" && subrace === "Erdei elf" &&
      creationOriginal?.creationRacialSkills?.Művészet && creationOriginal.racialSpecializations?.artGenre &&
      activeSpecializations.artGenre !== creationOriginal.racialSpecializations.artGenre) {
    message = "Műfajváltás előtt pontosítsd a korábban mentett faji Művészet jártasságot az eredeti műfajra.";
  } else if (!legacyAllocation && isHalfBlood && (race !== "Szürkemanó" || parent1 || parent2) && (!parent1 || !parent2)) {
    message = "Válaszd ki mindkét szülő faját!";
  } else if (lineage.error) {
    message = lineage.error;
  } else if (lineage.magical && !ancestry.magicApproved) {
    message = "A mágikus eredetű származást a Mesélőnek jóvá kell hagynia.";
  } else if (checkGender && race === "Gilf" && gender !== "Nő") {
    message = "Gilf játékoskarakternél a Nő lehetőséget kell kiválasztani.";
  } else if (!legacyAllocation && !stage) {
    message = "Az életkorhatárok még nem számíthatók ki!";
  } else if (calculatedAgeLimits?.[3] > 0 && Number(age) > calculatedAgeLimits[3]) {
    message = "A karakter életkora meghaladja a faj maximális életkorát!";
  } else if (!selectedCharacter && stage === "extrém") {
    message = "A senius életszakaszon túl új játékoskarakter nem indítható.";
  } else if (statBudget == null || (!selectedCharacter && startingJp == null)) {
    message = "Add meg az életkorhoz tartozó pontkeret-százalékokat!";
  } else if (creationEditable && (creationBudget == null || creationCosts.total > creationBudget)) {
    message = "A jártasságok költsége meghaladja az induló Jp-keretet.";
  } else if (trainingError) {
    message = trainingError;
  } else if (skillError) {
    message = skillError;
  } else if (invalidSkill) {
    message = `A következő jártasság szintje meghaladja a megengedett maximumot: ${invalidSkill}.`;
  } else if (total !== statBudget) {
    message = `A főértékek összege pontosan ${statBudget} kell legyen!`;
  } else if (!stats.every((value, index) => value >= limits[index][0] && value <= limits[index][1])) {
    message = "Valamelyik főérték kívül esik a faj és az életkor határértékein!";
  } else if (selectedCharacter?.currentFp > stats[0] && stats[0] < maxHealth(selectedCharacter)) {
    message = "A megadott Fizikum az aktuális életerő alá esne. Előbb csökkentsd az aktuális értéket.";
  }
  if (message) alert(message);
  return !message;
}

function checkCharacter() {
  if (validateCharacter()) alert("A karakter alapadatai érvényesek!");
}

  function renderTraits(compact = false) {
    function renderTraitPrice(trait, selected, sign) {
      if (!compact) {
        return creationEditable && Number.isFinite(trait.jp) && !trait.valtozo && <small> · {trait.jp} Jp</small>;
      }
      if (trait.valtozo && (!selected || traitValueError(trait.nev, traitValues[trait.nev], race))) return null;
      const price = traitPrice(trait, traitValues[trait.nev], talentSkills, race);
      return (price > 0 || !trait.valtozo) && <small className="creation-trait-price">{sign}{price} Jp</small>;
    }

    function renderNarratorPrice(trait) {
      const range = creationEditable && narratorTraitPrices[trait.nev];
      if (!range) return null;
      return <label>Mesélő által megadott Jp
        <input type="number" min={range[0]} max={range[1]} step="1"
          value={traitValues[trait.nev] ?? ""} onChange={(event) => updateTraitValue(trait.nev, event.target.value)} />
      </label>;
    }
    return <>
<h3>Előnyök kiválasztása</h3>

<div className="trait-list">
  {elonyok.map((trait) => (
  <div key={trait.nev} className="trait-item">
    <label>
      <input
        type="checkbox"
        checked={advantages.includes(trait.nev)}
        disabled={trait.nev === TEHETSEG && !creationEditable}
        onChange={() => toggleTrait(trait, "elony")}
      />
      {compact ? <span>{trait.nev}</span> : trait.nev}
      {renderTraitPrice(trait, advantages.includes(trait.nev), "−")}
    </label>

    {advantages.includes(trait.nev) && (
      <>
        {trait.nev === TEHETSEG && (
          <>
            {[0, 1].map((index) => (
              <label key={index}>
                {index === 0 ? "Első jártasság" : "Második jártasság (opcionális)"}
                <select
                  value={talentSkills[index] ?? ""}
                  disabled={!creationEditable || (index === 1 && !talentSkills[0])}
                  onChange={(event) => {
                    const skill = event.target.value;
                    setTalentSkills((previous) => index === 0
                      ? (skill ? [skill, previous[1] ?? ""] : [])
                      : [previous[0], skill]
                    );
                  }}
                >
                  <option value="">Válassz jártasságot!</option>
                  {[...new Set([...talentEligibleSkills, ...talentSkills.filter(Boolean)])]
                    .filter((skill) => skill !== talentSkills[1 - index] &&
                      (!legacyTheoryNames.has(skill) || skill === talentSkills[index])).map((skill) => (
                    <option key={skill} value={skill}>{skill} · {talentCost(skill)} Jp</option>
                  ))}
                </select>
              </label>
            ))}
            {selectedCharacterId !== null && !talentSkills.some(Boolean) && (
              <p>Ehhez a régi előnyhöz nincs mentett jártasság, így kedvezmény sem jár hozzá.</p>
            )}
          </>
        )}
        {[
          "Az átlagosnál jobb látás",
          "Az átlagosnál jobb hallás",
          "Az átlagosnál jobb szaglás",
        ].includes(trait.nev) && (
          <input
            type="number"
            min="130"
            max="250"
            step="10"
            placeholder="Érték: 130–250%"
            value={traitValues[trait.nev] ?? ""}
            onChange={(event) =>
              updateTraitValue(trait.nev, event.target.value)
            }
          />
        )}

        {trait.nev === "Csekély hőlátás" && (
          <input
            type="number"
            min="1"
            max="15"
            placeholder="Távolság: 1–15 méter"
            value={traitValues[trait.nev] ?? ""}
            onChange={(event) =>
              updateTraitValue(trait.nev, event.target.value)
            }
          />
        )}

        {trait.nev === "Csekély éjjeli látás" && (
          <input
            type="number"
            min="5"
            max="15"
            placeholder="Távolság: 5–15 méter"
            value={traitValues[trait.nev] ?? ""}
            onChange={(event) =>
              updateTraitValue(trait.nev, event.target.value)
            }
          />
        )}
{trait.nev === "Kimagasló gyorsaság" && race && (
  <input
    type="number"
    min={speedByRace[race]?.max}
    max={speedByRace[race]?.avg}
    placeholder={`Gyorsaság (${speedByRace[race]?.max}-${speedByRace[race]?.avg})`}
    value={traitValues[trait.nev] ?? ""}
    onChange={(event) =>
      updateTraitValue(trait.nev, event.target.value)
    }
  />
)}

        {renderNarratorPrice(trait)}
        {Array.isArray(trait.jp) && (!creationEditable || !narratorTraitPrices[trait.nev]) && (
          <select
            value={traitValues[trait.nev] ?? ""}
            onChange={(event) =>
              updateTraitValue(trait.nev, event.target.value)
            }
          >
            <option value="">Válassz Jp-értéket!</option>
            {trait.jp.map((cost) => (
              <option key={cost} value={cost}>
                {cost} Jp
              </option>
            ))}
          </select>
        )}
      </>
    )}
  </div>
))}
</div>
{creationEditable && <h3>Hátrányok kiválasztása</h3>}
<div className={creationEditable ? "trait-list" : undefined} style={creationEditable ? undefined : { display: "contents" }}>
{hatranyok.map((trait) => (
  <div key={trait.nev} className="trait-item">
    <label>
      <input
        type="checkbox"
        checked={disadvantages.includes(trait.nev)}
        onChange={() => toggleTrait(trait, "hatrany")}
      />
      {compact ? <span>{trait.nev}</span> : trait.nev}
      {renderTraitPrice(trait, disadvantages.includes(trait.nev), "+")}
    </label>

    {disadvantages.includes(trait.nev) && (
      <>
      {trait.nev === "Faji lassúság" && race && (
  <input
    type="number"
    min={speedByRace[race]?.avg}
    max={speedByRace[race]?.min}
    step="1"
    placeholder={`Gyorsaság (${speedByRace[race]?.avg}-${speedByRace[race]?.min})`}
    value={traitValues[trait.nev] ?? ""}
    onChange={(event) =>
      updateTraitValue(trait.nev, event.target.value)
    }
  />
)}
        {[
          
          "Az átlagosnál rosszabb látás",
          "Az átlagosnál rosszabb hallás",
          "Az átlagosnál rosszabb szaglás",
        ].includes(trait.nev) && (
          <input
            type="number"
            min="40"
            max="70"
            step="10"
            placeholder="Érték: 40–70%"
            value={traitValues[trait.nev] ?? ""}
            onChange={(event) =>
              updateTraitValue(trait.nev, event.target.value)
            }
          />
        )}

        {renderNarratorPrice(trait)}
        {creationEditable && trait.nev === "Hiányzó kézujjak" && <label>Hiányzó ujjak
          <select value={fingerPrices.findIndex(({ label, cost }) =>
            traitValues["Hiányzó kézujjak részlete"] ? traitValues["Hiányzó kézujjak részlete"] === label
              : Number(traitValues[trait.nev]) === cost)} onChange={(event) => {
            const choice = fingerPrices[Number(event.target.value)];
            updateTraitValue(trait.nev, choice?.cost ?? "");
            updateTraitValue("Hiányzó kézujjak részlete", choice?.label ?? "");
          }}>
            <option value={-1}>Válaszd ki az ujjakat</option>
            {fingerPrices.map(({ label, cost }, index) => <option key={label} value={index}>
              {label} · {cost} Jp
            </option>)}
          </select>
        </label>}
        {Array.isArray(trait.jp) && (!creationEditable || !narratorTraitPrices[trait.nev]) && (
          <select
            value={traitValues[trait.nev] ?? ""}
            onChange={(event) =>
              updateTraitValue(trait.nev, event.target.value)
            }
          >
            <option value="">Válassz Jp-értéket!</option>
            {trait.jp.map((cost) => (
              <option key={cost} value={cost}>
                {cost} Jp
              </option>
            ))}
          </select>
        )}
      </>
    )}
  </div>
))}

</div>
<div>
  <div className="trait-summary">
  <p>Előnyök költsége: <strong>{selectedAdvantageJp} Jp</strong></p>
  <p>Hátrányokból kapott Jp: <strong>{selectedDisadvantageJp} Jp</strong></p>
  <p>Nettó Jp-változás: <strong>{netTraitJp} Jp</strong></p>
  {creationEditable && <p>Elkölthető Jp: <strong>{creationBudget == null ? "—" : `${creationBudget - creationCosts.total} Jp`}</strong></p>}
  {creationEditable && unknownOriginalAgeJp && <p>A régi életkori Jp-százalék nincs rögzítve. Az elszámolás megőrzi a mentett életkori keretet.</p>}
</div>
  Kiválasztva: {advantages.length + disadvantages.length} / 4
</div>

<label>
  <input
    type="checkbox"
    checked={approvedTraits}
    onChange={(event) => setApprovedTraits(event.target.checked)}
  />
  Mesélő jóváhagyta a választást
</label>

    </>;
  }

  function renderAgePointOptions() {
    return <>
    {options && !legacyAllocation && (
      <>
        {!(stage === "senius" && [calculatedAgeLimits[1], calculatedAgeLimits[2]].includes(Number(age))) && (
          <label>Főértékpont-keret (Mesélő)
            <select value={configuredStats ?? ""} onChange={(event) => chooseAgeAllocation("stats", event.target.value)}>
              <option value="">Válassz százalékot!</option>
              {options.stats.map((value) => <option key={value} value={value}>{value}%</option>)}
            </select>
          </label>
        )}
        {creationEditable && (
          <label>Induló Jp-keret (Mesélő)
            <select value={jpPercent ?? ""} onChange={(event) => chooseAgeAllocation("jp", event.target.value)}>
              <option value="">Válassz százalékot!</option>
              {options.jp.map((value) => <option key={value} value={value}>{value}%</option>)}
            </select>
          </label>
        )}
      </>
    )}
    </>;
  }

  function renderAgeSelector() {
    return <>
    <select
      value={age}
      onChange={(event) => setAge(event.target.value)}
    >
      <option value="">Válassz életkort!</option>

      {Array.from(
        { length: selectedCharacter ? calculatedAgeLimits[3] : calculatedAgeLimits[2] },
        (_, i) => i + 1
      ).map((ageValue) => (
        <option key={ageValue} value={ageValue}>
          {ageValue} év
        </option>
      ))}
    </select>
    </>;
  }

  function renderAncestryFields() {
    return <>
       {(race.startsWith("Félvér") || race === "Szürkemanó") && (
  <>
    <h3>Szülők származása</h3>

    <label htmlFor="ancestry-parent-one">Első szülő faja</label>
 <select id="ancestry-parent-one"
  disabled={race.startsWith("Félvér")}
      value={parent1}
      onChange={(event) => {
       setParent1(event.target.value);
setAge("");
if (creationEditable) setInheritedTraits({});
setAncestry((previous) => ({
  ...previous,
  magicApproved: false,
  parents: [
    { race: event.target.value, parents: [] },
    previous.parents[1] || { race: "", parents: [] },
  ],
}));
      }}
    >
      <option value="">Válassz fajt!</option>
    {parentRaces
  .filter((item) =>
    !parent2 || getBreedingStatus(item, parent2) !== "N"
  )
  .map((item) => (
    <option key={item} value={item}>{item}</option>
  ))}
    </select>

    <label htmlFor="ancestry-parent-two">Második szülő faja</label>
    <select id="ancestry-parent-two"
      value={parent2}
      onChange={(event) => {
       setParent2(event.target.value);
setAge("");
if (creationEditable) setInheritedTraits({});
setAncestry((previous) => ({
  ...previous,
  magicApproved: false,
  parents: [
    previous.parents[0] || { race: "", parents: [] },
    { race: event.target.value, parents: [] },
  ],
}));
      }}
    >
      <option value="">Válassz fajt!</option>
     {parentRaces
  .filter((item) =>
    !parent1 || getBreedingStatus(parent1, item) !== "N"
  )
  .map((item) => (
  <option key={item} value={item}>
  {item}{getBreedingStatus(parent1, item) === "M" ? " (M)" : ""}
</option>
  ))}
    </select><h4>Első szülő nagyszülei</h4>

<label htmlFor="ancestry-grandparent-one">Első nagyszülő</label>
<select id="ancestry-grandparent-one"
  value={ancestry.parents[0]?.parents?.[0]?.race || ""}
  onChange={(event) => changeGrandparent(0, 0, event.target.value)}
>
  <option value="">Nincs megadva</option>
  {parentRaces.map((item) => (
    <option key={item} value={item}>{item}</option>
  ))}
</select>

<label htmlFor="ancestry-grandparent-two">Második nagyszülő</label>
<select id="ancestry-grandparent-two"
  value={ancestry.parents[0]?.parents?.[1]?.race || ""}
  onChange={(event) => changeGrandparent(0, 1, event.target.value)}
>
  <option value="">Nincs megadva</option>
  {parentRaces.map((item) => (
    <option key={item} value={item}>{item}</option>
  ))}
</select>

<h4>Második szülő nagyszülei</h4>

<label htmlFor="ancestry-grandparent-three">Harmadik nagyszülő</label>
<select id="ancestry-grandparent-three"
  value={ancestry.parents[1]?.parents?.[0]?.race || ""}
  onChange={(event) => changeGrandparent(1, 0, event.target.value)}
>
  <option value="">Nincs megadva</option>
  {parentRaces.map((item) => (
    <option key={item} value={item}>{item}</option>
  ))}
</select>

<label htmlFor="ancestry-grandparent-four">Negyedik nagyszülő</label>
<select id="ancestry-grandparent-four"
  value={ancestry.parents[1]?.parents?.[1]?.race || ""}
  onChange={(event) => changeGrandparent(1, 1, event.target.value)}
>
  <option value="">Nincs megadva</option>
  {parentRaces.map((item) => (
    <option key={item} value={item}>{item}</option>
  ))}
</select>
  </>
  )}

    </>;
  }

  function renderRaceSelector() {
    return <>
          <select
            value={race}
            onChange={(event) => changeRace(event.target.value)}
          >
            <option value="">Válassz fajt!</option>
            {Object.keys(races).map((raceName) => (
              <option key={raceName} value={raceName}>
                {raceName}
              </option>
            ))}
          </select>
    </>;
  }

  function renderCharacterFields(actions) {
    const genderOptions = creationGenderOptions(race);
    const abilityOptions = racialAbilities[race] ?? [];
    return <div className="creation-fields">
      <section className="panel creation-panel">
        <h3>Karakter adatai</h3>
        <div className="creation-grid">
          <label>Karakter neve
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Karakter neve" />
          </label>
          <label>Faj{renderRaceSelector()}</label>
          {subraces[race] && <label>Alfaj
            <select value={subrace} onChange={(event) => {
              setSubrace(event.target.value);
              setRacialSpecializations((previous) => activeRacialChoices(race, event.target.value, previous));
            }}>
              <option value="">Válassz alfajt!</option>
              {subraces[race].map((variant) => <option key={variant}>{variant}</option>)}
            </select>
          </label>}
          <label>Nem
            <select value={gender} onChange={(event) => setGender(event.target.value)}>
              <option value="">{race === "Gennymanó" ? "Nincs elkülönült nem" : "Nincs megadva"}</option>
              {gender && !genderOptions.includes(gender) && (
                <option value={gender}>{gender} (mentett érték)</option>
              )}
              {genderOptions.map((option) => <option key={option}>{option}</option>)}
            </select>
          </label>
          <label>Vallás
            <VallasValaszto value={religion} original={creationFields(selectedCharacter).religion} onChange={setReligion} />
          </label>
          {race && calculatedAgeLimits && <>
            <label>Életkor{renderAgeSelector()}</label>
            <div><strong>Életszakasz</strong><p>{stage ?? "—"}</p></div>
            {renderAgePointOptions()}
          </>}
        </div>
        {isHalfBlood && <div className="creation-ancestry"><h4>Származás</h4>{renderAncestryFields()}
          {ancestryValidation(ancestry).magical && <label>
            <input type="checkbox" checked={ancestry.magicApproved === true}
              onChange={(event) => {
                if (!event.target.checked) setInheritedTraits({});
                setAncestry((previous) => ({ ...previous, magicApproved: event.target.checked }));
              }} />
            A Mesélő jóváhagyta a mágikus eredetet
          </label>}
        </div>}
        {race && calculatedAgeLimits && <small>
          Juvenis határ {calculatedAgeLimits[0]} év · Átlagos életkor {calculatedAgeLimits[1]}–{calculatedAgeLimits[2]} év · Extrém maximum {calculatedAgeLimits[3]} év
        </small>}
      </section>
      {isHalfBlood && creationEditable && <OroklesPanel ancestry={ancestry} records={resolvedInheritance}
        onChange={(key, record) => setInheritedTraits((previous) => {
          const next = { ...previous };
          if (record) next[key] = record;
          else delete next[key];
          return next;
        })} />}
      {race && <>
        <FajiSzakosodasValaszto race={race} subrace={subrace} choices={activeSpecializations}
          onChange={setRacialSpecializations} weaponJp={creationCosts.specializationJp} stage={stage} />
        {abilityOptions.length > 0 && <section className="panel creation-panel creation-traits">
          <h3>Faji képességek</h3>
          <p>{racialRuleNotes[race]}</p>
          <div className="trait-list">{abilityOptions.map(([ability, cost, page, group, note]) => {
            const selected = selectedRacialAbilities.includes(ability);
            return <div className="trait-item" key={ability}>
              <label>
                <input type="checkbox" checked={selected} onChange={() => setSelectedRacialAbilities((previous) => {
                  const retained = previous.filter((item) => item !== ability && !(group &&
                    group !== "trükk" && group !== "mágia" && abilityOptions.some(([name, , , category]) =>
                      name === item && category === group)));
                  return selected ? retained : [...retained, ability];
                })} />
                {ability} · {cost} főértékpont
              </label>
              {selected && note && <small>{note}</small>}
              {selected && <small> Alapkönyv, {page}. o.</small>}
            </div>;
          })}</div>
          {race === "Tündérke" && <p>Az alfajhoz járó ingyenes trükkök és mágiák árát a teljes költség már tartalmazza kedvezményként.</p>}
          <p>Faji képességekre fordítva <strong>{abilityCost}</strong> főértékpont</p>
          {racialSelectionError(race, subrace, selectedRacialAbilities) &&
            <p role="status">{racialSelectionError(race, subrace, selectedRacialAbilities)}</p>}
        </section>}
        <section className="panel creation-panel">
          <h3>Főértékek</h3>
          <dl className="creation-points">
            <div><dt>Rendelkezésre áll</dt><dd>{statBudget ?? "—"}</dd></div>
            <div><dt>Felhasználva</dt><dd>{total}</dd></div>
            <div><dt>Megmaradt</dt><dd>{remaining ?? "—"}</dd></div>
          </dl>
          {statBudget == null && <p>Az életkori pontkerethez Mesélői döntés szükséges.</p>}
          {previousBudget && <small>A mentett pontkeret változatlan. Életkorváltáskor az új számítás érvényesül.</small>}
          {creationEditable && statBudget != null && remaining !== 0 && (
            <button type="button" onClick={() => {
              setStats(allocateStartingStats(limits, statBudget, perception.suggested));
              setAdjustments(characterAdjustments());
            }}>Főértékek újraelosztása a kerethez</button>
          )}
          <ul className="creation-stats">
            {attributes.map(([label, active, passive], index) => {
              const value = stats[index];
              const adjustment = adjustments[index];
              const limit = attributeAdjustmentLimit(value);
              const [min, max] = limits[index];
              return <li className="creation-stat" key={label}>
                <div className="creation-stat-line">
                  <div><strong>{label}</strong><small>Határok: {min}–{max}</small></div>
                  <div className="creation-stepper">
                    <button type="button" aria-label={label + " csökkentése"} disabled={value <= min} onClick={() => changeStat(index, -1)}>−</button>
                    <output aria-label={label}>{effectiveAttribute(creationCharacter, index)}</output>
                    <button type="button" aria-label={label + " növelése"} disabled={value >= max} onClick={() => changeStat(index, 1)}>+</button>
                  </div>
                </div>
                <dl className="creation-stat-components">
                  <div>
                    <dt>{active} <small>Aktív</small></dt>
                    <dd className="creation-stepper">
                      <button type="button" aria-label={active + " csökkentése"} disabled={adjustment <= -limit} onClick={() => changeAdjustment(index, -1)}>−</button>
                      <output aria-label={active}>{effectiveAttribute(creationCharacter, index, 1)}</output>
                      <button type="button" aria-label={active + " növelése"} disabled={adjustment >= limit} onClick={() => changeAdjustment(index, 1)}>+</button>
                    </dd>
                  </div>
                  <div>
                    <dt>{passive} <small>Passzív</small></dt>
                    <dd><output aria-label={passive}>{effectiveAttribute(creationCharacter, index, -1)}</output></dd>
                  </div>
                </dl>
              </li>;
            })}
          </ul>
        </section>
        <section className="panel creation-panel creation-traits" aria-label="Előnyök és hátrányok">
          {renderTraits(true)}
        </section>
        {actions}
      </>}
    </div>;
  }
  const creationActions = (
    <div className="skills-actions">
      <button className="save" onClick={checkCharacter}>KARAKTER ELLENŐRZÉSE</button>
      <button className="save" onClick={saveCharacter}>KARAKTER MENTÉSE</button>
    </div>
  );
  const selectingForPlay = page === "jatek";
  const playingCharacters = savedCharacters.filter((character) => character.playStatus === "playing");

  return (
    <div className="app test-app">
      <main className={page === "fomenu" ? "home-screen" : "workspace-screen"}>
        {saveBlocked && <p role="alert">A helyi karaktermentés nem írható felül. A betölthető karaktereken végzett
          módosítások csak az aktuális munkamenetben érhetők el.</p>}
        {page === "fomenu" ? (
          <MainMenu characters={savedCharacters} adventure={adventure}
            onNew={() => navigate("alkotas", null)} onLoad={openMenuCharacter}
            onEdit={(character) => openMenuCharacter(character, true)} onDelete={startDelete}
            onSheet={openPlayerCharacter} onSettings={() => navigate("test-settings", null)} onChat={openMenuChat}
            onPlay={() => navigate("jatek", null)} onSaved={() => navigate("karakterek", null)}
            onGM={() => selectTestMode("km")} />
        ) : (
          <nav className="workspace-nav" aria-label="Visszalépés">
            {page !== "test-settings" && <button type="button" onClick={() => navigate("test-settings", null)}>Beállítások</button>}
            {testMode && page !== "test-adventure" &&
              <button type="button" onClick={() => navigate("test-adventure", null)}>Kaland</button>}
            {page !== "karakterek" && (
              <button type="button" onClick={() => navigate("karakterek", null)}>Mentett karakterek</button>
            )}
          </nav>
        )}
        {page === "test-settings" && <Suspense fallback={<p role="status">Beállítások betöltése…</p>}><TestSettings mode={testMode} onMode={selectTestMode}
          onHome={() => {
            if (window.confirm("Visszatérsz a főmenübe?")) {
              if (navigate("fomenu", null)) {
                setTestMode(null);
                setAdventureCharacterId(null);
              }
            }
          }} onExport={exportCharacters} onImport={importCharacters} /></Suspense>}
        {page === "test-adventure" && <Suspense fallback={<p role="status">Kaland betöltése…</p>}>
          {(adventure.blocked || adventureWriteFailed) && <p role="alert">A kaland adatai csak az aktuális munkamenetben módosíthatók.</p>}
          <TestMode key={testMode} mode={testMode} initialTab={adventureTabOnOpen} initialCharacterId={adventureCharacterId} characters={savedCharacters.some(({ id }) => String(id) === sampleCharacter.id)
            ? playingCharacters : [...playingCharacters, sampleCharacter]}
            adventure={adventure} onChange={updateAdventure} onSelectMode={selectTestMode} onOpenCharacter={openTestCharacter} />
        </Suspense>}
        {page === "alkotas" && (
        <div className={creationTab === "details" ? "creation-workspace compact-creation" : "creation-workspace"} style={ancestryTheme(race, subrace)}>
          <header className="character-cover creation-cover">
            <div className="character-cover-art" aria-hidden="true" />
            <div className="character-cover-caption">
              <h2>Karakteralkotás</h2>
              {race && <p>{[race, subrace].filter(Boolean).join(" · ")}</p>}
            </div>
          {selectedCharacterId !== null && (
            <button className="save" onClick={() => navigate("alkotas", null)}>
              Új karakter
            </button>
          )}

        </header>

        {creationEditable && (
          <nav className="workspace-nav" aria-label="A karakteralkotás részei">
            <button type="button" aria-pressed={creationTab === "details"} onClick={() => openCreationTab("details")}>Karakteradatok</button>
            <button type="button" aria-pressed={creationTab === "skills"} onClick={() => openCreationTab("skills")}>Jártasságok</button>
            <button type="button" aria-pressed={creationTab === "equipment"} onClick={() => openCreationTab("equipment")}>Felszerelés</button>
            <button type="button" aria-pressed={creationTab === "magic"} onClick={() => openCreationTab("magic")}>Mágia</button>
          </nav>
        )}
        {creationEditable && creationTab === "skills"
          ? <><AlkotasiJartassagok character={creationCharacter} budget={creationBudget} costs={creationCosts} grants={creationGrants} racialGrants={racialSkills}
            trainingGrants={trainingGrants} onPackageChange={changeTrainingPackage}
            original={creationOriginal} onAcademicCodex={(codex) => {
              const academicSpecialization = selectAcademicCodex(creationCharacter.magic?.academicSpecialization, codex);
              if (!validAcademicSpecialization(academicSpecialization) ||
                  !window.confirm("A Kalandmester jóváhagyta az akadémikus szakosodás módosítását?")) return;
              setCreationExtras((previous) => ({ ...previous, magic: { ...creationCharacter.magic, academicSpecialization } }));
            }} onChange={changeCreationSkill} onClarify={clarifyCreationSkill} />
          {creationActions}</>
          : creationEditable && creationTab === "equipment"
            ? <><AlkotasiFelszereles equipment={creationCharacter.equipment}
              onChange={(equipment) => setCreationExtras((previous) => ({ ...previous, equipment }))} />{creationActions}</>
          : creationEditable && creationTab === "magic"
            ? <Suspense fallback={<p role="status">Varázskönyv betöltése…</p>}><CreationSection key="magic" Editor={Magia} character={creationCharacter}
              onSave={(magic) => setCreationExtras((previous) => ({ ...previous, magic }))} />{creationActions}</Suspense>
          : renderCharacterFields(creationActions)}
        </div>)}
        {page === "karakterlap" && (
          <Suspense fallback={<p role="status">Karakterlap betöltése…</p>}><Karakterlap key={selectedCharacterId} initialEditing={sheetEditingOnOpen}
            character={selectedCharacter}
            stage={ageStage(selectedCharacter?.age, selectedCharacter?.ancestry?.parents?.length === 2
              ? getAncestryAgeLimits(selectedCharacter.ancestry) : ageLimits[selectedCharacter?.race])}
            onSaveSkills={saveSkills}
            onSaveEquipment={saveEquipment} onSaveMagic={saveMagic}
            onStartCharacterEdit={() => loadCharacter(selectedCharacter)}
            onFinalizeCharacterEdit={() => !characterFieldsChanged || saveCharacter({ notify: false })}
            onChangeHealth={(amount) => updateHealth(selectedCharacterId, amount)}
            characterEditor={{
              changed: characterFieldsChanged,
              stats, adjustments, limits, remaining, stage, notes, setNotes,
              changeStat, changeAdjustment,
              name: <input aria-label="Karakter neve" value={name} onChange={(event) => setName(event.target.value)} />,
              religion: <VallasValaszto value={religion} original={creationFields(selectedCharacter).religion} onChange={setReligion} />,
              race: renderRaceSelector(),
              age: race && calculatedAgeLimits ? renderAgeSelector() : null,
              ancestry: isHalfBlood ? renderAncestryFields() : null,
              ageOptions: renderAgePointOptions(),
              renderTraits,
            }}
            confirmLeaving={confirmLeaving}
          /></Suspense>
        )}
        {(page === "karakterek" || selectingForPlay) && (
          <section className="panel" aria-labelledby="saved-characters-title">
            <h2 id="saved-characters-title">{selectingForPlay ? "Válassz karaktert a játékhoz" : "Karakterbetöltés"}</h2>
            <p>{selectingForPlay ? "A játékba helyezett karakterek karakterlapja innen nyitható meg."
              : "A tervezetek a karakteralkotásban szerkeszthetők. A már játékba helyezett karakterek a karakterlapon kezelhetők."}</p>
            {activationFeedback && <p role={activationFeedback.error ? "alert" : "status"}>{activationFeedback.text}</p>}
            {savedCharacters.length === 0 && <p>Nincs mentett karakter.</p>}
            {savedCharacters.map((character) => (
              <article key={character.id} className="attribute">
                <h3>{character.name}</h3>
                <p>{[character.race, character.age != null && `${character.age} éves`].filter(Boolean).join(" · ")}</p>
                <p>Állapot: <strong>{character.playStatus === "playing" ? "Játékban"
                  : character.playStatus === "draft" ? "Tervezet" : "Régi mentés · besorolásra vár"}</strong></p>
                {character.playStatus === "draft" && <>
                  {!selectingForPlay && <button className="save" type="button" onClick={() => navigate("alkotas", character)}>Karakter szerkesztése</button>}
                  <button className="save" type="button" onClick={() => setPlayStatus(character, "playing")}>Játékba helyezés</button>
                </>}
                {character.playStatus === "playing" && <>
                  <button className="save" type="button" onClick={() => selectingForPlay
                    ? openPlayerCharacter(character) : navigate("karakterlap", character)}>Karakterlap megnyitása</button>
                  {!selectingForPlay && <>
                    <button className="save" type="button" onClick={() => openAdventureFor(character)}>Kaland megnyitása</button>
                    <button className="save" type="button" onClick={() => startDelete(character)}>Karakter eltávolítása</button>
                  </>}
                </>}
                {character.playStatus == null && <>
                  <button className="save" type="button" onClick={() => setPlayStatus(character, "draft")}>Még nem játszott</button>
                  <button className="save" type="button" onClick={() => setPlayStatus(character, "playing")}>Már játékban volt</button>
                </>}
              </article>
            ))}
          </section>
        )}
{deletingCharacter && (
  <div className="modal-overlay">
    <section className="modal-panel">
      {deleteStep === 1 && (
        <>
          <h2>Biztosan törlöd?</h2>
          <p>
            Biztos törölni akarod {deletingCharacter.name} karaktert?
          </p>
          <button className="save" onClick={confirmDelete}>
            Igen, tovább
          </button>
          <button
            className="save"
            onClick={() => {
              setDeletingCharacter(null);
              setDeleteStep(0);
            }}
          >
            Mégsem
          </button>
        </>
      )}

      {deleteStep === 2 && (
        <>
          <h2>Nem gondoltad meg magad?</h2>
          <p>{deletingCharacter.name} sorsa a te kezedben van.</p>
          <button className="save" onClick={characterDied}>
            Meghalt
          </button>
          <button className="save" onClick={characterSurvived}>
            Életben marad
          </button>
        </>
      )}
    </section>
  </div>
)}

{farewellMessage && (
  <div className="modal-overlay">
    <section className="modal-panel">
    <h2>Búcsú a kaland végén</h2>
    <p>{farewellMessage}</p>
    <button className="save" onClick={() => setFarewellMessage("")}>
      Bezárás
    </button>
  </section>
</div>)}</main>
   
    </div>
  );
}


export default App;
