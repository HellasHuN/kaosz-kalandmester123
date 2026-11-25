import { BookOpen, Feather, Flame, Sparkles, Sun, Zap } from "lucide-react";
import "./MagicBook.css";
import { readPercentileRoll, rollDie } from "./teszt/dice.js";
import { percentileResult } from "./teszt/trials.js";
import { logAcademicCasting, logSacredCasting, undoSacredCasting } from "./teszt/sacredCasting.js";
import { useImperativeHandle, useRef, useState } from "react";
import { academicTheoryRank } from "./teszt/academic.js";
import { codices, spells } from "./varazslatAdatok.js";
import {
  academicMagicTrial, approveLegacyReservation, availableMagicEp, finishSacredSpell, formRequirements, forms, hasCodexPermission, magicLimits, readMagic, recordAcquisition,
  freeEnergyStatus, freeMagicTrial, sacredRequestLimit, spellAccess, spellCost, spellReadiness,
  unresolvedSacredReservations, wildEnergyStatus,
} from "./magiaSzabalyok.js";

function GrimoireHeading({ id, icon: Icon, children }) {
  return <h3 id={id} className="grimoire-heading"><Icon aria-hidden="true" size={22} />{children}</h3>;
}

const states = {
  overflow: "Túlcsordulás",
  denied: "Nem elérhető", pending: "Megszerzésre vár", blocked: "Jelenleg nem használható",
  review: "Ellenőrzendő", ready: "A megadott feltételekkel használható",
};

function FreeMagicTrial({ character, difficulty }) {
  const { level, target } = freeMagicTrial(character, difficulty);
  return <span>Smaragd Tábla · {level}. jártasságszint · Célszám: {target ?? "Mesélői elbírálás"}.</span>;
}

const academicCodices = codices.filter(value => !["Praktikus mágia", "Kódexfüggetlen"].includes(value));
const academicBranches = [...new Set(spells.filter(spell => spell.codex !== "Praktikus mágia").map(spell => spell.type))].sort((a, b) =>
  a.localeCompare(b, "hu"));

function costLabel(ep) {
  if (!ep) return "—";
  if (ep.kind === "fixed") return `${ep.amount} Ep`;
  if (ep.kind === "perUnit") return `${ep.amount} Ep / ${ep.unit}${ep.maxUnits ? ` (legfeljebb ${ep.maxUnits})` : ""}`;
  return ep.label;
}

