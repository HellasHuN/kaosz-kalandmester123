import { devotionError, devotionSkill } from "./elhivatottsag.js";
import ElhivatottsagValaszto from "./ElhivatottsagValaszto.jsx";
import { useImperativeHandle, useRef, useState } from "react";
import { codexTheorySkills, jpKoltsegek } from "./jpKoltsegek.js";
import { cancelTraining, changeDevotionInPlay, committedJp, completeTraining, relatedAttribute, serializeSkills, skillRows, trainingQuote } from "./jartassagFejlesztes.js";
import { firstInvalidSkillChange, learningMethods, skillPrerequisiteMessage } from "./jartassagElofeltetelek.js";
import { maxHealth } from "./eletero.js";
import { packageGrants } from "./kepzesiCsomagok.js";
import { artSkillName, clarifySpecialization, genericSpecializations, hasWeaponFoundation, racialWeaponTraining, specialization, specializationLearningRank,
  specializationNames, specializationRefinementOptions } from "./jartassagSzakosodasok.js";
import "./Jartassagok.css";

const codexNames = new Set(Object.values(codexTheorySkills));
const ordinarySkills = Object.keys(jpKoltsegek).filter((name) => name !== "Mágiaelmélet" && !codexNames.has(name) &&
  !genericSpecializations.has(name));
const icons = { Fizikum: 0, Rátermettség: 1, Ügyesség: 3, Reflex: 4, Tudat: 9, Intelligencia: 8, Lelkierő: 14, Esszencia: 11, Varázserő: 11 };
const blank = { level: 0, prices: [], note: "", estimated: false, training: null };

