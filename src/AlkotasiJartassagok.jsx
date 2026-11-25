import { useState } from "react";
import { skillPrices } from "./jpSzamitas.js";
import { relatedAttribute } from "./jartassagFejlesztes.js";
import { creationSkillLimit, creationSkillNames } from "./alkotasiJartassagok.js";
import { magicLimits } from "./magiaSzabalyok.js";
import { characterSpeed } from "./gyorsasag.js";
import { withEffectiveStrength } from "./karakterFoeertekek.js";
import InduloJartassagEngedelyek from "./InduloJartassagEngedelyek.jsx";
import KepzesiCsomagValaszto from "./KepzesiCsomagValaszto.jsx";
import { gilfFreeTheory } from "./gilfMagia.js";
import { artSkillName, genericSpecializations, hasWeaponFoundation, racialWeaponTraining, specialization,
  specializationLearningRank, specializationRefinementOptions } from "./jartassagSzakosodasok.js";
import "./Jartassagok.css";

export default function AlkotasiJartassagok({ character, budget, costs, grants, trainingGrants, onChange, onClarify, onApprovalsChange, onPackageChange }) {
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const search = query.trim().toLocaleLowerCase("hu");
  const racialWeapon = racialWeaponTraining(character);
  const choices = search ? creationSkillNames.filter((name) =>
    (name !== gilfFreeTheory || character.race === "Gilf") &&
    !Object.hasOwn(character.skills, name) && !character.skillTraining?.[name] &&
    hasWeaponFoundation(character, specialization(name)) &&
    !(specialization(name)?.base === "Fegyverforgatás" && !specialization(name).branch &&
      racialWeapon?.id === specialization(name).id) &&
    !(character.skills.Művészet && character.race === "Elf" && character.subrace === "Erdei elf" &&
      name === artSkillName(character.racialSpecializations?.artGenre)) &&
    name.toLocaleLowerCase("hu").includes(search)) : [];
  const remaining = budget == null ? null : budget - costs.total;
  const { shield, release } = magicLimits(character);
  const speed = characterSpeed(withEffectiveStrength(character));

  function change(name, level) {
    const error = onChange(name, level);
    setMessage(error);
    if (!error) setQuery("");
  }

  return (
    <div className="skills-reference-page">
      <section className="skills-reference" aria-labelledby="creation-skills-title">
        <h2 id="creation-skills-title">Jártasságok</h2>
        <div className="skills-reference-scroll">
          <table>
            <thead><tr><th>Jártasság</th><th>Kapcsolódó érték</th><th>Szint</th><th>Kifizetett Jp</th><th>Művelet</th></tr></thead>
            <tbody>
              {Object.entries(character.skills).map(([name, level]) => {
                const editable = creationSkillNames.includes(name) && !character.skillTraining?.[name];
                const item = specialization(name);
                const minimum = Math.max(grants[name] ?? 0, specializationLearningRank(name, 0, character) + 1);
                const racial = character.racialSpecializations;
                const scope = name === "Művészet" && character.subrace === "Erdei elf" ? racial?.artGenre
                  : name === "Vadászat" && racial?.waterHunting ? "vízi vadászat"
                    : name === "Íjászat" && character.race === "Gennymanó" &&
                      racial?.weaponType !== "Közelharci fegyver" ? racial?.weaponType : item?.group;
                const refinements = genericSpecializations.has(name) ? specializationRefinementOptions(character, name) : [];
                return (
                <tr key={name}>
                  <th scope="row">{name}{scope && <small> ({scope})</small>}
                    {refinements.length > 0 && <select value="" aria-label={`${name} szakosodás pontosítása`}
                      onChange={(event) => setMessage(onClarify(name, event.target.value))}>
                      <option value="">Szakosodás pontosítása</option>
                      {refinements.map((key) => <option key={key}>{key}</option>)}
                    </select>}
                  </th>
                  <td>{relatedAttribute(name) ?? "—"}</td>
                  <td>{editable ? <select aria-label={`${name} szintje`} value={level}
                    onChange={(event) => change(name, Number(event.target.value))}>
                    {skillPrices(name).map((_, index) => index + 1)
                      .filter((option) => option >= minimum && (option <= Math.max(minimum, creationSkillLimit(character, name)) || option === level))
                      .map((option) => <option key={option}>{option}</option>)}
                  </select> : level}</td>
                  <td>{costs.skillJpPaid[name] ?? "—"}</td>
                  <td>{trainingGrants[name] ? `Képzési csomag · ${trainingGrants[name]}. szint` : grants[name] ? "Faji jártasság"
                    : editable ? <button type="button" aria-label={`${name} törlése`} onClick={() => change(name, 0)}>×</button>
                    : character.skillTraining?.[name] ? "Folyamatban" : "—"}</td>
                </tr>
              ); })}
              {racialWeapon && <tr><th scope="row">{racialWeapon.name}</th><td>Rátermettség</td>
                <td>Támadás {racialWeapon.attack} · Védekezés {racialWeapon.defense}</td>
                <td>{costs.specializationJp}</td><td>Faji szakosodás</td></tr>}
              {!racialWeapon && !Object.keys(character.skills).length && <tr><td colSpan={5}>Nincs felvett jártasság.</td></tr>}
            </tbody>
          </table>
        </div>
        <p aria-live="polite">Elkölthető Jp <strong>{remaining ?? "—"}</strong></p>
        {remaining == null && <p>Add meg a karakter életkorát és a hozzá tartozó pontkeretet.</p>}
        {remaining < 0 && <p role="alert">A jártasságok költsége meghaladja az induló Jp-keretet.</p>}
        {message && <p role="status">{message}</p>}
        <p>Esszenciapajzs maximuma <strong>{shield}</strong> · Felszabadítható Ep <strong>{release}</strong> · Gyorsaság <strong>{speed.value ?? "—"}</strong></p>
        {character.race === "Gilf" && <p>A szabad Mágiaelmélet és a szabad Mágiahasználat induló plafonja 4. szint.
          Az Esszenciafelszabadítás induló plafonja 2. szint.</p>}
        <InduloJartassagEngedelyek character={character} onChange={onApprovalsChange} />
        <KepzesiCsomagValaszto character={character} onChange={onPackageChange} />
        <label htmlFor="creation-skill-search">Új jártasság keresése</label>
        <input id="creation-skill-search" type="search" value={query} disabled={remaining == null}
          onChange={(event) => { setQuery(event.target.value); setMessage(""); }} />
        {choices.length > 0 && <ul className="skills-results">
          {choices.map((name) => <li key={name}><button type="button"
            onClick={() => change(name, specializationLearningRank(name, 0, character) + 1)}>{name}</button></li>)}
        </ul>}
      </section>
    </div>
  );
}