function SpellDetails({ spell, character, magic, form, gm, editing, onChange }) {
  const entry = magic.acquisitions.find((item) => item.spellId === spell.id && item.form === form);
  const [units, setUnits] = useState(entry?.units ?? "");
  const [target, setTarget] = useState(entry?.target ? (entry.target.self ? "self" : "other") : "");
  const [kg, setKg] = useState(entry?.target?.kg ?? "");
  const [conditionsConfirmed, setConfirmed] = useState(false);
  const [notice, setNotice] = useState("");
  const [manualRoll, setManualRoll] = useState("");
  const [trialResult, setTrialResult] = useState(null);
  const access = spellAccess(character, magic, spell, form);
  const context = {
    units: Number(units), conditionsConfirmed,
    target: target ? { self: target === "self", kg: Number(kg) } : undefined,
  };
  const unresolved = form === "sacred" && unresolvedSacredReservations(magic).includes(entry);
  const cost = spellCost(spell, form, context);
  const result = spellReadiness(character, magic, spell, form, context);
  const trial = form === "academic" ? academicMagicTrial(character, magic, spell, cost.difficulty) : null;
  const exception = Object.hasOwn(magic.academicExceptions ?? {}, spell.id) ? magic.academicExceptions[spell.id] : null;
  const trialSignature = JSON.stringify([trial?.target, cost.ep, context.units, context.target]);
  function rollAcademic(digital) {
    const roll = digital ? rollDie(100) : readPercentileRoll(manualRoll);
    setTrialResult({ id: crypto.randomUUID(), signature: trialSignature, roll, outcome: percentileResult(trial.target, roll) });
  }
  const restricted = magic.restrictedSpells.some((item) => item.spellId === spell.id && item.form === form);

  function toggleAcquisition() {
    if (access.recorded) {
      if (form === "sacred") {
        onChange(finishSacredSpell(character, magic, spell, context, false));
        setNotice("");
        return;
      }
      onChange({
        ...magic,
        acquisitions: magic.acquisitions.filter((entry) => entry.spellId !== spell.id || entry.form !== form),
      });
      setNotice("");
      return;
    }
    const next = recordAcquisition(character, magic, spell, form, context);
    if (next === magic) {
      setNotice("A kikéréshez ellenőrizd a megadott célt, az Ep-igényt és a rendelkezésre álló keretet.");
      return;
    }
    onChange(next);
    setNotice("");
  }

  return (
    <details open={gm}>
      <summary>{gm ? states[result.state] : "Varázslat adatai"}</summary>
      <dl>
        <dt>Alapnehézség</dt><dd>{spell.difficulty ?? "—"}</dd>
        <dt>Alap Ep-igény</dt><dd>{costLabel(spell.ep)}</dd>
        {spell.jp != null && <><dt>Tanulás költsége</dt><dd>{spell.jp} Jp</dd></>}
        {spell.fp != null && <><dt>Fizikumpont-igény</dt><dd>{spell.fp} Fp</dd></>}
        <dt>Erő</dt><dd>{spell.power ?? "—"}</dd>
        <dt>Hatótávolság</dt><dd>{spell.range ?? "—"}</dd>
        <dt>{form === "free" ? "A minta komponensei" : "Komponensek"}</dt><dd>{trial?.componentFree ? "Komponensmentes · TESZT háziszabály" : (spell.components ?? "—")}</dd>
        <dt>Elmondási idő</dt><dd>{spell.castTime ?? "—"}</dd>
        <dt>Hatóidő</dt><dd>{spell.duration ?? "—"}</dd>
        <dt>Forrás</dt><dd>
          <a href={`https://www.fantasycentrum.hu/old/CHERUBION/kaosz_szerepjatek.pdf#page=${spell.page + 1}`}
            target="_blank" rel="noreferrer">Alapkönyv, {spell.page}. oldal</a>
          {spell.errata && <> · <a href="https://anyflip.com/npfrw/wdjj/basic" target="_blank" rel="noreferrer">Errata</a></>}
        </dd>
      </dl>
      {trial?.target != null && <p>Smaragd célszám: {trial.target}%{trial.bonus ? ` · Szakosodás: +${trial.bonus} százalékpont` : ""}</p>}
      {access.fromScroll && <p>Birtokolt mondóka-pergamen. Az olvashatóságot és a használati feltételeket a KM ellenőrzi.</p>}
      {gm && editing && form === "academic" && magic.academicSpecialization && (
        <fieldset><legend>Egyedi akadémikus engedély · TESZT háziszabály</legend>
          {[["allowed", "Másik kódexből tanulható"], ["bonus", "+20 százalékpont"], ["componentFree", "Komponensmentesség"]].map(([key, label]) =>
            <label key={key}><input type="checkbox" checked={exception?.[key] === true} onChange={event => {
              const checked = event.target.checked;
              onChange(previous => ({ ...previous, academicExceptions: { ...previous.academicExceptions,
                [spell.id]: { ...previous.academicExceptions?.[spell.id], [key]: checked } } }));
            }} /> {label}</label>)}
        </fieldset>
      )}
      {spell.note && <p>{spell.note}</p>}
      {spell.requiredSkill && <p>Szükséges jártasság: {spell.requiredSkill}.</p>}
      {!gm && form === "wild" && (
        <p>Vadmágikus nehézség: {cost.difficulty ?? "Mesélői elbírálás"} · Ep: {cost.ep ?? costLabel(spell.ep)}.
          {access.allowed && ` ${wildEnergyStatus(character, magic, cost.ep)?.reasons.join(" ") ?? ""}`}
        </p>
      )}
      {form === "free" && (
        <p>Szabadmágikus nehézség: {cost.difficulty ?? "Mesélői elbírálás"} · Ep: {cost.ep ?? "Mesélői elbírálás"}.
          <br /><FreeMagicTrial character={character} difficulty={cost.difficulty} />
          {!gm && ` ${freeEnergyStatus(character, magic, cost.ep)?.reasons.join(" ") ?? ""}`}
        </p>
      )}
      {(gm || form === "free" || form === "academic") && access.allowed && (
        <>
          {(spell.ep?.kind === "perUnit" || spell.ep?.kind === "flight") && (
            <label>
              Mennyiség ({spell.ep.unit ?? "perc"})
              <input type="number" min="1" max={spell.ep.maxUnits} step="1" disabled={!editing && form !== "academic"} value={units} onChange={(event) => setUnits(event.target.value)} />
            </label>
          )}
          {spell.ep?.kind === "flight" && (
            <>
              <label>
                Célpont
                <select value={target} disabled={!editing} onChange={(event) => setTarget(event.target.value)}>
                  <option value="">Válassz célpontot</option>
                  <option value="self">Önmaga</option>
                  <option value="other">Másik célpont</option>
                </select>
              </label>
              {target === "other" && (
                <label>Bruttó tömeg (kg)
                  <input type="number" min="1" step="any" disabled={!editing && form !== "academic"} value={kg} onChange={(event) => setKg(event.target.value)} />
                </label>
              )}
            </>
          )}
          {gm && form !== "free" && <p>Nehézség: {cost.difficulty ?? "ellenőrzendő"} · Ep: {cost.ep ?? "ellenőrzendő"}</p>}
          {gm && (form === "free" || form === "wild") && <p>A végleges hatást a Mesélő bírálja el.</p>}
          {gm && <label className="magic-checkbox">
            <input type="checkbox" checked={conditionsConfirmed} disabled={!editing} onChange={(event) => setConfirmed(event.target.checked)} />
            A helyzeti feltételek és az esetleges külön erőforrások ellenőrizve
          </label>}
        </>
      )}
      {form === "academic" && access.allowed && access.recorded && trial?.target != null && <>
        <p>Próba · Ep: {cost.ep ?? "KM-ellenőrzés"} · Nehézség: {cost.difficulty}</p>
        <label>Kézi k100 (00 = 100)
          <input type="text" inputMode="numeric" maxLength={3} value={manualRoll} onChange={event => setManualRoll(event.target.value)} />
        </label>
        <button type="button" onClick={() => rollAcademic(true)}>Digitális k100</button>
        <button type="button" onClick={() => rollAcademic(false)}>Kézi dobás elbírálása</button>
        {trialResult?.signature === trialSignature && <p role="status">{
          trialResult.outcome === "invalid" ? "Adj meg 1–100 közötti dobást." :
            `${trialResult.roll} / ${trial.target} · ${({
              success: "Sikeres létrehozási próba", failure: "Sikertelen létrehozási próba",
              "critical-failure": "Katasztrofális rontás",
            })[trialResult.outcome]}. A célpont ellenállása és az Ep elszámolása külön ellenőrzendő.`
        }</p>}
        {gm && editing && trialResult?.signature === trialSignature && trialResult.outcome === "success" && spell.fp == null && (
          <button type="button" disabled={result.state !== "ready" || magic.castingLog?.some(entry => entry.id === trialResult.id)}
            onClick={() => {
              if (!window.confirm("Rögzíted a sikeres létrehozást és az Ep-levonást? A célpont ellenállása külön próba.")) return;
              const operation = { id: trialResult.id, roll: trialResult.roll, recordedAt: new Date().toISOString() };
              onChange(previous => logAcademicCasting(character, previous, spell, context, operation));
            }}>Sikeres elmondás és Ep-levonás rögzítése</button>
        )}
      </>}
      {gm && <p aria-live="polite">{states[result.state]}{result.reasons.length > 0 && ` · ${result.reasons.join(" ")}`}</p>}
      {gm && editing && ((form === "practical") === (spell.codex === "Praktikus mágia")) && (
        <label className="magic-checkbox">
          <input type="checkbox" checked={restricted} onChange={(event) => onChange({
            ...magic,
            restrictedSpells: event.target.checked
              ? [...magic.restrictedSpells, { spellId: spell.id, form }]
              : magic.restrictedSpells.filter((item) => item.spellId !== spell.id || item.form !== form),
          })} />
          Kizárás ennél a karakter–mágiaforma párosnál
        </label>
      )}
      {gm && editing && access.needsAcquisition && (access.allowed || access.recorded) && (
        <>
          <button type="button" onClick={toggleAcquisition} disabled={unresolved}>
            {access.recorded ? (form === "sacred" ? "Kikérés törlése" : "Rögzítés törlése") : `Rögzítés: ${forms[form].acquisition}`}
          </button>
          {form === "sacred" && access.recorded && (
            <button type="button" disabled={result.state !== "ready"}
              onClick={() => {
                if (!window.confirm("Rögzíted az elmondást és a lefoglalt Ep felhasználását? A kimenetel kézi elbírálásra marad.")) return;
                const operation = { id: crypto.randomUUID(), recordedAt: new Date().toISOString() };
                onChange(previous => logSacredCasting(character, previous, spell, context, operation));
              }}>
              Elvarázsol · szakrális kikérés
            </button>
          )}
          {notice && <p role="status">{notice}</p>}
        </>
      )}
    </details>
  );
}

