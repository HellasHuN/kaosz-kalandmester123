import { devotionSkill } from "./elhivatottsag.js";
import ElhivatottsagValaszto from "./ElhivatottsagValaszto.jsx";
import { useState } from "react";
import { skillPrices } from "./jpSzamitas.js";
import { relatedAttribute } from "./jartassagFejlesztes.js";
import { creationSkillLimit, creationSkillNames, quoteCreationSkill } from "./alkotasiJartassagok.js";
import { magicLimits } from "./magiaSzabalyok.js";
import { characterSpeed } from "./gyorsasag.js";
import { withEffectiveStrength } from "./karakterFoeertekek.js";
import KepzesiCsomagValaszto from "./KepzesiCsomagValaszto.jsx";
import { academicUse, generalTheory, legacyTheoryNames, legacyTheoryRank } from "./teszt/academic.js";
import AkademikusKodexValaszto from "./AkademikusKodexValaszto.jsx";
import { artSkillName, genericSpecializations, hasWeaponFoundation, racialWeaponTraining, specialization,
  specializationLearningRank, specializationRefinementOptions } from "./jartassagSzakosodasok.js";
import "./Jartassagok.css";

export default function AlkotasiJartassagok({ character, budget, costs, grants, racialGrants, trainingGrants, original, onChange, onClarify, onPackageChange, onAcademicCodex }) {
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(null);
  const search = query.trim().toLocaleLowerCase("hu");
  const racialWeapon = racialWeaponTraining(character);
  const choices = search ? creationSkillNames.filter((name) =>
    name.toLocaleLowerCase("hu").includes(search) &&
    !Object.hasOwn(character.skills, name) && !character.skillTraining?.[name] &&
    levelsFor(name).length > 0 && hasWeaponFoundation(character, specialization(name)) &&
    !(specialization(name)?.base === "Fegyverforgatás" && !specialization(name).branch &&
      racialWeapon?.id === specialization(name).id) &&
    !(character.skills.Művészet && character.race === "Elf" && character.subrace === "Erdei elf" &&
      name === artSkillName(character.racialSpecializations?.artGenre))) : [];
  const remaining = budget == null ? null : budget - costs.total;
  const { shield, release } = magicLimits(character);
  const speed = characterSpeed(withEffectiveStrength(character));

  const acquired = Object.entries(character.skills).filter(([name]) => name !== devotionSkill);
  const pendingLevels = pending && levelsFor(pending.name);
  const pendingPrice = pending && quoteCreationSkill(character, budget, pending.name, pending.level, original).cost;

  function levelsFor(name, current) {
    const theoryFloor = name === generalTheory ? legacyTheoryRank(character.skills) + 1 : 1;
    const floor = Math.max(grants[name] ?? 0, specializationLearningRank(name, 0, character) + 1, theoryFloor);
    const ceiling = creationSkillLimit(character, name);
    return skillPrices(name).map((_, index) => index + 1)
      .filter((level) => level === current || (level >= floor && level <= ceiling));
  }

  function select(name) {
    setPending({ name, level: levelsFor(name)[0] });
    setQuery("");
    setMessage("");
  }

  function add() {
    if (Object.hasOwn(character.skills, pending.name)) {
      setMessage("Ez a jártasság már szerepel a felvett jártasságok között.");
      return;
    }
    const error = onChange(pending.name, pending.level);
    setMessage(error);
    if (!error) setPending(null);
  }

  function change(name, level, approved = false) {
    setMessage(onChange(name, level, approved));
  }

  return (
    <div className="skills-reference-page creation-skills">
      <section className="skills-reference" aria-labelledby="creation-skills-title">
        <h2 id="creation-skills-title">Jártasságok</h2>
        <p className="creation-skill-balance" aria-live="polite">Elkölthető Jp <strong>{remaining ?? "—"}</strong></p>
        {remaining == null && <p>Add meg a karakter életkorát és a hozzá tartozó pontkeretet.</p>}
        {remaining < 0 && <p role="alert">A jártasságok költsége meghaladja az induló Jp-keretet.</p>}
        <label htmlFor="creation-skill-search">Új jártasság keresése</label>
        <input id="creation-skill-search" type="search" value={query} disabled={remaining == null}
          onChange={(event) => { setQuery(event.target.value); setMessage(""); }} />
        {search && (choices.length ? <ul className="skills-results">
          {choices.map((name) => <li key={name}><button type="button" onClick={() => select(name)}>{name}</button></li>)}
        </ul> : <p>Nincs választható találat.</p>)}
        {pending && <section className="creation-skill-pending" aria-labelledby="pending-skill-title">
          <h3 id="pending-skill-title">Kiválasztva: {pending.name}</h3>
          <label>Választott szint
            <select value={pending.level} onChange={(event) => {
              setPending({ ...pending, level: Number(event.target.value) });
              setMessage("");
            }}>
              {pendingLevels.map((level) => <option key={level} value={level}>{level}. szint</option>)}
            </select>
          </label>
          <p aria-live="polite">Költség <strong>{pendingPrice == null ? "—" : `${pendingPrice} Jp`}</strong></p>
          <div className="creation-skill-controls">
            <button type="button" onClick={add}>Hozzáadás</button>
            <button type="button" onClick={() => { setPending(null); setMessage(""); }}>Mégse</button>
          </div>
        </section>}
        {message && <p role="status">{message}</p>}
        <div className="skills-reference-scroll">
          <table>
            <thead><tr><th>Jártasság</th><th>Szint</th><th>Kifizetett Jp</th></tr></thead>
            <tbody>
              {acquired.map(([name, level]) => {
                const editable = creationSkillNames.includes(name) && !character.skillTraining?.[name];
                const item = specialization(name);
                const racial = character.racialSpecializations;
                const scope = name === "Művészet" && character.subrace === "Erdei elf" ? racial?.artGenre
                  : name === "Vadászat" && racial?.waterHunting ? "vízi vadászat"
                    : name === "Íjászat" && character.race === "Gennymanó" &&
                      racial?.weaponType !== "Közelharci fegyver" ? racial?.weaponType : item?.group;
                const refinements = genericSpecializations.has(name) ? specializationRefinementOptions(character, name) : [];
                return (
                <tr key={name}>
                  <th scope="row">{name}{scope && <small> ({scope})</small>}
                    {relatedAttribute(name) && <small>{relatedAttribute(name)}</small>}
                    {legacyTheoryNames.has(name) && <small>Korábbi Mágiaelmélet-rekord</small>}
                    {name === academicUse && <AkademikusKodexValaszto specialization={character.magic?.academicSpecialization}
                      onChange={onAcademicCodex} />}
                    {racialGrants[name] && <small>Faji jártasság · {racialGrants[name]}. szint</small>}
                    {trainingGrants[name] && <small>Képzési csomag · {trainingGrants[name]}. szint</small>}
                    {character.skillTraining?.[name] && <small>Folyamatban</small>}
                    {refinements.length > 0 && <select value="" aria-label={`${name} szakosodás pontosítása`}
                      onChange={(event) => setMessage(onClarify(name, event.target.value))}>
                      <option value="">Szakosodás pontosítása</option>
                      {refinements.map((key) => <option key={key}>{key}</option>)}
                    </select>}
                  </th>
                  <td>{editable ? <><select aria-label={`${name} szintje`} value={level}
                    onChange={(event) => change(name, Number(event.target.value))}>
                    {levelsFor(name, level).map((option) => <option key={option}>{option}</option>)}
                  </select></> : level}</td>
                  <td>{costs.skillJpPaid[name] ?? "—"}{costs.estimatedSkillJp.includes(name) && <small>Hiányos előzmény</small>}
                    {!grants[name] && editable && <button type="button" aria-label={`${name} törlése`} onClick={() => change(name, 0)}>×</button>}
                  </td>
                </tr>
              ); })}
              {racialWeapon && <tr><th scope="row">{racialWeapon.name}<small>Rátermettség · Faji szakosodás</small></th>
                <td>Támadás {racialWeapon.attack} · Védekezés {racialWeapon.defense}</td><td>{costs.specializationJp}</td></tr>}
              {!racialWeapon && !acquired.length && <tr><td colSpan={3}>Nincs felvett jártasság.</td></tr>}
            </tbody>
          </table>
        </div>
        <p>Esszenciapajzs maximuma <strong>{shield}</strong> · Felszabadítható Ep <strong>{release}</strong> · Gyorsaság <strong>{speed.value ?? "—"}</strong></p>
        {remaining != null && <section className="creation-devotion" aria-label="Elhivatottság">
          <ElhivatottsagValaszto creation level={character.skills[devotionSkill] ?? 0}
            maximum={creationSkillLimit(character, devotionSkill)} onChange={(level, approved) => change(devotionSkill, level, approved)} />
        </section>}
        <KepzesiCsomagValaszto character={character} onChange={onPackageChange} />
      </section>
    </div>
  );
}
