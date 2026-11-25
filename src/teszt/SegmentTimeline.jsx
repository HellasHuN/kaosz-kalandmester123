import { addSegment, segmentEntries, segmentGroups } from "./segments.js";

export default function SegmentTimeline({ km, entries, current, onChange }) {
  const visible = segmentEntries(entries, km ? "km" : "player");
  const positions = [...new Set([...visible.map(entry => entry.segment), ...(current ? [current] : [])])].sort((a, b) => a - b);
  const groups = segmentGroups(visible);
  return <section>
    <h3>Harci szegmensek</h3>
    {km && <>
      <p>A rögzített, asztalnál kiszámított szegmensek nézete.</p>
      <form onSubmit={event => {
        event.preventDefault();
        const fields = new FormData(event.currentTarget);
        const next = addSegment(entries, { id: crypto.randomUUID(), name: fields.get("name"),
          segment: Number(fields.get("segment")), visible: fields.has("visible") });
        if (next !== entries) {
          onChange(next, current);
          event.currentTarget.reset();
        }
      }}>
        <label>Szereplő <input name="name" required maxLength={120} /></label>
        <label>Szegmens <input name="segment" type="number" min="1" required /></label>
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