export default function Jartassagok({ character, onSave, ref }) {
  const [draft, setDraft] = useState(null);
  const [query, setQuery] = useState("");
  const [candidate, setCandidate] = useState("");
  const [method, setMethod] = useState("mentor");
  const [clarifiedCharacter, setClarifiedCharacter] = useState(null);
  const [scroll, setScroll] = useState(0);
  const table = useRef(null);
  const original = clarifiedCharacter ?? character;
  const trainingGrants = packageGrants(original.trainingPackages);
  const racialWeapon = racialWeaponTraining(original);
  const saved = skillRows(original);
  const rows = draft ?? saved;
  const editing = draft !== null;
  const changed = editing && (clarifiedCharacter !== null || JSON.stringify(rows) !== JSON.stringify(saved));
  const remaining = (character.jp ?? 0) + committedJp(saved) - committedJp(rows);
  const acquired = Object.fromEntries(Object.entries(rows).map(([name, row]) => [name, row.level]));
  const skillCharacter = { ...original, skills: acquired,
    skillFoundations: Object.fromEntries(Object.entries(rows).map(([name, row]) => [name, row.foundation])) };
  const quote = candidate ? trainingQuote(skillCharacter, candidate, rows[candidate]?.level ?? 0, method) : null;
  const prerequisite = quote ? skillPrerequisiteMessage(acquired, candidate, quote.level, skillCharacter) : "";
  const methods = candidate ? learningMethods(candidate, specializationLearningRank(candidate, acquired[candidate] ?? 0, skillCharacter),
    rows[candidate]?.foundation) : [];
  const search = query.trim().toLocaleLowerCase("hu");
  const choices = [...ordinarySkills, ...codexNames, ...specializationNames].filter((name) =>
    !rows[name]?.level && !rows[name]?.training && trainingQuote(skillCharacter, name, 0) &&
    hasWeaponFoundation(skillCharacter, specialization(name)) &&
    !(rows.Művészet?.level && name === artSkillName(character.racialSpecializations?.artGenre) &&
      character.race === "Elf" && character.subrace === "Erdei elf") &&
    search && name.toLocaleLowerCase("hu").includes(search));

  function setTableScroll(value) {
    const target = table.current;
    target.scrollTop = value * (target.scrollHeight - target.clientHeight) / 100;
  }

  function cancel() {
    setDraft(null);
    setClarifiedCharacter(null);
    setQuery("");
    setCandidate("");
  }

  function clarify(name, next) {
    if (Object.hasOwn(rows, next)) return;
    const renamed = clarifySpecialization(original, name, next);
    if (!renamed) return;
    setClarifiedCharacter(renamed);
    setDraft(Object.fromEntries(Object.entries(rows).map(([key, value]) => [key === name ? next : key, value])));
    if (candidate === name) setCandidate("");
  }

  function chooseTraining(name) {
    setMethod("mentor");
    setCandidate(name);
  }

  function update(name, change) {
    setDraft((previous) => ({ ...previous, [name]: change(previous[name] ?? blank) }));
  }

  function startTraining(event) {
    event.preventDefault();
    if (!quote || prerequisite || quote.cost > remaining || rows[candidate]?.training) return;
    const fields = new FormData(event.currentTarget);
    const mentor = Number(fields.get("mentor"));
    if (!fields.has("verified") || (method === "mentor" &&
        (!Number.isSafeInteger(mentor) || mentor < quote.mentorLevel || mentor > 10))) return;
    update(candidate, (row) => ({ ...row, training: {
      level: quote.level, cost: quote.cost, method, ...(method === "mentor" && { mentor }), ...(quote.relearn && { relearn: true }),
      ...(quote.from && { from: quote.from }),
    } }));
    setCandidate("");
    setQuery("");
  }

  function approve(name) {
    const training = saved[name]?.training;
    if (!training || rows[name]?.training !== training) return;
    const error = skillPrerequisiteMessage(acquired, name, training.level, skillCharacter);
    if (error) { window.alert(error); return; }
    const mentor = training?.method == null || training.method === "mentor";
    if (!window.confirm(mentor
      ? "Kalandmesteri jóváhagyás. Teljesültek a tanulás előfeltételei, és sikeres volt az Oktatás próba?"
      : "Kalandmesteri jóváhagyás. Az alapkönyv szerinti gyakorlás és minden előfeltétel teljesült?")) return;
    update(name, (row) => completeTraining(row, name));
  }

  function withdrawTraining(name) {
    setDraft((previous) => {
      const row = cancelTraining(previous[name]);
      const next = { ...previous, [name]: row };
      if (!row.level && !row.note && !row.sunk) delete next[name];
      return next;
    });
  }

  function save() {
    if (remaining < 0 && changed) {
      window.alert("A módosításokhoz nincs elég Jp.");
      return false;
    }
    if (candidate) {
      window.alert("Indítsd el a kiválasztott fejlesztést, vagy zárd be a fejlesztési űrlapot.");
      return false;
    }
    if (changed) {
      const [levels, paid, byLevel, estimated, training, notes, foundations, sunk] = serializeSkills(rows);
      const nextMaximum = maxHealth({ ...original, skills: levels,
        skillEffectBaseline: original.skillEffectBaseline ?? original.skills ?? {} });
      if (nextMaximum < maxHealth(character) && character.currentFp > nextMaximum) {
        window.alert("Előbb csökkentsd az aktuális életerőt az új maximumra.");
        return false;
      }
      const invalid = firstInvalidSkillChange(levels, original.skills, skillCharacter, original) ||
        Object.entries(training).map(([name, record]) => {
          const previous = original.skillTraining?.[name];
          return previous && skillPrerequisiteMessage(original.skills, name, previous.level, original) ? ""
            : skillPrerequisiteMessage(levels, name, record.level, skillCharacter);
        }).find(Boolean);
      if (invalid) { window.alert(invalid); return false; }
      onSave(character, levels, remaining, paid, byLevel, estimated, training, notes, foundations, sunk, original);
    }
    cancel();
    return true;
  }

  useImperativeHandle(ref, () => ({ start: () => setDraft(saved), save, cancel }));

  return (
    <section className="skills-reference" data-unsaved={changed || Boolean(candidate)}>
      <h2>Jártasságok</h2>
      <div className="skills-reference-table-frame">
      <div className="skills-reference-scroll" ref={table} tabIndex={0} aria-label="Jártasságtáblázat görgetése"
        onScroll={(event) => {
          const target = event.currentTarget;
          setScroll(target.scrollHeight > target.clientHeight
            ? target.scrollTop * 100 / (target.scrollHeight - target.clientHeight) : 0);
        }}>
        <table>
          <colgroup><col /><col /><col /><col /><col /></colgroup>
          <thead><tr>
            <th scope="col">Jártasság</th><th scope="col">Kapcsolódó főérték</th><th scope="col">Aktuális szint</th>
            <th scope="col">Fejlesztés (következő szint)</th><th scope="col">Megjegyzés</th>
          </tr></thead>
          <tbody>
            {Object.entries(rows).filter(([, row]) => row.level || row.training || row.note).map(([name, row]) => {
              const attribute = relatedAttribute(name);
              const next = !genericSpecializations.has(name) && trainingQuote(skillCharacter, name, row.level);
              const item = specialization(name);
              const unknownWeaponBranches = name === "Fegyverforgatás" && row.level > 1;
              const minimum = Math.max(specializationLearningRank(name, 0, skillCharacter) + 1, original.creationRacialSkills?.[name] ?? 0, trainingGrants[name] ?? 0);
              const hasBranches = Object.entries(rows).some(([key, value]) =>
                specialization(key)?.foundation === name && (value.level || value.training));
              const refinements = editing && genericSpecializations.has(name)
                ? specializationRefinementOptions(original, name).filter((key) => !Object.hasOwn(rows, key)) : [];
              return <tr key={name}>
                <th scope="row">
                  <span className="skill-reference-icon" aria-hidden="true" style={{ "--skill-icon": icons[attribute] ?? 8 }} />
                  {name}
                  {trainingGrants[name] > 0 && <small> · Csomagszint {trainingGrants[name]}</small>}
                  {item?.group && <small> ({item.group})</small>}
                  {item && row.level > 0 && <small> · {row.prices.reduce((sum, amount) => sum + amount, 0)} Jp</small>}
                  {unknownWeaponBranches && <small> · A mentett támadó- és védőszint pontosítása szükséges</small>}
                  {refinements.length > 0 && <select value="" aria-label={`${name} szakosodás pontosítása`}
                    onChange={(event) => clarify(name, event.target.value)}>
                    <option value="">Szakosodás pontosítása</option>
                    {refinements.map((key) => <option key={key}>{key}</option>)}
                  </select>}
                </th>
                <td>{attribute ?? "—"}</td>
                <td className="skill-reference-centered">
                  {editing && name !== devotionSkill && !unknownWeaponBranches && !row.training && row.level > minimum ? (
                    <select aria-label={`${name} szintcsökkentése`} value={row.level} onChange={(event) => {
                      const level = Number(event.target.value);
                      update(name, (previous) => ({ ...previous, level, prices: previous.prices.slice(0, level) }));
                    }}>
                      {Array.from({ length: row.level - minimum + 1 }, (_, index) => <option key={index + minimum}>{index + minimum}</option>)}
                    </select>
                  ) : <span className="skill-reference-level">{row.level || "—"}</span>}
                </td>
                <td className="skill-reference-centered">
                  {row.training ? <>
                    <span className="skill-reference-progress"><span aria-hidden="true">⌛</span> Folyamatban → {row.training.level}</span>
                    {editing && saved[name]?.training === row.training && <button type="button" onClick={() => approve(name)}>Jóváhagyás</button>}
                    {editing && <button type="button" onClick={() => withdrawTraining(name)}>Fejlesztés visszavonása</button>}
                  </> : editing && next
                    ? <button type="button" disabled={next.cost > remaining} onClick={() => chooseTraining(name)}>
                      {next.relearn ? "Mentoros újratanulás" : `Indítás → ${next.level}`} · {next.cost} Jp</button>
                    : "—"}
                </td>
                <td>{editing ? <>
                  <input aria-label={`${name} megjegyzése`} maxLength={120} value={row.note}
                    onChange={(event) => {
                      const note = event.target.value;
                      update(name, (previous) => ({ ...previous, note }));
                    }} />
                  {name !== devotionSkill && !unknownWeaponBranches && !row.training && !hasBranches && !original.creationRacialSkills?.[name] && !trainingGrants[name] && row.level > 0 && <button type="button" aria-label={`${name} eltávolítása`}
                    onClick={() => setDraft((previous) => {
                      const next = { ...previous };
                      if (row.sunk) next[name] = { ...blank, sunk: row.sunk };
                      else delete next[name];
                      return next;
                    })}>
                    ×
                  </button>}
                </> : row.note || "—"}</td>
              </tr>;
            })}
            {racialWeapon && <tr><th scope="row">{racialWeapon.name}</th><td>Rátermettség</td>
              <td>Támadás {racialWeapon.attack} · Védekezés {racialWeapon.defense}</td><td>—</td>
              <td>{original.racialSpecializationJp ?? "—"} Jp · Faji szakosodás</td></tr>}
            {!racialWeapon && !Object.values(rows).some((row) => row.level || row.training || row.note) && <tr><td colSpan={5}>Nincs rögzített jártasság.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="skill-reference-scroll-controls">
        <button type="button" aria-label="Görgetés felfelé" onClick={() => table.current.scrollBy(0, -100)}>▴</button>
        <input type="range" aria-label="Jártasságlista görgetési helyzete" min="0" max="100" step="any"
          value={scroll} onChange={(event) => setTableScroll(Number(event.target.value))} />
        <button type="button" aria-label="Görgetés lefelé" onClick={() => table.current.scrollBy(0, 100)}>▾</button>
      </div>
      </div>
      <p className="skill-reference-budget" aria-live="polite">Elkölthető Jp <strong>{remaining}</strong></p>
      {editing && <>
        <ElhivatottsagValaszto level={rows[devotionSkill]?.level ?? 0} maximum={10}
          onChange={(level, approved) => {
            const error = devotionError(original, level, approved);
            if (error) { window.alert(error); return; }
            update(devotionSkill, (row) => changeDevotionInPlay(original, row, level, approved));
          }} />
        {quote && <form className="skill-reference-training" key={candidate} onSubmit={startTraining}>
          <strong>{candidate} · {quote.level}. szint · {quote.cost} Jp</strong>
          {prerequisite && <p role="status">{prerequisite}</p>}
          <label>Tanulás módja
            <select value={method} onChange={(event) => setMethod(event.target.value)}>
              <option value="mentor">Mentorral</option>
              {methods.includes("practice") && <option value="practice">Gyakorlással (Gy)</option>}
              {methods.includes("practice-foundation") &&
                <option value="practice-foundation">Önálló alapozás (M/1, háromszoros ár)</option>}
              {methods.includes("practice-after-mentor") && <option value="practice-after-mentor">Gyakorlással, a mentor által tanított alapokra (M/1)</option>}
            </select>
          </label>
          {method === "practice-foundation" && <p>A továbblépéshez mentorral újra kell tanulni az első szintet. Az önálló alapozás ára ekkor elvész.</p>}
          {method === "mentor" && <label>A mentor jártasságszintje
            <input type="number" name="mentor" min={quote.mentorLevel} max="10" step="1" required />
          </label>}
          <label className="magic-checkbox"><input type="checkbox" name="verified" required />
            {method === "mentor" ? "A Kalandmester ellenőrizte a jártasság előfeltételeit és a mentor Oktatás jártasságát."
              : "A Kalandmester a jártasság tanulási kódját, az előfeltételeket és a gyakorlás lehetőségét ellenőrizte."}
          </label>
          <button type="submit" disabled={!!prerequisite || quote.cost > remaining}>Fejlesztés indítása</button>
          <button type="button" onClick={() => setCandidate("")}>Mégse</button>
        </form>}
        <label htmlFor="skill-search">Új jártasság keresése</label>
        <input id="skill-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} />
        {choices.length > 0 && <ul className="skills-results">
          {choices.map((name) => <li key={name}><button type="button" onClick={() => chooseTraining(name)}>{name}</button></li>)}
        </ul>}
      </>}
    </section>
  );
}
