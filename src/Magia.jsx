import { BookOpen, Dice5, Feather, Flame, Sparkles, Sun, Zap } from "lucide-react";
import "./MagicBook.css";
import { readPercentileRoll, rollDie } from "./teszt/dice.js";
import { percentileResult } from "./teszt/trials.js";
import { logAcademicCasting, logAcademicFailure, logSacredCasting, undoSacredCasting } from "./teszt/sacredCasting.js";
import { useImperativeHandle, useRef, useState } from "react";
import { academicBranchesFor, academicCodices, academicTheoryRank, validAcademicSpecialization } from "./teszt/academic.js";
import { getCodexIcon } from "./codexIcons.js";
import { codices, spells } from "./varazslatAdatok.js";
import {
  academicMagicTrial, approveLegacyReservation, availableMagicEp, finishSacredSpell, formRequirements, forms, hasCodexPermission, magicLimits, readDamageDice, readMagic, recordAcquisition,
  freeEnergyStatus, freeMagicTrial, sacredRequestLimit, spellAccess, spellCost, spellReadiness,
  unresolvedSacredReservations, wildEnergyStatus,
} from "./magiaSzabalyok.js";

function GrimoireHeading({ id, icon: Icon, children }) {
  return <h3 id={id} className="grimoire-heading"><Icon aria-hidden="true" size={22} />{children}</h3>;
}

const formIcons = { academic: BookOpen, sacred: Sun, practical: Feather, wild: Zap, free: Sparkles };

const states = {
  overflow: "Túlcsordulás",
  denied: "Nem elérhető", pending: "Megszerzésre vár", blocked: "Jelenleg nem használható",
  review: "Ellenőrzendő", ready: "A megadott feltételekkel használható",
};

function FreeMagicTrial({ character, difficulty }) {
  const { level, target } = freeMagicTrial(character, difficulty);
  return <span>Smaragd Tábla · {level}. jártasságszint · Célszám: {target ?? "Mesélői elbírálás"}.</span>;
}

function CodexBadge({ codex }) {
  const Icon = getCodexIcon(codex);
  return <span className="codex-badge" data-codex={codex}><Icon aria-hidden="true" size={16} />{codex}</span>;
}

function costLabel(ep) {
  if (!ep) return "—";
  if (ep.kind === "fixed") return `${ep.amount} Ep`;
  if (ep.kind === "perUnit") return `${ep.amount} Ep / ${ep.unit}${ep.maxUnits ? ` (legfeljebb ${ep.maxUnits})` : ""}`;
  return ep.label;
}

const independentCodex = "Kódexfüggetlen";
const independentSpells = spells.filter(spell => spell.codex === independentCodex);
const independentTypes = [...new Set(independentSpells.map(spell => spell.type))].sort((a,b) => a.localeCompare(b, "hu"));

function spellArtwork(spell) {
  return `${import.meta.env.BASE_URL}magic-independent/${spell.id.slice("official:".length)}.webp`;
}