export default function Magia({ character, onSave, ref }) {
  const panel = useRef(null);
  const [gm, setGm] = useState(false);
  const [draft, setDraft] = useState(null);
  const [selectedForm, setSelectedForm] = useState("academic");
  const [query, setQuery] = useState("");
  const [codex, setCodex] = useState("");
  const [selectedSpell, setSelectedSpell] = useState(null);
  const saved = readMagic(character);
  const magic = draft ?? saved;
  const editing = draft !== null;
  const limits = magicLimits(character);
  const freeEp = availableMagicEp(character, magic);
  const unresolved = unresolvedSacredReservations(magic);
  const search = query.trim().toLocaleLowerCase("hu");
  const catalogForms = Object.keys(forms).filter((form) => form !== "practical");
  const skills = character.skills ?? {};
  const theoryRank = academicTheoryRank(skills);
  const specialization = magic.academicSpecialization;
  const hasAcademicSkill = skills["Mágiahasználat (akadémikus)"] > 0;
  const hasSacredSkill = skills["Elhivatottság*"] > 0;
  const hasFreeSkill = skills["Mágiahasználat (szabad)"] > 0;
  const showAcademic = gm ? selectedForm === "academic" : hasAcademicSkill;
  const showSacred = gm ? selectedForm === "sacred" : hasSacredSkill;
  function spellRows(catalog, availableForms) {
    return catalog.flatMap((spell) => availableForms.map((form) => ({
      spell, form, access: spellAccess(character, magic, spell, form),
    })).filter(({ form, access }) => gm || (access.allowed && (form !== "practical" || access.recorded || access.fromScroll)) || (form === "sacred" && access.recorded)));
  }
  const filteredCodexSpells = spells.filter((spell) => spell.codex !== "Praktikus mágia" &&
    (!codex || codex === spell.codex));
  const codexRows = spellRows(filteredCodexSpells, gm ? [selectedForm] : ["academic"]);
  const sacredRows = gm ? (selectedForm === "sacred" ? codexRows : []) :
    spellRows(spells.filter((spell) => spell.codex !== "Praktikus mágia"), ["sacred"]);
  const practicalRows = spellRows(spells.filter((spell) => spell.codex === "Praktikus mágia"), ["practical"]);
  const wildAvailable = formRequirements(character, magic, "wild").length === 0;
  const showWildPatterns = gm ? selectedForm === "wild" : wildAvailable;
  const wildRows = showWildPatterns
    ? spellRows(spells.filter((spell) => spell.codex !== "Praktikus mágia"), ["wild"]) : [];
  const wildEffects = magic.wildEffects ?? [];
  const freeRequirements = formRequirements(character, magic, "free");
  const freeAvailable = freeRequirements.length === 0;
  const showFreePatterns = gm ? selectedForm === "free" : hasFreeSkill;
  const freeRows = showFreePatterns
    ? spellRows(spells.filter((spell) => spell.codex !== "Praktikus mágia"), ["free"]) : [];
  const freeEffects = magic.freeEffects ?? [];
  const validResources = ["activeEp", "shield"].every((key) =>
    magic[key] == null || (Number.isFinite(magic[key]) && magic[key] >= 0 && magic[key] <= limits[key])
  );

  function save() {
    if (!editing || !validResources) return false;
    if (specialization && !specialization.branch) {
      window.alert("Az akadémikus szakosodáshoz válassz mágikus ágat.");
      return false;
    }
    if (panel.current.querySelector('form[data-unsaved="true"]')) {
      window.alert("Véglegesítés előtt rögzítsd a kitöltött hatást vagy Ep-jóváhagyást, illetve ürítsd ki az űrlapot.");
      return false;
    }
    const previousFreeEp = availableMagicEp(character, saved);
    if (draft.activeEp != null && draft.activeEp < (saved.activeEp ?? 0) &&
        (unresolved.length > 0 || (freeEp != null && freeEp < Math.min(0, previousFreeEp ?? 0)))) {
      window.alert(unresolved.length ? "Az Ep csökkentéséhez előbb ellenőrizd a régi kikéréseket."
        : "A szakrális kikérések meghaladják az aktuális Ep-keretet.");
      return false;
    }
    if (JSON.stringify(draft) !== JSON.stringify(saved)) onSave(character, draft);
    setDraft(null);
    return true;
  }

  useImperativeHandle(ref, () => ({ start: () => setDraft(saved), save, cancel: () => setDraft(null) }));

  function toggleSacredCodex(value) {
    setDraft((previous) => ({
      ...previous, sacredCodices: hasCodexPermission(previous.sacredCodices, value)
        ? previous.sacredCodices.filter((item) => !hasCodexPermission([item], value))
        : [...previous.sacredCodices, value],
    }));
  }

  function addEffect(event, field) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const name = fields.get("name").trim();
    const description = fields.get("description").trim();
    const difficulty = Number(fields.get("difficulty"));
    const ep = Number(fields.get("ep"));
    if (!name || !description || !Number.isSafeInteger(difficulty) || difficulty < 1 ||
        fields.get("ep") === "" || !Number.isFinite(ep) || ep < 0) return;
    const effect = { id: crypto.randomUUID(), name, description, difficulty, ep };
    setDraft((previous) => ({ ...previous, [field]: [...(previous[field] ?? []), effect] }));
    event.currentTarget.reset();
    event.currentTarget.dataset.unsaved = "false";
  }

  function markEffectDraft(event) {
    const form = event.currentTarget;
    form.dataset.unsaved = String([...new FormData(form).values()].some((value) => value.trim()));
  }

  function renderSpellList(rows, { practical = false, sacred = false, wild = false, free = false } = {}) {
    rows = rows.filter(({ spell }) => `${spell.name} ${spell.codex} ${spell.type}`.toLocaleLowerCase("hu").includes(search));
    return rows.length > 0 ? (
      <div className="skills-table-container">
        <table className="skills-table">
          <thead><tr>
            <th scope="col">Varázslat</th>
            <th scope="col">{practical || wild || free ? "Típus" : "Kódex"}</th>
            {gm ? <><th scope="col">Hozzáférés</th><th scope="col">Megszerezve</th></> : <th scope="col">Mágiaforma</th>}
            {sacred && <th scope="col">Kikérés állapota</th>}
            <th scope="col">{gm ? "Használat" : "Adatok"}</th>
          </tr></thead>
          <tbody>
            {rows.map(({ spell, form, access }) => (
              <tr key={`${spell.id}-${form}`}>
                <th scope="row">{spell.name}</th>
                <td>{practical || wild || free ? spell.type : `${spell.codex} · ${spell.type}`}</td>
                {gm ? <>
                    <td>{access.allowed ? "Elérhető" : access.reasons.join(" ")}</td>
                  <td>{access.recorded ? forms[form].acquisition : access.needsAcquisition ? "Nincs rögzítve" : spell.evilPrayer ? "Külön kikérés nélkül" : "Minta"}</td>
                </> : <td>{forms[form].label}</td>}
                {sacred && <td>{sacredStatus(spell, access)}</td>}
                <td>
                  {!gm ? (
                        <SpellDetails {...{ spell, character, magic, form, editing }} />
                  ) : selectedSpell === spell.id ? (
                    <>
                      <button type="button" onClick={() => setSelectedSpell(null)}>Bezárás</button>
                      <SpellDetails key={`${spell.id}-${form}-${editing}-${gm}`}
                        {...{ spell, character, magic, form, gm, editing }} onChange={setDraft} />
                    </>
                  ) : (
                    <button type="button" onClick={() => setSelectedSpell(spell.id)}
                      aria-label={`${spell.name} kiválasztása`}>Kiválasztás</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : <p>Nincs megjeleníthető találat.</p>;
  }

  function sacredStatus(spell, access) {
    if (access.recorded && unresolved.some((entry) => entry.spellId === spell.id)) return "KM-ellenőrzés szükséges";
    if (access.recorded) return access.allowed ? "Kikérve" : "Kikérve · a hozzáférés jelenleg korlátozott.";
    if (!access.allowed) return "Nem kérhető.";
    if (!access.needsAcquisition) return "Külön kikérés nélkül.";
    return sacredRequestLimit(character, magic, spellCost(spell, "sacred").ep) || "Kikérhető";
  }

  return (
    <section ref={panel} className="panel magic-panel" data-unsaved={editing && JSON.stringify(draft) !== JSON.stringify(saved)}>
      <h2 className="grimoire-title"><BookOpen aria-hidden="true" size={26} /> Mágia és varázslatok</h2>
      <label className="magic-checkbox">
        <input type="checkbox" checked={gm} onChange={(event) => {
          if (panel.current.querySelector('form[data-unsaved="true"]') &&
              !window.confirm("A még nem rögzített űrlap adatai elvesznek. Folytatod?")) return;
          setGm(event.target.checked);
          setCodex("");
          setQuery("");
          setSelectedSpell(null);
        }} />
        Kalandmesteri nézet (helyi)
      </label>
      <h3>Erőforrások</h3>
      <div className="magic-resource-grid">
      {["activeEp", "shield"].map((key) => (
        <label key={key}>
          {key === "activeEp" ? "Aktuális aktív Ep" : "Aktuális Esszenciapajzs"} · maximum {limits[key]}
          {editing ? (
            <input type="number" min="0" max={limits[key]} step="any" value={magic[key] ?? ""}
              onChange={(event) => {
                const value = event.target.value;
                setDraft((previous) => ({ ...previous, [key]: value === "" ? null : Number(value) }));
              }} />
          ) : <strong> · {magic[key] ?? "nincs rögzítve"}</strong>}
        </label>
      ))}
      </div>
      {unresolved.length > 0 && (
        <section aria-label="Ellenőrzendő szakrális kikérések">
          <h3>KM-ellenőrzés szükséges</h3>
          <ul>{unresolved.map((entry) => (
            <li key={magic.acquisitions.indexOf(entry)}>
              {spells.find((spell) => spell.id === entry.spellId)?.name ?? entry.spellId}
              {gm && editing && (
                <form onChange={markEffectDraft} onSubmit={(event) => {
                  event.preventDefault();
                  const fields = new FormData(event.currentTarget);
                  const value = fields.get("ep");
                  if (!value?.trim()) return;
                  setDraft(approveLegacyReservation(magic, entry, Number(value), fields.has("approved")));
                }}>
                  <label>Pontos Ep-költség <input name="ep" type="number" min="0" step="any" required /></label>
                  <label><input name="approved" type="checkbox" required /> A KM ellenőrizte a pontos költséget</label>
                  <button type="submit">Ep-foglalás jóváhagyása</button>
                </form>
              )}
            </li>
          ))}</ul>
        </section>
      )}
      {magic.castingLog?.length > 0 && (
        <details>
          <summary>Varázslási napló</summary>
          <ol>{magic.castingLog.map(record => <li key={record.id}>
            {record.spellName} · {record.previousEp - record.remainingEp} Ep · {record.outcome} ·{" "}
            <time dateTime={record.recordedAt}>{new Date(record.recordedAt).toLocaleString("hu-HU")}</time>
          </li>)}</ol>
          {gm && editing && <button type="button" disabled={undoSacredCasting(magic) === magic} onClick={() => {
            if (window.confirm("Visszaállítod az utolsó elmondás előtti Ep-t és az esetleges szakrális kikérést?")) setDraft(undoSacredCasting);
          }}>Utolsó elmondás visszavonása</button>}
        </details>
      )}
      <p>Szabad Ep a kikérések után: {freeEp == null ? "ellenőrzendő" : Math.max(0, freeEp)}
        {freeEp < 0 && " · A kikérések meghaladják az aktuális keretet."}</p>
      <p>Egy varázslatra felszabadítható: {limits.release} Ep · Alapzóna: {limits.zoneM} m</p>
      {!validResources && <p role="alert">Az aktuális értékeknek a megadott határokon belül kell lenniük.</p>}
      {hasAcademicSkill && <p>Általános Mágiaelmélet: {theoryRank}. szint{specialization?.branch ? ` · ${specialization.branch}` : ""}</p>}
      {gm && editing && (
        <>
          {hasAcademicSkill && <fieldset>
            <legend>Akadémikus szakosodás · TESZT háziszabály</legend>
            <label>Alapkódex <select value={specialization?.codex ?? ""} onChange={event => {
              const codex = event.target.value;
              setDraft(previous => ({ ...previous, academicSpecialization: codex
                ? { codex, branch: previous.academicSpecialization?.branch ?? "" } : null }));
            }}>
              <option value="">Általános akadémikus</option>
              {academicCodices.map(value => <option key={value}>{value}</option>)}
            </select></label>
            {specialization && <label>Mágikus ág <select value={specialization.branch} onChange={event => {
              const branch = event.target.value;
              setDraft(previous => ({ ...previous, academicSpecialization: { ...previous.academicSpecialization, branch } }));
            }}>
              <option value="">Válassz ágat</option>
              {academicBranches.map(value => <option key={value}>{value}</option>)}
            </select></label>}
          </fieldset>}
          <label>Istenség vagy papság
            <input value={magic.patron} onChange={(event) => {
              const patron = event.target.value;
              setDraft((previous) => ({ ...previous, patron }));
            }} />
          </label>
          <label className="magic-checkbox">
            <input type="checkbox" checked={magic.druid} onChange={(event) => {
              const druid = event.target.checked;
              setDraft((previous) => ({ ...previous, druid }));
            }} /> Druida
          </label>
          {[["shaman", "Sámán"], ["evilPriest", "Gonosz istenség papja"]].map(([key, label]) => (
            <label className="magic-checkbox" key={key}>
              <input type="checkbox" checked={magic[key]} onChange={(event) => {
                const checked = event.target.checked;
                setDraft((previous) => ({ ...previous, [key]: checked }));
              }} /> {label}
            </label>
          ))}
          <fieldset>
            <legend>Papi kódexengedélyek</legend>
            {codices.map((value) => (
              <label className="magic-checkbox" key={value}>
                <input type="checkbox" checked={hasCodexPermission(magic.sacredCodices, value)} onChange={() => toggleSacredCodex(value)} /> {value}
              </label>
            ))}
          </fieldset>
        </>
      )}
      {gm && <h3>Varázslatkatalógus</h3>}
      {gm && (
        <>
          <label>Mágiaforma
            <select value={selectedForm} onChange={(event) => { setSelectedForm(event.target.value); setCodex(""); setSelectedSpell(null); }}>
              {catalogForms.map((type) => <option key={type} value={type}>{forms[type].label}</option>)}
            </select>
          </label>
          <p>{forms[selectedForm].description}</p>
          {formRequirements(character, magic, selectedForm).map((reason) => <p key={reason}>{reason}</p>)}
        </>
      )}
      {(!gm ? showAcademic || showSacred || practicalRows.length > 0 || showWildPatterns || showFreePatterns : true) && (
      <label>Varázslatok és rigmusok keresése
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} />
      </label>)}
      {(showAcademic || (gm && showSacred)) && (
      <label>Kódex
        <select value={codex} onChange={(event) => setCodex(event.target.value)}>
          <option value="">Minden kódex</option>
          {codices.map((value) => <option key={value}>{value}</option>)}
        </select>
      </label>)}
      {(codex || search) && (
        <button type="button" onClick={() => { setCodex(""); setQuery(""); }}>
          Megjelenítési szűrők törlése
        </button>
      )}
      {showAcademic && <section className="grimoire-section" data-form="academic"
        data-fire={specialization?.codex === "Skarlát"} aria-labelledby="academic-magic-heading">
        <GrimoireHeading id="academic-magic-heading" icon={specialization?.codex === "Skarlát" ? Flame : BookOpen}>Akadémikus mágia</GrimoireHeading>
        {renderSpellList(codexRows)}
      </section>}
      {showSacred && (
        <section className="grimoire-section" data-form="sacred" aria-labelledby="sacred-magic-heading">
          <GrimoireHeading id="sacred-magic-heading" icon={Sun}>Szakrális mágia</GrimoireHeading>
          {!gm && formRequirements(character, magic, "sacred").map((reason) => <p key={reason}>{reason}</p>)}
          {renderSpellList(sacredRows, { sacred: true })}
        </section>
      )}
      {(gm || practicalRows.length > 0) && <section className="grimoire-section" data-form="practical" aria-labelledby="practical-magic-heading">
        <GrimoireHeading id="practical-magic-heading" icon={Feather}>Praktikus mágia</GrimoireHeading>
        {gm && <p>{forms.practical.description}</p>}
        {renderSpellList(practicalRows, { practical: true })}
      </section>}
      {(gm || wildAvailable) && (
        <section className="grimoire-section" data-form="wild" aria-labelledby="wild-magic-heading">
          <GrimoireHeading id="wild-magic-heading" icon={Zap}>Vadmágia</GrimoireHeading>
          <p>{forms.wild.description} Az Esszenciakontroll szintjét a Smaragd Táblán kell a hatás nehézségével összevetni.</p>
          <details>
            <summary>Visszahatás és túlcsordulás</summary>
            <p>Sikertelen varázsláskor a tervezett hatás Ep-je elvész, és a Mesélő a Spontán Mágia Táblázat alapján állapítja meg a visszahatást. A spontán kitörés külön sorspróbához kötött.</p>
            <p>A Varázserő maximuma feletti hatáshoz túlcsordulás kell. Ebben az esetben a próba eredményétől függetlenül támadnak az esszenciaszörnyek. Az errata szerint az esszenciaörvény érzékeléséhez 7. szintű Zónaérzékelés szükséges.</p>
          </details>
          {gm && editing && (
            <form onInput={markEffectDraft} onSubmit={(event) => addEffect(event, "wildEffects")}>
              <label>Hatás neve <input name="name" required /></label>
              <label>Hatás leírása <textarea name="description" required /></label>
              <label>Végleges vadmágikus nehézség <input name="difficulty" type="number" min="1" step="1" required /></label>
              <label>Ep-igény <input name="ep" type="number" min="0" step="any" required /></label>
              <button type="submit">Hatás hozzáadása</button>
            </form>
          )}
          {wildEffects.length > 0 && (
            <ul>
              {wildEffects.map((effect) => (
                <li key={effect.id}>
                  <strong>{effect.name}</strong> · Nehézség: {effect.difficulty} · {effect.ep} Ep
                  <p>{effect.description}</p>
                  <p>{wildEnergyStatus(character, magic, effect.ep)?.reasons.join(" ")}</p>
                  {gm && editing && <button type="button" onClick={() => setDraft((previous) => ({
                    ...previous, wildEffects: previous.wildEffects.filter((item) => item.id !== effect.id),
                  }))}>Hatás törlése</button>}
                </li>
              ))}
            </ul>
          )}
          {showWildPatterns && <>
            <h4>Hatásminták</h4>
            {renderSpellList(wildRows, { wild: true })}
          </>}
        </section>
      )}
      {(hasFreeSkill || (gm && selectedForm === "free")) && (
        <section className="grimoire-section" data-form="free" aria-labelledby="free-magic-heading">
          <GrimoireHeading id="free-magic-heading" icon={Sparkles}>Szabad mágia</GrimoireHeading>
          <p>{forms.free.description} A minták végleges hatását a Mesélő állapítja meg. A Szabad mágia anyagi komponens nélkül működik.</p>
          {!gm && freeRequirements.map((reason) => <p key={reason}>{reason}</p>)}
          {gm && editing && (
            <form onInput={markEffectDraft} onSubmit={(event) => addEffect(event, "freeEffects")}>
              <label>Hatás neve <input name="name" required /></label>
              <label>Hatás leírása <textarea name="description" required /></label>
              <label>Végleges szabadmágikus nehézség <input name="difficulty" type="number" min="1" step="1" required /></label>
              <label>Végleges Ep-igény <input name="ep" type="number" min="0" step="any" required /></label>
              <button type="submit">Szabadmágikus hatás hozzáadása</button>
            </form>
          )}
          {freeEffects.length > 0 && (
            <ul>
              {freeEffects.map((effect) => (
                <li key={effect.id}>
                  <strong>{effect.name}</strong> · Nehézség: {effect.difficulty} · {effect.ep} Ep
                  <p>{effect.description}</p>
                  {freeAvailable && <FreeMagicTrial character={character} difficulty={effect.difficulty} />}
                  <p>{freeAvailable && freeEnergyStatus(character, magic, effect.ep)?.reasons.join(" ")}</p>
                  {gm && editing && <button type="button" onClick={() => setDraft((previous) => ({
                    ...previous, freeEffects: previous.freeEffects.filter((item) => item.id !== effect.id),
                  }))}>Szabadmágikus hatás törlése</button>}
                </li>
              ))}
            </ul>
          )}
          {showFreePatterns && <>
            <h4>Hatásminták</h4>
            {renderSpellList(freeRows, { free: true })}
          </>}
        </section>
      )}
    </section>
  );
}
