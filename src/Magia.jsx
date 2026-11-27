import { codexEdition, editionArtwork, editionColors, remainingCodexNames } from "./magic/codexEditions.js";
import { CastingRecord, IndependentCodex } from "./magic/IndependentCodex.jsx";
import { BookOpen, Dice5, Feather, Sparkles, Sun, Zap } from "lucide-react";
import "./MagicBook.css";
import { rollDie } from "./teszt/dice.js";
import { percentileResult } from "./teszt/trials.js";
import { adjudicateAcademicFailure, recordAcademicPendingFailure, logAcademicCasting, logSacredCasting, undoSacredCasting } from "./teszt/sacredCasting.js";
import { useImperativeHandle, useRef, useState } from "react";
import { academicException, academicTheoryRank, selectAcademicCodex, setAcademicGrant, validAcademicSpecialization } from "./teszt/academic.js";
import AkademikusKodexValaszto from "./AkademikusKodexValaszto.jsx";
import { getCodexIcon } from "./codexIcons.js";
import { azureSpells, codices, spells } from "./varazslatAdatok.js";
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
const scarletCodex = "Skarlát";
const azureCodex = "Azúr";
const scarletSpells = spells.filter(spell => spell.codex === scarletCodex);
const catalogTypes = entries => [...new Set(entries.map(spell => spell.type))].sort((a, b) => a.localeCompare(b, "hu"));
const independentTypes = catalogTypes(independentSpells);
const scarletTypes = catalogTypes(scarletSpells);
const azureTypes = catalogTypes(azureSpells);


function hasSpellArtwork(spell) {
  return spell.codex === independentCodex || spell.codex === scarletCodex || spell.codex === azureCodex;
}

function spellArtwork(spell) {
  const folder = spell.codex === azureCodex ? "magic-azure"
    : spell.codex === scarletCodex ? "magic-scarlet" : "magic-independent";
  return `${import.meta.env.BASE_URL}${folder}/${spell.id.slice("official:".length)}.webp`;
}