function SpellDetails({ spell, character, magic, form, gm, editing, onChange, independent = false }) {
  const castDialog = useRef(null);
  const entry = magic.acquisitions.find((item) => item.spellId === spell.id && item.form === form);
  const [units, setUnits] = useState(entry?.units ?? "");
  const [target, setTarget] = useState(entry?.target ? (entry.target.self ? "self" : "other") : "");
  const [kg, setKg] = useState(entry?.target?.kg ?? "");
  const [approvedEp, setApprovedEp] = useState("");
  const [referenceSpellId, setReferenceSpellId] = useState("");
  const [conditionsConfirmed, setConfirmed] = useState(false);
  const [notice, setNotice] = useState("");
  const [manualRoll, setManualRoll] = useState("");
  const [trialResult, setTrialResult] = useState(null);
  const [damageRoll, setDamageRoll] = useState(null);
  const access = spellAccess(character, magic, spell, form);
  const context = {
    units: Number(units), conditionsConfirmed, approvedEp: Number(approvedEp), referenceSpellId,
    target: target ? { self: target === "self", kg: Number(kg) } : undefined,
  };
  const unresolved = form === "sacred" && unresolvedSacredReservations(magic).includes(entry);
  const cost = spellCost(spell, form, context);
  const result = spellReadiness(character, magic, spell, form, context);
  const trial = form === "academic" ? academicMagicTrial(character, magic, spell, cost.difficulty) : null;
  const exception = Object.hasOwn(magic.academicExceptions ?? {}, spell.id) ? magic.academicExceptions[spell.id] : null;
  const trialSignature = JSON.stringify([trial?.target, cost.ep, context.units, context.target, context.referenceSpellId]);
  const currentOutcome = trialResult?.signature === trialSignature && trialResult.outcome !== "invalid";
  const recordedAttempt = currentOutcome && magic.castingLog?.find(record => record.id === trialResult.id);
  const damageDice = damageRoll?.attempt === trialResult?.id ? damageRoll?.faces : undefined;
  const canRoll = !independent || (!currentOutcome && (gm && editing ? result.state === "ready"
    : spellReadiness(character, magic, spell, form, { ...context, conditionsConfirmed: true }).state === "ready"));
  function rollAcademic(digital) {
    if (!canRoll) return;
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

  const castControls = <>
      {(gm || form === "free" || form === "academic") && access.allowed && (
        <>
          {independent && spell.ep?.kind === "approvedEp" && <label>{spell.ep.label}
            <input type="number" min={spell.ep.min} max={spell.ep.max} step="1" value={approvedEp}
              onChange={event => setApprovedEp(event.target.value)} />
          </label>}
          {independent && spell.ep?.kind === "referenceEp" && <label>Hivatkozott varázslat
            <select value={referenceSpellId} onChange={event => setReferenceSpellId(event.target.value)}>
              <option value="">Válassz rögzített költségű varázslatot</option>
              {independentSpells.filter(other => other.ep?.kind === "fixed")
                .map(other => <option key={other.id} value={other.id}>{other.name} · {other.ep.amount} Ep</option>)}
            </select>
          </label>}
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
          {(independent || (gm && form !== "free")) && <p className={independent ? "independent-cost" : undefined}>
            Nehézség: {cost.difficulty ?? "KM ellenőrzése szükséges"} · Ep: {cost.ep ?? "KM ellenőrzése szükséges"}</p>}
          {gm && (form === "free" || form === "wild") && <p>A végleges hatást a Mesélő bírálja el.</p>}
          {gm && <label className="magic-checkbox">
            <input type="checkbox" checked={conditionsConfirmed} disabled={!editing} onChange={(event) => setConfirmed(event.target.checked)} />
            A helyzeti feltételek és az esetleges külön erőforrások ellenőrizve
          </label>}
        </>
      )}
      {form === "academic" && access.allowed && access.recorded && trial?.target != null && <>
        <div className="spell-roll">
          <h4><Dice5 aria-hidden="true" size={20} /> Létrehozási próba</h4>
          <p>Próba · Ep: {cost.ep ?? "KM-ellenőrzés"} · Nehézség: {cost.difficulty}</p>
          <label>Kézi k100 (00 = 100)
            <input type="text" inputMode="numeric" maxLength={3} value={manualRoll} onChange={event => setManualRoll(event.target.value)} />
          </label>
          <button type="button" disabled={!canRoll} onClick={() => rollAcademic(true)}>Digitális k100</button>
          <button type="button" disabled={!canRoll} onClick={() => rollAcademic(false)}>Kézi dobás elbírálása</button>
          {trialResult?.signature === trialSignature && <p className="spell-outcome" data-outcome={trialResult.outcome} role="status">{
            trialResult.outcome === "invalid" ? "Adj meg 1–100 közötti dobást." :
              `${trialResult.roll} / ${trial.target} · ${({
                success: "Sikeres létrehozási próba", failure: "Sikertelen létrehozási próba",
                "critical-failure": "Katasztrofális rontás",
              })[trialResult.outcome]}. A célpont ellenállása és az Ep elszámolása külön ellenőrzendő.`
          }</p>}
          {independent && recordedAttempt && <p role="status">Naplózva · {recordedAttempt.previousEp - recordedAttempt.remainingEp} Ep elszámolva.</p>}
          {independent && currentOutcome && <button type="button" onClick={() => {
            if (recordedAttempt || !gm || !editing || window.confirm("Elveted a még el nem számolt dobást?")) {
              setTrialResult(null);
              setManualRoll("");
            }
          }}>Új próba</button>}
          {gm && editing && trialResult?.signature === trialSignature &&
            ["failure", "critical-failure"].includes(trialResult.outcome) && (
            <form key={trialResult.id} onSubmit={event => {
              event.preventDefault();
              const fields = new FormData(event.currentTarget);
              const operation = { id: trialResult.id, roll: trialResult.roll, epLoss: Number(fields.get("epLoss")),
                consequence: fields.get("consequence"), recordedAt: new Date().toISOString() };
              const next = logAcademicFailure(character, magic, spell, context, operation);
              if (next === magic) {
                setNotice("Ellenőrizd a feltételeket, a szabad Ep-keretet és a következményt.");
                return;
              }
              setNotice("");
              onChange(previous => logAcademicFailure(character, previous, spell, context, operation));
            }}>
              <label>KM által megállapított Ep-veszteség
                <input name="epLoss" type="number" min="0" step="any" required />
              </label>
              <label>A kudarc következménye <textarea name="consequence" maxLength={1000} required /></label>
              <button type="submit" disabled={result.state !== "ready" || magic.castingLog?.some(entry => entry.id === trialResult.id)}>
                Kudarc és következmény rögzítése
              </button>
            </form>
          )}
          {independent && currentOutcome && trialResult.outcome === "success" && spell.id === "official:sebokozas" && !recordedAttempt && (
            <form className="independent-damage" key={trialResult.id} onSubmit={event => {
              event.preventDefault();
              const faces = readDamageDice(new FormData(event.currentTarget).get("faces"), context.units);
              setDamageRoll({ attempt: trialResult.id, faces });
            }}>
              <p>A sebzést a célpont ellenállásának ellenőrzése után bíráld el.</p>
              <label>Kézi sebzésdobás ({context.units} k6)
                <input name="faces" type="text" inputMode="text" placeholder="Például: 3 6" />
              </label>
              <button type="submit" disabled={!!damageDice}>Kézi k6-ok rögzítése</button>
              <button type="button" disabled={!!damageDice} onClick={() => setDamageRoll({ attempt: trialResult.id,
                faces: Array.from({ length: context.units }, () => rollDie(6)) })}>Digitális k6</button>
              {damageDice === null && <p role="status">Adj meg {context.units} darab 1–6 közötti eredményt.</p>}
              {damageDice && <p role="status">Dobott sebzés: {damageDice.reduce((sum, die) => sum + die, 0)} Fp ({damageDice.join(" + ")})</p>}
            </form>
          )}
          {gm && editing && trialResult?.signature === trialSignature && trialResult.outcome === "success" && spell.fp == null && (
            <button type="button" disabled={result.state !== "ready" || magic.castingLog?.some(entry => entry.id === trialResult.id)}
              onClick={() => {
                if (!window.confirm("Rögzíted a sikeres létrehozást és az Ep-levonást? A célpont ellenállása külön próba.")) return;
                const operation = { id: trialResult.id, roll: trialResult.roll, recordedAt: new Date().toISOString(), damageDice };
                onChange(previous => logAcademicCasting(character, previous, spell, context, operation));
              }}>Sikeres elmondás és Ep-levonás rögzítése</button>
          )}
        </div>
      </>}
  </>;

  return (
    <details className="spell-details" open>
      <summary>{gm ? states[result.state] : "Varázslat adatai"}</summary>
      <dl className="spell-values">
        <dt>Típus</dt><dd>{spell.type ?? "—"}</dd>
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
      {independent ? <>
        <p className="independent-condition">{access.recorded ? "Ismert formula" : "Még nincs megtanulva"} · {states[result.state]}</p>
        {result.reasons.length > 0 && <p>{result.reasons.join(" ")}</p>}
        {spell.ep?.kind === "variable" && <p>KM ellenőrzése szükséges a pontos Ep-igényhez és a külön feltételekhez.</p>}
        <button className="independent-cast-button" type="button" disabled={!access.allowed || !access.recorded}
          onClick={() => castDialog.current.showModal()}>Varázslás</button>
        <dialog className="independent-cast-dialog" ref={castDialog} aria-labelledby="independent-cast-title">
          <header><h4 id="independent-cast-title">Varázslás · {spell.name}</h4>
            <button type="button" onClick={() => castDialog.current.close()} aria-label="Varázslási ablak bezárása">×</button>
          </header>
          <div className="independent-cast-body">
            {castControls}
            <p aria-live="polite">{states[result.state]}{result.reasons.length > 0 && ` · ${result.reasons.join(" ")}`}</p>
            {notice && <p role="status">{notice}</p>}
            {(!gm || !editing) && <p>Az Ep elszámolása a kalandmesteri nézetben, szerkesztéskor rögzíthető.</p>}
          </div>
        </dialog>
      </> : castControls}
      {gm && !independent && <p aria-live="polite">{states[result.state]}{result.reasons.length > 0 && ` · ${result.reasons.join(" ")}`}</p>}
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
        </>
      )}
      {notice && !castDialog.current?.open && <p role="status">{notice}</p>}
    </details>
  );
}

