import { useState } from "react";
import { characterSpeed } from "../gyorsasag.js";
import { withEffectiveStrength } from "../karakterFoeertekek.js";
import { rollDie } from "./dice.js";
import { addSegment, calculateSegment, segmentEntries, segmentGroups } from "./segments.js";

export default function SegmentTimeline({ km, entries, current, characters, onChange }) {
  const [actorId, setActorId] = useState("");
  const actor = characters.find(character => String(character.id) === actorId);
  const speed = actor && characterSpeed(withEffectiveStrength(actor));
  const [manual, setManual] = useState(false);
  const [error, setError] = useState("");
  const visible = segmentEntries(entries, km ? "km" : "player");
  const positions = [...new Set([...visible.map(entry => entry.segment), ...(current ? [current] : [])])].sort((a, b) => a - b);
  const groups = segmentGroups(visible);
  return <section>
    <h3>Harci szegmensek</h3>
    {km && <>
      <p>Alapkönyv, 140. és 143–144. o. Előző összesített idő + személyes Gyorsaság + cselekvési idő + 1k6.</p>
      <label><span><input type="checkbox" checked={manual} onChange={event => {
        setManual(event.target.checked);
        setError("");
      }} /> Kézzel kiszámított szegmens rögzítése</span></label>
      <form onSubmit={event => {
        event.preventDefault();
        const fields = new FormData(event.currentTarget);
        const segment = manual ? Number(fields.get("segment")) : calculateSegment({
          previous: Number(fields.get("previous")), speed: Number(fields.get("speed")), action: Number(fields.get("action")),
          roll: fields.has("digital") ? rollDie(6) : Number(fields.get("roll")),
        });
        const next = addSegment(entries, { id: crypto.randomUUID(), name: actor?.name ?? fields.get("name"),
          segment, visible: fields.has("visible") });
        setError(next === entries ? "Érvényes szereplő és szegmens szükséges. A kezdeményeződobás 1 és 6 közötti." : "");
        if (next !== entries) {
          onChange(next, current);
          event.currentTarget.reset();
          setActorId("");
        }
      }}>
        <label>Mentett karakter <select value={actorId} onChange={event => setActorId(event.target.value)}>
          <option value="">Másik szereplő</option>
          {characters.map(character => <option key={character.id} value={String(character.id)}>{character.name}</option>)}
        </select></label>
        {!actor && <label>Szereplő <input name="name" required maxLength={120} /></label>}
        {manual ? <label>Szegmens <input name="segment" type="number" min="1" required /></label> : <>
          <label>Előző összesített idő <input name="previous" type="number" min="0" defaultValue={0} required /></label>
          <label>Személyes Gyorsaság <input key={actorId} name="speed" type="number" min="0" defaultValue={speed?.value ?? ""} required /></label>
          {speed?.reason && <p>{speed.reason}</p>}
          <label>Cselekvés ideje <input name="action" type="number" min="0" required /></label>
          <label>Kézi 1k6 <input name="roll" type="number" min="1" max="6" /></label>
          <label><span><input name="digital" type="checkbox" /> Digitális 1k6 használata</span></label>
        </>}
        {error && <p role="alert">{error}</p>}
        <label><span><input name="visible" type="checkbox" /> Látható játékos módban</span></label>
        <button>Szereplő hozzáadása</button>
      </form>
      <label>Itt tartunk <input type="number" min="1" value={current ?? ""} onChange={event => {
        const segment = Number(event.target.value);
        if (!event.target.value || (Number.isSafeInteger(segment) && segment > 0)) onChange(entries, segment || null);
      }} /></label>
    </>}
    {positions.length ? <ol className="test-timeline" aria-label="Szegmensek időrendben">{positions.map(segment =>
      <li key={segment} aria-current={segment === current ? "step" : undefined}>
        <strong>{segment}. szegmens{segment === current && " · Itt tartunk"}</strong>
        {(groups.get(segment) ?? []).map(entry => <div key={entry.id}>
          <span>{entry.name}</span>
          {km && <button type="button" aria-label={`${entry.name} eltávolítása`} onClick={() => {
            if (window.confirm(`${entry.name} eltávolítása az idővonalról?`)) {
              onChange(entries.filter(item => item.id !== entry.id), current);
            }
          }}>Eltávolítás</button>}
        </div>)}
      </li>)}</ol> : <p>Nincs megjeleníthető szegmens.</p>}
  </section>;
}