function SpellDetails({ spell, character, magic, form, gm, editing, onChange, onCast, independent = false, scarlet = false, azure = false, edition }) {
  const illustrated = independent || scarlet || azure || Boolean(edition);
  const playerCasting = form === "academic";
  const knownFpCost = spell.fp == null || (edition && spell.fp === 0);
  const trackFailure = form === "academic" && (edition || azure || [independentCodex, scarletCodex].includes(spell.codex)) && Boolean(onCast);
  const castDialog = useRef(null);
  const entry = magic.acquisitions.find((item) => item.spellId === spell.id && item.form === form);
  const [units, setUnits] = useState(entry?.units ?? "");
  const [target, setTarget] = useState(entry?.target ? (entry.target.self ? "self" : "other") : "");
  const [kg, setKg] = useState(entry?.target?.kg ?? "");
  const [approvedEp, setApprovedEp] = useState("");
  const [referenceSpellId, setReferenceSpellId] = useState("");
  const [conditionsConfirmed, setConfirmed] = useState(false);
  const [notice, setNotice] = useState("");
  const [castingMode, setCastingMode] = useState("manual");
  const attemptLock = useRef(null);
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
  const exception = academicException(magic, spell);
  const grant = exception?.granted === true;
  const ownCodex = magic.academicSpecialization?.codex === spell.codex;
  const hasAcademicSkill = character.skills?.["Mágiahasználat (akadémikus)"] > 0;
  const trialSignature = JSON.stringify([trial?.target, cost.ep, context.units, context.target, context.referenceSpellId]);
  const currentOutcome = trialResult?.signature === trialSignature;
  const recordedAttempt = trialResult && magic.castingLog?.find(record => record.id === trialResult.id);
  const damageDice = damageRoll?.attempt === trialResult?.id ? damageRoll?.faces : undefined;
  const canRoll = !editing && !currentOutcome && Boolean(onCast) && result.state === "ready";
  function rollAcademic(digital) {
    if (!canRoll || attemptLock.current === trialSignature) return;
    attemptLock.current = trialSignature;
    const roll = digital ? rollDie(100) : undefined;
    const attempt = { id: crypto.randomUUID(), signature: trialSignature, roll,
      method: digital ? "digital" : "manual", outcome: digital ? percentileResult(trial.target, roll) : "success" };
    setNotice("");
    setTrialResult(attempt);
    if (!digital || (playerCasting && attempt.outcome === "success" && spell.fp == null && spell.id !== "official:sebokozas")) {
      commitAcademicCast(attempt);
    } else if (["failure", "critical-failure"].includes(attempt.outcome)) {
      const operation = { id: attempt.id, roll, recordedAt: new Date().toISOString() };
      onCast(character.id, (latestCharacter, latestMagic) =>
        recordAcademicPendingFailure(latestCharacter, latestMagic, spell, context, operation));
    }
  }
  function commitAcademicCast(attempt, dice, fpConfirmed = false) {
    const operation = { id: attempt.id, roll: attempt.roll, method: attempt.method, recordedAt: new Date().toISOString(), damageDice: dice, fpConfirmed };
    if (editing) onChange(previous => logAcademicCasting(character, previous, spell, context, operation));
    else onCast?.(character.id, (latestCharacter, latestMagic) =>
      logAcademicCasting(latestCharacter, latestMagic, spell, context, operation));
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
          {(illustrated || form === "academic") && spell.ep?.kind === "approvedEp" && <label>{spell.ep.label}
            <input type="number" min={spell.ep.min} max={spell.ep.max} step={spell.ep.step ?? 1} value={approvedEp}
              onChange={event => setApprovedEp(event.target.value)} />
          </label>}
          {(azure || edition) && spell.ep?.kind === "epChoice" && <div className="azure-variants" role="group" aria-label="Varázslat változata">
            {spell.ep.choices.map(choice => <button key={choice.amount} type="button"
              aria-pressed={context.approvedEp === choice.amount} onClick={() => setApprovedEp(String(choice.amount))}>
              {choice.label} · {choice.amount} Ep
            </button>)}
          </div>}
          {!illustrated && form === "academic" && spell.ep?.kind === "epChoice" && <label>Varázslat változata
            <select value={approvedEp} onChange={event => setApprovedEp(event.target.value)}>
              <option value="">Válassz változatot</option>
              {spell.ep.choices.map(choice => <option key={choice.amount} value={choice.amount}>
                {choice.label} · {choice.amount} Ep
              </option>)}
            </select>
          </label>}
          {(independent || (!illustrated && form === "academic")) && spell.ep?.kind === "referenceEp" && <label>Hivatkozott varázslat
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
          {(scarlet || edition) && spell.ep?.kind === "targetVariant" && <div className="scarlet-targets" role="group" aria-label="Célpont">
            {[["self", "Önmaga"], ["other", "Másik célpont"]].map(([value, label]) =>
              <button key={value} type="button" aria-pressed={target === value} onClick={() => setTarget(value)}>{label}</button>)}
          </div>}
          {(spell.ep?.kind === "flight" || ((azure || (!illustrated && form === "academic")) && spell.ep?.kind === "targetVariant")) && (
            <>
              <label>
                Célpont
                <select value={target} disabled={!edition && !editing && spell.ep.kind === "flight"} onChange={(event) => setTarget(event.target.value)}>
                  <option value="">Válassz célpontot</option>
                  <option value="self">Önmaga</option>
                  <option value="other">Másik célpont</option>
                </select>
              </label>
              {spell.ep.kind === "flight" && target === "other" && (
                <label>Bruttó tömeg (kg)
                  <input type="number" min="1" step="any" disabled={!editing && form !== "academic"} value={kg} onChange={(event) => setKg(event.target.value)} />
                </label>
              )}
            </>
          )}
          {(illustrated || (gm && form !== "free")) && <p className={illustrated ? "independent-cost" : undefined}>
            Nehézség: {cost.difficulty ?? "KM ellenőrzése szükséges"} · Ep: {cost.ep ?? "KM ellenőrzése szükséges"}</p>}
          {gm && (form === "free" || form === "wild") && <p>A végleges hatást a Mesélő bírálja el.</p>}
          {(gm || playerCasting) && <label className="magic-checkbox">
            <input type="checkbox" checked={conditionsConfirmed} disabled={!playerCasting && !editing} onChange={(event) => setConfirmed(event.target.checked)} />
            {azure && spell.id === "official:esoidezes"
              ? "Nyílt terület és komponensek ellenőrizve"
              : "A helyzeti feltételek és az esetleges külön erőforrások ellenőrizve"}
          </label>}
        </>
      )}
      {form === "academic" && access.allowed && access.recorded && <>
        <div className="spell-roll">
          {editing && <p>Varázslás előtt véglegesítsd a karakterlapot.</p>}
          <h4><Dice5 aria-hidden="true" size={20} /> Létrehozási próba</h4>
          <p>Próba · Ep: {cost.ep ?? "KM-ellenőrzés"} · Nehézség: {cost.difficulty}</p>
          <label>Varázslás módja
            <select value={castingMode} onChange={event => setCastingMode(event.target.value)}>
              <option value="manual">Kézi</option>
              <option value="digital">Gépi</option>
            </select>
          </label>
          {castingMode === "manual"
            ? <button type="button" disabled={!canRoll} onClick={() => rollAcademic(false)}>Elvarázsolás</button>
            : <button type="button" disabled={!canRoll || trial.target == null} onClick={() => rollAcademic(true)}>Digitális k100</button>}
          {trialResult?.signature === trialSignature && <p className="spell-outcome" data-outcome={trialResult.outcome} role="status">{
            trialResult.method === "manual" ? "Kézzel elbírált siker" :
              `${trialResult.roll} / ${trial.target} · ${({
                success: "Sikeres létrehozási próba", failure: "Sikertelen létrehozási próba",
                "critical-failure": "Katasztrofális rontás",
              })[trialResult.outcome]}. A célpont ellenállása külön ellenőrzendő.`
          }</p>}
          {recordedAttempt?.status === "pending" && <p role="status">KM elbírálására vár</p>}
          {illustrated && recordedAttempt && recordedAttempt.status !== "pending" &&
            <p role="status">Naplózva · {recordedAttempt.previousEp - recordedAttempt.remainingEp} Ep elszámolva.</p>}
          {currentOutcome && <button type="button" onClick={() => {
            setTrialResult(null);
            attemptLock.current = null;
          }}>Új próba</button>}
          {currentOutcome && trialResult.method !== "manual" && trialResult.outcome === "success" && spell.id === "official:sebokozas" && !recordedAttempt && (
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
          {playerCasting && currentOutcome && !recordedAttempt && trialResult.method !== "manual" && trialResult.outcome === "success" && knownFpCost &&
            <button type="button" disabled={editing || result.state !== "ready"} onClick={() => commitAcademicCast(trialResult, damageDice)}>
              Sikeres elmondás és Ep-levonás rögzítése
            </button>}
          {edition && gm && editing && currentOutcome && !recordedAttempt && trialResult.outcome === "success" && !knownFpCost &&
            <button type="button" onClick={() => {
              if (window.confirm("A külön Fp-igényt ellenőrizted és elszámoltad? A program csak az Ep-t vonja le.")) {
                commitAcademicCast(trialResult, undefined, true);
              }
            }}>Ep rögzítése az Fp-elszámolás után (KM)</button>}
          {playerCasting && currentOutcome && !recordedAttempt && trialResult.outcome !== "success" && (!gm || !editing) &&
            <p>A kudarc Ep-veszteségét és következményét a KM állapítja meg.</p>}
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
        <dt>{form === "free" ? "A minta komponensei" : "Komponensek"}</dt><dd>{spell.components ?? "—"}</dd>
        <dt>Elmondási idő</dt><dd>{spell.castTime ?? "—"}</dd>
        <dt>Hatóidő</dt><dd>{spell.duration ?? "—"}</dd>
        <dt>Forrás</dt><dd>
          <a href={`https://www.fantasycentrum.hu/old/CHERUBION/kaosz_szerepjatek.pdf#page=${spell.page + 1}`}
            target="_blank" rel="noreferrer">Alapkönyv, {spell.page}. oldal</a>
          {spell.errata && <> · <a href="https://anyflip.com/npfrw/wdjj/basic" target="_blank" rel="noreferrer">Errata</a></>}
        </dd>
      </dl>
      {trial?.componentFree && /\banyagi\b/iu.test(spell.components ?? "") &&
        <p>Az anyagi komponens elhagyható · TESZT háziszabály. A szó, a mozdulat és az egyedi feltételek érvényben maradnak.</p>}
      {trial?.target != null && <p>Smaragd célszám: {trial.target}%{trial.bonus ? ` · Szakosodás: +${trial.bonus} százalékpont` : ""}</p>}
      {access.fromScroll && <p>Birtokolt mondóka-pergamen. Az olvashatóságot és a használati feltételeket a KM ellenőrzi.</p>}
      {!gm && editing && form === "academic" && hasAcademicSkill && !access.recorded && (
        <button type="button" onClick={() => onChange(previous => setAcademicGrant(character, previous, spell, true, "test"))}>
          KM jóváhagyása (TESZT)
        </button>
      )}
      {gm && editing && form === "academic" && (
        <fieldset>
          <legend>KM-formulaengedély · TESZT háziszabály</legend>
          {grant && <p>A formula egyedi KM-engedéllyel megszerzettként van rögzítve.</p>}
          <button type="button" onClick={() => {
            if (grant && !window.confirm(`Visszavonod a(z) ${spell.name} egyedi KM-engedélyét?`)) return;
            onChange(previous => setAcademicGrant(character, previous, spell, !grant));
          }}>{grant ? "KM-engedély visszavonása" : "Formula megadása (KM)"}</button>
          {(grant || (exception?.allowed && entry)) && !ownCodex &&
            [["bonus", "+20 százalékpont engedélyezése"], ["componentFree", "Anyagi komponens elhagyásának engedélyezése"]]
              .map(([key, label]) => <label className="magic-checkbox" key={key}>
                <input type="checkbox" checked={exception?.[key] === true} onChange={event => {
                  const checked = event.target.checked;
                  onChange(previous => ({ ...previous, academicExceptions: { ...previous.academicExceptions,
                    [spell.id]: { ...academicException(previous, spell), [key]: checked } } }));
                }} />{label}
              </label>)}
        </fieldset>
      )}
      {spell.note && <p>{spell.note}</p>}
      {edition && !spell.note && <p>A részletes hatás az alapkönyvi hivatkozásnál olvasható.</p>}
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
      {illustrated ? <>
        <p className="independent-condition">{access.recorded ? "Ismert formula" : "Még nincs megtanulva"} · {states[result.state]}</p>
        {result.reasons.length > 0 && <p>{result.reasons.join(" ")}</p>}
        {spell.ep?.kind === "variable" && <p>KM ellenőrzése szükséges a pontos Ep-igényhez és a külön feltételekhez.</p>}
        {(azure || edition) && cost.difficulty == null && !Number.isFinite(spell.difficulty) && <p>KM ellenőrzése szükséges a próba pontos nehézségéhez.</p>}
        {playerCasting && !onCast && <p>A varázslás játékba helyezett, menthető karakterrel érhető el.</p>}
        <button className="independent-cast-button" type="button" disabled={!access.allowed || !access.recorded || (playerCasting && !onCast)}
          onClick={() => castDialog.current.showModal()}>Varázslás</button>
        <dialog className={`independent-cast-dialog${independent ? " codex-neutral-dialog" : ""}${scarlet ? " codex-neutral-dialog scarlet-codex-dialog" : azure ? " codex-neutral-dialog azure-codex-dialog" : edition ? " codex-neutral-dialog codex-edition-dialog" : ""}`} ref={castDialog} style={edition ? editionColors(edition) : undefined} aria-labelledby="independent-cast-title">
          <header><h4 id="independent-cast-title">Varázslás · {spell.name}</h4>
            <button type="button" onClick={() => castDialog.current.close()} aria-label="Varázslási ablak bezárása">×</button>
          </header>
          <div className="independent-cast-body">
            {playerCasting && <dl className="codex-neutral-resources">
              <div><dt>Elérhető Ep</dt><dd>{availableMagicEp(character, magic) ?? "—"}</dd></div>
              <div><dt>Ep-költség</dt><dd>{cost.ep ?? "KM-ellenőrzés"}</dd></div>
              <div><dt>Célszám</dt><dd>{trial?.target != null ? `${trial.target}%` : "—"}</dd></div>
            </dl>}
            {scarlet && <p>KM ellenőrzése szükséges a célpont ellenállásához, a sebzéshez és az egyedi tűzhatásokhoz.</p>}
            {(azure || edition) && <p>A környezeti feltételek, a célpont ellenállása és az egyedi hatások elbírálása a KM feladata.</p>}
            {edition && !knownFpCost && <p>A külön Fp-igény és az ehhez tartozó elszámolás KM-ellenőrzést igényel.</p>}
            {castControls}
            <p aria-live="polite">{states[result.state]}{result.reasons.length > 0 && ` · ${result.reasons.join(" ")}`}</p>
            {notice && <p role="status">{notice}</p>}
            {!playerCasting && (!gm || !editing) && <p>Az Ep elszámolása a kalandmesteri nézetben, szerkesztéskor rögzíthető.</p>}
          </div>
        </dialog>
      </> : castControls}
      {!illustrated && <p aria-live="polite">{states[result.state]}{result.reasons.length > 0 && ` · ${result.reasons.join(" ")}`}</p>}
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
      {gm && editing && !grant && access.needsAcquisition && (access.allowed || access.recorded) && (
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

export default function Magia({ character, onSave, ref, kmMode = false, onCast }) {
  const panel = useRef(null);
  const [gm, setGm] = useState(false);
  const [draft, setDraft] = useState(null);
  const [specializationApproved, setSpecializationApproved] = useState(false);
  const [chosenForm, setChosenForm] = useState(null);
  const [query, setQuery] = useState("");
  const [codex, setCodex] = useState("");
  const [spellType, setSpellType] = useState("");
  const [illustratedCodex, setIllustratedCodex] = useState("");
  const [selectedSpell, setSelectedSpell] = useState(null);
  const [independentPage, setIndependentPage] = useState("home");
  const [showExternal, setShowExternal] = useState(false);
  const [knownOnly, setKnownOnly] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
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
  const specializationChanged = editing && specialization?.codex !== saved.academicSpecialization?.codex;
  const hasAcademicSkill = skills["Mágiahasználat (akadémikus)"] > 0;
  const hasSacredSkill = skills["Elhivatottság*"] > 0;
  const hasFreeSkill = skills["Mágiahasználat (szabad)"] > 0;
  const wildAvailable = formRequirements(character, magic, "wild").length === 0;
  const visibleForms = gm ? catalogForms : catalogForms.filter((form) =>
    (form === "academic" && hasAcademicSkill) || (form === "sacred" && hasSacredSkill) ||
    (form === "free" && hasFreeSkill) || (form === "wild" && wildAvailable) || form === "practical");
  const selectedForm = visibleForms.includes(chosenForm) ? chosenForm : visibleForms[0];
  const independent = illustratedCodex === independentCodex;
  const scarlet = illustratedCodex === scarletCodex;
  const azure = illustratedCodex === azureCodex;
  const edition = codexEdition(illustratedCodex);
  const combinedCodex = illustratedCodex === "__osszesitett__";
  const illustrated = independent || scarlet || azure || Boolean(edition) || combinedCodex;
  const showAcademic = illustrated || selectedForm === "academic";
  const showSacred = selectedForm === "sacred";
  const formCatalog = spells.filter((spell) => (selectedForm === "practical") === (spell.codex === "Praktikus mágia"));
  const formTypes = catalogTypes(formCatalog);
  const generalRows = illustrated ? [] : formCatalog.map((spell) => ({
    spell, form: selectedForm, access: spellAccess(character, magic, spell, selectedForm),
  })).filter(({ form, access }) => gm || (access.allowed && (form !== "practical" || access.recorded || access.fromScroll)) ||
    (form === "sacred" && access.recorded) || (form === "academic" && showExternal && Boolean(specialization)));
  function showCodex(value) {
    return kmMode || !specialization || specialization.codex === value || magic.acquisitions.some(entry =>
      entry.form === "academic" && magic.academicExceptions?.[entry.spellId]?.allowed &&
      formCatalog.some(spell => spell.id === entry.spellId && spell.codex === value));
  }
  const wildEffects = magic.wildEffects ?? [];
  const freeRequirements = formRequirements(character, magic, "free");
  const freeAvailable = freeRequirements.length === 0;
  const freeEffects = magic.freeEffects ?? [];
  const validResources = ["activeEp", "shield"].every((key) =>
    magic[key] == null || (Number.isFinite(magic[key]) && magic[key] >= 0 && (kmMode || magic[key] === saved[key] || magic[key] <= limits[key]))
  );

  function save() {
    if (!editing || !validResources) return false;
    if (!kmMode && specializationChanged && (!hasAcademicSkill || !validAcademicSpecialization(specialization) || !specializationApproved)) {
      window.alert("Az akadémikus szakosodás módosításához érvényes kódex és KM-jóváhagyás szükséges.");
      return false;
    }
    if (panel.current.querySelector('form[data-unsaved="true"]')) {
      window.alert("Véglegesítés előtt rögzítsd a kitöltött hatást vagy Ep-jóváhagyást, illetve ürítsd ki az űrlapot.");
      return false;
    }
    const previousFreeEp = availableMagicEp(character, saved);
    if (!kmMode && draft.activeEp != null && draft.activeEp < (saved.activeEp ?? 0) &&
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

  function clearFilters() {
    setCodex("");
    setQuery("");
    setSpellType("");
    setKnownOnly(false);
    setSelectedSpell(null);
  }

  function canChangeView() {
    return !panel.current.querySelector('form[data-unsaved="true"]') ||
      window.confirm("A még nem rögzített űrlap adatai elvesznek. Folytatod?");
  }

  function openForm(form) {
    if ((!illustrated && selectedForm === form) || !canChangeView()) return;
    setChosenForm(form);
    setIllustratedCodex("");
    clearFilters();
  }

  function openIllustration(value) {
    if (!canChangeView()) return;
    setIllustratedCodex(value);
    setIndependentPage("home");
    clearFilters();
  }

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

  function renderSpellList(rows, { practical = false, sacred = false, wild = false, free = false, independent = false, scarlet = false, azure = false } = {}) {
    const illustrated = independent || scarlet || azure;
    rows = rows.filter(({ spell }) => (!spellType || spellType === spell.type) &&
      (illustrated || !codex || codex === spell.codex) &&
      (illustrated ? spell.name : `${spell.name} ${spell.codex} ${spell.type}`).toLocaleLowerCase("hu").includes(search));
    if (!rows.length) return <p>Nincs megjeleníthető találat.</p>;
    const selected = rows.find(({ spell, form }) => selectedSpell === `${form}:${spell.id}`) ?? (illustrated ? rows[0] : undefined);
    const SelectedIcon = selected && (selected.form === "academic"
      ? getCodexIcon(selected.spell.codex) : formIcons[selected.form]);
    return (
      <div className={illustrated ? "spellbook-spread independent-spread" : "spellbook-spread"}>
        <ul className="spellbook-index">
          {rows.map(({ spell, form, access }) => {
            const key = `${form}:${spell.id}`;
            const Icon = form === "academic" ? getCodexIcon(spell.codex) : formIcons[form];
            const active = illustrated ? selected?.spell.id === spell.id : selectedSpell === key;
            return <li key={key}>
              <button type="button" aria-pressed={active} aria-label={`${spell.name} kiválasztása`}
                onClick={() => setSelectedSpell(active ? null : key)}>
                {illustrated ? <img className="independent-icon" src={spellArtwork(spell)} alt="" width="46" height="46" loading="lazy" />
                  : <Icon aria-hidden="true" size={23} />}
                <span><strong>{spell.name}</strong><small data-codex={form === "academic" ? spell.codex : undefined}>
                  {illustrated ? (access.recorded ? "Ismert · " : "") + spell.type
                    : practical || wild || free ? spell.type : spell.codex}</small></span>
              </button>
              {gm && <small className="spellbook-access">{sacred ? sacredStatus(spell, access)
                : access.recorded ? forms[form].acquisition
                : access.allowed ? "Elérhető" : access.reasons.join(" ")}</small>}
            </li>;
          })}
        </ul>
        {selected && <article className="spellbook-folio">
          <header>{hasSpellArtwork(selected.spell) ? <img className={illustrated ? "independent-illustration" : "grimoire-spell-art"} src={spellArtwork(selected.spell)} alt="" width="124" height="124" />
            : <span className="spellbook-sigil" data-codex={selected.form === "academic" ? selected.spell.codex : undefined}
            aria-hidden="true"><SelectedIcon size={34} /></span>}
            <div><h4>{selected.spell.name}</h4>
              <CodexBadge codex={selected.spell.codex} />
            </div>
          </header>
          {!gm && selected.access.fromScroll && <p>Birtokolt mondóka-pergamen</p>}
          <SpellDetails key={`${selected.form}:${selected.spell.id}-${editing}-${gm}`}
            spell={selected.spell} form={selected.form} independent={independent} scarlet={scarlet} azure={azure} character={character} magic={magic} editing={editing}
            gm={selected.form === "academic" && [independentCodex, scarletCodex].includes(selected.spell.codex) ? kmMode : gm} onChange={setDraft} onCast={onCast} />
        </article>}
        {!selected && <p className="spellbook-placeholder">Válassz varázslatot a részletekhez.</p>}
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
    <section ref={panel} className={`panel magic-panel${illustrated ? "" : " general-grimoire"}`} data-unsaved={editing && JSON.stringify(draft) !== JSON.stringify(saved)}>
      {!illustrated && <h2>Varázslókönyv</h2>}
      {!illustrated && kmMode && <label className="magic-checkbox">
        <input type="checkbox" checked={gm} onChange={event => {
          if (!canChangeView()) return;
          setGm(event.target.checked);
          clearFilters();
        }} /> KM-katalógus
      </label>}
      <section className="grimoire-resources" aria-labelledby="magic-resource-heading">
        <h3 id="magic-resource-heading">Erőforrások</h3>
        <div className="magic-resource-grid">
          {["activeEp", "shield"].map((key) => (
            <label key={key} className="grimoire-resource">
              <span>{key === "activeEp" ? "Aktuális aktív Ep" : "Aktuális Esszenciapajzs"} · maximum {limits[key]}</span>
              {editing ? (
                <input type="number" min="0" max={kmMode ? undefined : limits[key]} step="any" value={magic[key] ?? ""}
                  onChange={(event) => {
                    const value = event.target.value;
                    setDraft((previous) => ({ ...previous, [key]: value === "" ? null : Number(value) }));
                  }} />
              ) : <strong>{magic[key] ?? "nincs rögzítve"}</strong>}
            </label>
          ))}
          <div className="grimoire-resource" data-resource="release">
            <span>Egy varázslatra felszabadítható</span><strong>{limits.release} Ep</strong>
          </div>
          <div className="grimoire-resource" data-resource="available">
            <span>Szabad Ep a kikérések után</span><strong>{freeEp == null ? "ellenőrzendő" : Math.max(0, freeEp)}</strong>
          </div>
        </div>
        {freeEp < 0 && <p role="alert">A kikérések meghaladják az aktuális keretet.</p>}
        <p>Alapzóna: {limits.zoneM} m</p>
        {!validResources && <p role="alert">Az aktuális értékeknek a megadott határokon belül kell lenniük.</p>}
      </section>
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
      {(hasAcademicSkill || specialization || kmMode) && <fieldset className="grimoire-settings academic-specialization">
        <legend>Akadémikus szakosodás · TESZT háziszabály</legend>
        {hasAcademicSkill && <p>Általános Mágiaelmélet: {theoryRank}. szint</p>}
        {specialization ? <p>Aktuális szakosodás: <CodexBadge codex={specialization.codex} /></p>
          : <p>Aktuális szakosodás: Általános akadémikus</p>}
        {editing && (hasAcademicSkill || kmMode) && <>
          <AkademikusKodexValaszto specialization={specialization} onChange={codex => {
            setSpecializationApproved(false);
            setDraft(previous => ({ ...previous, academicSpecialization: selectAcademicCodex(previous.academicSpecialization, codex) }));
          }} />
          {specializationChanged && !specializationApproved && !kmMode && <button type="button"
            disabled={!validAcademicSpecialization(specialization)} onClick={() => {
              setSpecializationApproved(true);
              setDraft(previous => ({ ...previous, academicSpecializationApproval: { source: "test", codex: specialization?.codex ?? null } }));
            }}>KM jóváhagyása (TESZT)</button>}
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
      <nav className="grimoire-navigation" aria-label="Mágiaformák">
        {visibleForms.map((form) => {
          const Icon = formIcons[form];
          return <button key={form} type="button" data-form={form} aria-pressed={!illustrated && selectedForm === form}
            onClick={() => openForm(form)}>
            <Icon size={21} aria-hidden="true" />{forms[form].label}
          </button>;
        })}
      </nav>
      {!illustrated && <div className="grimoire-form-description">
        <p>{forms[selectedForm].description}</p>
        {formRequirements(character, magic, selectedForm).map((reason) => <p key={reason}>{reason}</p>)}
      </div>}
      {(illustrated || selectedForm === "academic" || !hasAcademicSkill) &&
        <nav className="independent-navigation" aria-label="Varázslatkatalógus nézetei">
          <button type="button" aria-pressed={!illustrated && selectedForm === "academic"}
            onClick={() => { setChosenForm("academic"); openIllustration(""); }}>Teljes katalógus</button>
          <button type="button" aria-pressed={independent} onClick={() => openIllustration(independentCodex)}>Kódexfüggetlen</button>
          {showCodex(scarletCodex) && <button type="button" aria-pressed={scarlet} onClick={() => openIllustration(scarletCodex)}>Skarlát Kódex</button>}
          {showCodex(azureCodex) && <button type="button" aria-pressed={azure} onClick={() => openIllustration(azureCodex)}>Azúr Kódex</button>}
          <button type="button" aria-pressed={combinedCodex} onClick={() => openIllustration("__osszesitett__")}>Összesített kódex</button>
          <label>További akadémikus kódexek
            <select value={edition ? illustratedCodex : ""} onChange={event => openIllustration(event.target.value)}>
              <option value="">Válassz kódexet</option>
              {remainingCodexNames.map(name => <option key={name} value={name}>{name} Kódex</option>)}
            </select>
          </label>
        </nav>}
      {!illustrated && selectedForm === "academic" && specialization && !gm && <label className="magic-checkbox">
        <input type="checkbox" checked={showExternal} onChange={event => setShowExternal(event.target.checked)} />
        Külső formulák megtekintése és engedélyezése
      </label>}
      {!illustrated && <div className="grimoire-filters">
        <label>Varázslatok és rigmusok keresése
          <input type="search" value={query} onChange={event => setQuery(event.target.value)} />
        </label>
        {selectedForm !== "practical" && <label>Kódex
          <select value={codex} onChange={event => setCodex(event.target.value)}>
            <option value="">Minden kódex</option>
            {codices.map(value => <option key={value}>{value}</option>)}
          </select>
        </label>}
        <label>Varázslattípus
          <select value={spellType} onChange={event => setSpellType(event.target.value)}>
            <option value="">Minden típus</option>
            {formTypes.map(type => <option key={type}>{type}</option>)}
          </select>
        </label>
        {(codex || search || spellType) && (
          <button type="button" onClick={clearFilters}>
            Megjelenítési szűrők törlése
          </button>
        )}
      </div>}
      {illustrated && (() => {
        const catalog = combinedCodex ? spells.filter(spell => magic.acquisitions.some(entry => entry.form === "academic" && entry.spellId === spell.id))
          : edition ? spells.filter(spell => spell.codex === illustratedCodex) : azure ? azureSpells : scarlet ? scarletSpells : independentSpells;
        const all = catalog.map(spell => ({ spell, access: spellAccess(character, magic, spell, "academic") }));
        const selected = all.find(({ spell }) => spell.id === selectedSpell);
        const rows = all.filter(({ spell, access }) => (!spellType || spell.type === spellType) &&
          spell.name.toLocaleLowerCase("hu").includes(search) && (!knownOnly || access.recorded));
        return <IndependentCodex combined={combinedCodex} edition={edition} editionName={illustratedCodex} scarlet={scarlet} azure={azure} catalog={all} costLabel={costLabel} activeEp={magic.activeEp} availableEp={freeEp} release={limits.release}
          known={all.filter(({ access }) => access.recorded)}
          page={independentPage} onPage={setIndependentPage} selected={selected} onSelect={setSelectedSpell} rows={rows}
          artwork={spell => codexEdition(spell.codex) ? editionArtwork(codexEdition(spell.codex), spell.id) : spellArtwork(spell)} filters={<div className="codex-neutral-filters">
            <label>Varázslat keresése<input type="search" value={query} onChange={event => setQuery(event.target.value)} /></label>
            <label>Varázslattípus<select value={spellType} onChange={event => setSpellType(event.target.value)}>
              <option value="">Minden típus</option>
              {(combinedCodex || edition ? catalogTypes(catalog) : azure ? azureTypes : scarlet ? scarletTypes : independentTypes).map(type => <option key={type}>{type}</option>)}
            </select></label>
            <label className="magic-checkbox"><input type="checkbox" checked={knownOnly} onChange={event => setKnownOnly(event.target.checked)} /> Csak ismert formulák</label>
          </div>}>
          {selected && <SpellDetails key={selected.spell.id} spell={selected.spell} form="academic" independent={selected.spell.codex === independentCodex} scarlet={selected.spell.codex === scarletCodex} azure={selected.spell.codex === azureCodex} edition={codexEdition(selected.spell.codex)}
            character={character} magic={magic} gm={kmMode} editing={editing} onChange={setDraft} onCast={onCast} />}
        </IndependentCodex>;
      })()}
      {!illustrated && showAcademic && <section className="grimoire-section" data-form="academic" aria-labelledby="academic-magic-heading">
        <GrimoireHeading id="academic-magic-heading" icon={BookOpen}>Akadémikus mágia</GrimoireHeading>
        {renderSpellList(generalRows)}
      </section>}
      {!illustrated && showSacred && (
        <section className="grimoire-section" data-form="sacred" aria-labelledby="sacred-magic-heading">
          <GrimoireHeading id="sacred-magic-heading" icon={Sun}>Szakrális mágia</GrimoireHeading>
          {renderSpellList(generalRows, { sacred: true })}
        </section>
      )}
      {!illustrated && selectedForm === "practical" && <section className="grimoire-section" data-form="practical" aria-labelledby="practical-magic-heading">
        <GrimoireHeading id="practical-magic-heading" icon={Feather}>Praktikus mágia</GrimoireHeading>
        {!gm && !generalRows.length && <p>Nincs rögzített rigmus vagy használható mondóka-pergamen.</p>}
        {renderSpellList(generalRows, { practical: true })}
      </section>}
      {!illustrated && selectedForm === "wild" && (
        <section className="grimoire-section" data-form="wild" aria-labelledby="wild-magic-heading">
          <GrimoireHeading id="wild-magic-heading" icon={Zap}>Vadmágia</GrimoireHeading>
          <p>Az Esszenciakontroll szintjét a Smaragd Táblán kell a hatás nehézségével összevetni.</p>
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
          <h4>Hatásminták</h4>
          {renderSpellList(generalRows, { wild: true })}
        </section>
      )}
      {!illustrated && selectedForm === "free" && (
        <section className="grimoire-section" data-form="free" aria-labelledby="free-magic-heading">
          <GrimoireHeading id="free-magic-heading" icon={Sparkles}>Szabad mágia</GrimoireHeading>
          <p>A minták végleges hatását a Mesélő állapítja meg. A Szabad mágia anyagi komponens nélkül működik.</p>
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
          <h4>Hatásminták</h4>
          {renderSpellList(generalRows, { free: true })}
        </section>
      )}
      <nav className="magic-history-navigation" aria-label="Mágiaelőzmények">
        <button type="button" aria-expanded={historyOpen} aria-controls="magic-history-panel"
          onClick={() => setHistoryOpen(previous => !previous)}>
          Mágiaelőzmények ({magic.castingLog?.length ?? 0})
        </button>
      </nav>
      {historyOpen && <section id="magic-history-panel" className="magic-history-panel" aria-label="Összes mágiaelőzmény">
        <h3>Mágiaelőzmények</h3>
        <p>Az összes kódex varázslási előzményei, legújabb elöl.</p>
        <label>Előzmények keresése
          <input type="search" value={historySearch} onChange={event => setHistorySearch(event.target.value)}
            placeholder="Varázslat vagy eredmény" />
        </label>
        {(() => {
          const records = [...(magic.castingLog ?? [])].reverse().filter(record =>
            [record.spellName, record.outcome, record.consequence].some(value =>
              String(value ?? "").toLocaleLowerCase("hu").includes(historySearch.trim().toLocaleLowerCase("hu"))));
          return records.length
            ? <ol>{records.map(record => <CastingRecord key={record.id} record={record}
                onAdjudicate={kmMode && editing && onCast ? (id, epLoss, consequence) => {
                  const operation = { id, epLoss, consequence, adjudicatedAt: new Date().toISOString() };
                  if (adjudicateAcademicFailure(character, magic, operation) === magic) return false;
                  setDraft(previous => adjudicateAcademicFailure(character, previous, operation));
                  return true;
                } : undefined} />)}</ol>
            : <p>{magic.castingLog?.length ? "Nincs a keresésnek megfelelő előzmény." : "Még nincs rögzített varázslás."}</p>;
        })()}
        {gm && editing && <button type="button" disabled={undoSacredCasting(magic) === magic}
          onClick={() => {
            if (window.confirm("Visszaállítod az utolsó elmondás előtti Ep-t és az esetleges szakrális kikérést?")) setDraft(undoSacredCasting);
          }}>Utolsó elmondás visszavonása</button>}
      </section>}
    </section>
  );
}