export default function Magia({ character, onSave, ref }) {
  const panel = useRef(null);
  const [gm, setGm] = useState(false);
  const [draft, setDraft] = useState(null);
  const [specializationApproved, setSpecializationApproved] = useState(false);
  const [selectedForm, setSelectedForm] = useState("academic");
  const [query, setQuery] = useState("");
  const [codex, setCodex] = useState("");
  const [independentType, setIndependentType] = useState("");
  const [selectedSpell, setSelectedSpell] = useState(null);
  const saved = readMagic(character);
  const magic = draft ?? saved;
  const editing = draft !== null;
  const limits = magicLimits(character);
  const freeEp = availableMagicEp(character, magic);
  const unresolved = unresolvedSacredReservations(magic);
  const search = query.trim().toLocaleLowerCase("hu");
  const catalogForms = Object.keys(forms);
  const skills = character.skills ?? {};
  const theoryRank = academicTheoryRank(skills);
  const specialization = magic.academicSpecialization;
  const specializationChanged = editing && (specialization?.codex !== saved.academicSpecialization?.codex ||
    specialization?.branch !== saved.academicSpecialization?.branch);
  const compatibleBranches = academicBranchesFor(specialization?.codex);
  const hasAcademicSkill = skills["Mágiahasználat (akadémikus)"] > 0;
  const hasSacredSkill = skills["Elhivatottság*"] > 0;
  const hasFreeSkill = skills["Mágiahasználat (szabad)"] > 0;
  const independent = codex === independentCodex && (!gm || selectedForm === "academic");
  const showAcademic = gm ? selectedForm === "academic" : hasAcademicSkill || independent;
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
    if (specializationChanged && (!hasAcademicSkill || !validAcademicSpecialization(specialization) || !specializationApproved)) {
      window.alert("Az akadémikus szakosodás módosításához érvényes kódex és ág, valamint KM-jóváhagyás szükséges.");
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

  useImperativeHandle(ref, () => ({ start: () => { setSpecializationApproved(false); setDraft(saved); }, save, cancel: () => setDraft(null) }));

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

  function renderSpellList(rows, { practical = false, sacred = false, wild = false, free = false, independent = false } = {}) {
    rows = rows.filter(({ spell }) => independent
      ? (!independentType || independentType === spell.type) && spell.name.toLocaleLowerCase("hu").includes(search)
      : `${spell.name} ${spell.codex} ${spell.type}`.toLocaleLowerCase("hu").includes(search));
    if (!rows.length) return <p>Nincs megjeleníthető találat.</p>;
    const selected = rows.find(({ spell, form }) => selectedSpell === `${form}:${spell.id}`) ?? (independent ? rows[0] : undefined);
    const SelectedIcon = selected && (selected.form === "academic"
      ? getCodexIcon(selected.spell.codex) : formIcons[selected.form]);
    return (
      <div className={independent ? "spellbook-spread independent-spread" : "spellbook-spread"}>
        <ul className="spellbook-index">
          {rows.map(({ spell, form, access }) => {
            const key = `${form}:${spell.id}`;
            const Icon = form === "academic" ? getCodexIcon(spell.codex) : formIcons[form];
            const active = independent ? selected?.spell.id === spell.id : selectedSpell === key;
            return <li key={key}>
              <button type="button" aria-pressed={active} aria-label={`${spell.name} kiválasztása`}
                onClick={() => setSelectedSpell(active ? null : key)}>
                {independent ? <img className="independent-icon" src={spellArtwork(spell)} alt="" width="46" height="46" loading="lazy" />
                  : <Icon aria-hidden="true" size={23} />}
                <span><strong>{spell.name}</strong><small data-codex={form === "academic" ? spell.codex : undefined}>
                  {independent ? (access.recorded ? "Ismert · " : "") + spell.type
                    : practical || wild || free ? spell.type : spell.codex}</small></span>
              </button>
              {gm && <small className="spellbook-access">{sacred ? sacredStatus(spell, access)
                : access.recorded ? forms[form].acquisition
                : access.allowed ? "Elérhető" : access.reasons.join(" ")}</small>}
            </li>;
          })}
        </ul>
        {selected && <article className="spellbook-folio">
          <header>{independent ? <img className="independent-illustration" src={spellArtwork(selected.spell)} alt="" width="124" height="124" />
            : <span className="spellbook-sigil" data-codex={selected.form === "academic" ? selected.spell.codex : undefined}
            aria-hidden="true"><SelectedIcon size={34} /></span>}
            <div><h4>{selected.spell.name}</h4>
              {selected.form === "academic" && <CodexBadge codex={selected.spell.codex} />}
            </div>
          </header>
          {!gm && selected.access.fromScroll && <p>Birtokolt mondóka-pergamen</p>}
          <SpellDetails key={`${selected.form}:${selected.spell.id}-${editing}-${gm}`}
            spell={selected.spell} form={selected.form} independent={independent} {...{ character, magic, gm, editing }} onChange={setDraft} />
        </article>}
      </div>
    );
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
      <header className="grimoire-banner">
        <h2 className="grimoire-title"><BookOpen aria-hidden="true" size={29} /> Mágia és varázslatok</h2>
        <p><Flame aria-hidden="true" size={22} /><span>Felszabadítható esszencia</span><strong>{limits.release} Ep</strong></p>
      </header>
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
            {record.consequence && <p>{record.consequence}</p>}
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
      {(hasAcademicSkill || specialization) && <fieldset className="grimoire-settings academic-specialization">
        <legend>Akadémikus szakosodás · TESZT háziszabály</legend>
        {hasAcademicSkill && <p>Általános Mágiaelmélet: {theoryRank}. szint</p>}
        {specialization ? <p>Aktuális szakosodás: <CodexBadge codex={specialization.codex} /> · {specialization.branch || "Ág kiválasztása szükséges"}</p>
          : <p>Aktuális szakosodás: Általános akadémikus</p>}
        {editing && hasAcademicSkill && <>
          <label>Alapkódex <select value={specialization?.codex ?? ""} onChange={event => {
            const codex = event.target.value;
            const branch = academicBranchesFor(codex).includes(specialization?.branch) ? specialization.branch : "";
            setSpecializationApproved(false);
            setDraft(previous => ({ ...previous, academicSpecialization: codex ? { codex, branch } : null }));
          }}>
            <option value="">Általános akadémikus</option>
            {specialization && !academicCodices.includes(specialization.codex) && <option disabled>{specialization.codex}</option>}
            {academicCodices.map(codex => <option key={codex}>{codex}</option>)}
          </select></label>
          {specialization && <label>Mágikus ág <select value={specialization.branch} onChange={event => {
            const branch = event.target.value;
            setSpecializationApproved(false);
            setDraft(previous => ({ ...previous, academicSpecialization: { ...previous.academicSpecialization, branch } }));
          }}>
            <option value="">Válassz ágat</option>
            {specialization.branch && !compatibleBranches.includes(specialization.branch) &&
              <option value={specialization.branch} disabled>{specialization.branch} (korábbi mentés)</option>}
            {compatibleBranches.map(branch => <option key={branch}>{branch}</option>)}
          </select></label>}
          {specializationChanged && <label className="magic-checkbox">
            <input type="checkbox" checked={specializationApproved} disabled={!validAcademicSpecialization(specialization)}
              onChange={event => setSpecializationApproved(event.target.checked)} />
            A Kalandmester jóváhagyta a szakosodás módosítását.
          </label>}
        </>}
      </fieldset>}
      {gm && editing && (
        <details className="grimoire-settings">
          <summary>Szakrális beállítások</summary>
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
        </details>
      )}
      {gm && <h3>Varázslatkatalógus</h3>}
      {gm && (
        <>
          <nav className="grimoire-navigation" aria-label="Mágiaformák">
            {catalogForms.map((type) => {
              const Icon = formIcons[type];
              return <button key={type} type="button" data-form={type} aria-pressed={selectedForm === type}
                onClick={() => {
                  if (selectedForm === type) return;
                  if (panel.current.querySelector('form[data-unsaved="true"]') &&
                      !window.confirm("A még nem rögzített űrlap adatai elvesznek. Folytatod?")) return;
                  setSelectedForm(type);
                  setCodex("");
                  setSelectedSpell(null);
                }}>
                <Icon size={21} aria-hidden="true" />{forms[type].label}
              </button>;
            })}
          </nav>
          <p>{forms[selectedForm].description}</p>
          {formRequirements(character, magic, selectedForm).map((reason) => <p key={reason}>{reason}</p>)}
        </>
      )}
      {(!gm || selectedForm === "academic") && <nav className="independent-navigation" aria-label="Varázslatkatalógus nézetei">
        <button type="button" aria-pressed={independent} onClick={() => { setCodex(independentCodex); setQuery(""); }}>Kódexfüggetlen</button>
        {independent && <button type="button" onClick={() => { setCodex(""); setQuery(""); setIndependentType(""); }}>Teljes katalógus</button>}
      </nav>}
      <div className={independent ? "independent-filters" : undefined}>
      {(!gm ? showAcademic || showSacred || practicalRows.length > 0 || showWildPatterns || showFreePatterns : true) && (
      <label>Varázslatok és rigmusok keresése
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} />
      </label>)}
      {(showAcademic || (gm && showSacred)) && (
      <label>Kódex
        <select value={codex} onChange={(event) => { setCodex(event.target.value); setIndependentType(""); }}>
          <option value="">Minden kódex</option>
          {codices.map((value) => <option key={value}>{value}</option>)}
        </select>
      </label>)}
      {independent && <label>Varázslattípus <select value={independentType} onChange={event => setIndependentType(event.target.value)}>
        <option value="">Minden típus</option>
        {independentTypes.map(type => <option key={type}>{type}</option>)}
      </select></label>}
      {(codex || search) && (
        <button type="button" onClick={() => { setCodex(""); setQuery(""); setIndependentType(""); }}>
          Megjelenítési szűrők törlése
        </button>
      )}
      </div>
      {showAcademic && <section className={`grimoire-section${independent ? " independent-grimoire" : ""}`} data-form="academic"
        data-fire={specialization?.codex === "Skarlát"} aria-labelledby="academic-magic-heading">
        <GrimoireHeading id="academic-magic-heading" icon={!independent && specialization?.codex === "Skarlát" ? Flame : BookOpen}>{independent ? independentCodex : "Akadémikus mágia"}</GrimoireHeading>
        {independent ? renderSpellList(independentSpells.map(spell => ({ spell, form: "academic",
          access: spellAccess(character, magic, spell, "academic") })), { independent: true }) : renderSpellList(codexRows)}
      </section>}
      {!independent && showSacred && (
        <section className="grimoire-section" data-form="sacred" aria-labelledby="sacred-magic-heading">
          <GrimoireHeading id="sacred-magic-heading" icon={Sun}>Szakrális mágia</GrimoireHeading>
          {!gm && formRequirements(character, magic, "sacred").map((reason) => <p key={reason}>{reason}</p>)}
          {renderSpellList(sacredRows, { sacred: true })}
        </section>
      )}
      {!independent && (gm ? selectedForm === "practical" : practicalRows.length > 0) && <section className="grimoire-section" data-form="practical" aria-labelledby="practical-magic-heading">
        <GrimoireHeading id="practical-magic-heading" icon={Feather}>Praktikus mágia</GrimoireHeading>
        {gm && <p>{forms.practical.description}</p>}
        {renderSpellList(practicalRows, { practical: true })}
      </section>}
      {!independent && (gm ? selectedForm === "wild" : wildAvailable) && (
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
      {!independent && (gm ? selectedForm === "free" : hasFreeSkill) && (
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
