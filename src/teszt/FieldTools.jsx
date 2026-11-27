import { rememberViewValue } from "./useApplicationNavigation.js";
import { BookOpen, Compass, MapPin, Minus, PawPrint, Plus } from "lucide-react";
import { useState } from "react";
import { generateNpc, npcRoles } from "./npcDraft.js";

const samplePlaces = [
  { id: "fogadó", name: "Ködbe veszett fogadó", x: 36, y: 54, layer: "Helyszínek" },
  { id: "híd", name: "Kőhíd", x: 65, y: 38, layer: "Helyszínek" },
  { id: "erdő", name: "Ködös erdő", x: 22, y: 27, layer: "Táj" },
  { id: "domb", name: "Szeles dombvidék", x: 71, y: 75, layer: "Táj" },
];

export function MapTool({ markers, onChange, viewMemory }) {
  const [zoom, setZoom] = useState(1);
  const [query, updateQuery] = useState(viewMemory?.mapQuery ?? "");
  const setQuery = rememberViewValue(viewMemory, "mapQuery", updateQuery);
  const [chosen, setChosen] = useState(null);
  const [layers, setLayers] = useState(["Helyszínek", "Táj", "Saját jelölők"]);
  const places = [...samplePlaces, ...markers].filter(place => layers.includes(place.layer) &&
    place.name.toLocaleLowerCase("hu").includes(query.trim().toLocaleLowerCase("hu")));
  return <section className="atlas-panel">
    <header className="test-feature-title"><Compass aria-hidden="true" /><h3>Világtérkép</h3></header>
    <p>Bemutatótérkép saját helyszínekkel. A pontok és a táj a mintakalandhoz tartoznak.</p>
    <label>Helyszín keresése<input type="search" value={query} onChange={event => setQuery(event.target.value)} /></label>
    <div className="test-actions">
      <button type="button" onClick={() => setZoom(Math.max(1, zoom - .25))} disabled={zoom === 1}><Minus aria-hidden="true" size={16} />Kicsinyítés</button>
      <button type="button" onClick={() => setZoom(Math.min(3, zoom + .25))} disabled={zoom === 3}><Plus aria-hidden="true" size={16} />Nagyítás</button>
    </div>
    <fieldset><legend>Rétegek</legend>{["Helyszínek", "Táj", "Saját jelölők"].map(layer =>
      <label key={layer}><span><input type="checkbox" checked={layers.includes(layer)} onChange={event =>
        setLayers(event.target.checked ? [...layers, layer] : layers.filter(item => item !== layer))} /> {layer}</span></label>
    )}</fieldset>
    <div className="test-map-viewport" tabIndex={0} aria-label="Bemutatótérkép, görgethető">
      <div className="test-map" style={{ width: `${zoom * 100}%`, height: `${zoom * 280}px` }}>
        {places.map(place => <button type="button" className="atlas-pin" key={place.id}
          onClick={() => setChosen(place)} aria-pressed={chosen?.id === place.id}
          style={{ left: `${place.x}%`, top: `${place.y}%` }}>
          <MapPin size={14} aria-hidden="true" />{place.name}
        </button>)}
      </div>
    </div>
    {chosen && places.some(place => place.id === chosen.id) && <p className="atlas-selected" role="status">
      <strong>{chosen.name}</strong> · {chosen.layer}</p>}
    <ul className="atlas-results">{places.map(place => <li key={place.id}>{place.name} {place.layer === "Saját jelölők" &&
      <button type="button" onClick={() => {
        if (window.confirm(`${place.name} jelölő törlése?`)) onChange(markers.filter(marker => marker.id !== place.id));
      }}>Jelölő törlése</button>}</li>)}</ul>
    <form onSubmit={event => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      const name = data.get("name").trim();
      const x = Number(data.get("x"));
      const y = Number(data.get("y"));
      if (name && [x, y].every(value => Number.isFinite(value) && value >= 0 && value <= 100)) {
        onChange([...markers, { id: crypto.randomUUID(), name, x, y, layer: "Saját jelölők" }]);
        event.currentTarget.reset();
      }
    }}>
      <label>Jelölő neve<input name="name" required maxLength={80} /></label>
      <label>Vízszintes hely (%)<input name="x" type="number" min="0" max="100" required /></label>
      <label>Függőleges hely (%)<input name="y" type="number" min="0" max="100" required /></label>
      <button>Jelölő mentése</button>
    </form>
  </section>;
}

const fields = {
  name: "Név", type: "Faj vagy típus", description: "Leírás", appearance: "Külső",
  habitat: "Élőhely", behavior: "Viselkedés", attributes: "Főértékek", skills: "Jártasságok",
  combat: "Harci értékek és életerő", magic: "Mágia", powers: "Képességek", equipment: "Felszerelés",
  reference: "Forrás vagy megjegyzés",
};

export function Bestiary({ entries, onChange, viewMemory }) {
  const [query, updateQuery] = useState(viewMemory?.bestiaryQuery ?? "");
  const setQuery = rememberViewValue(viewMemory, "bestiaryQuery", updateQuery);
  const [editing, setEditing] = useState(null);
  const [type, setType] = useState("");
  const types = [...new Set(entries.map(entry => entry.type).filter(value => typeof value === "string" && value))].sort((a, b) => a.localeCompare(b, "hu"));
  const activeType = types.includes(type) ? type : "";
  const filtered = entries.filter(entry => (!activeType || entry.type === activeType) &&
    `${entry.name} ${entry.type} ${entry.habitat}`.toLocaleLowerCase("hu").includes(query.trim().toLocaleLowerCase("hu")));
  return <section className="bestiary-panel">
    <header className="test-feature-title"><BookOpen aria-hidden="true" /><h3>Bestiárium</h3></header>
    <p>A saját lények adatai helyben tárolódnak.</p>
    <label>Keresés név, faj vagy élőhely szerint<input type="search" value={query} onChange={event => setQuery(event.target.value)} /></label>
    <label>Szűrés faj vagy típus szerint<select value={activeType} onChange={event => setType(event.target.value)}>
      <option value="">Minden faj és típus</option>
      {types.map(value => <option key={value}>{value}</option>)}
    </select></label>
    <button type="button" onClick={() => setEditing({ id: crypto.randomUUID() })}>Saját lény hozzáadása</button>
    {editing && <CreatureEditor key={editing.id} draft={editing} onCancel={() => setEditing(null)} onSave={next => {
      onChange(entries.some(entry => entry.id === next.id) ? entries.map(entry => entry.id === next.id ? next : entry) : [...entries, next]);
      setEditing(null);
    }} />}
    {filtered.length ? <ul className="bestiary-cards">{filtered.map(entry => <li key={entry.id}>
      <details><summary><PawPrint size={19} aria-hidden="true" /> <span>{entry.name} · {entry.type} · Saját lény</span></summary>
        <dl>{Object.entries(fields).filter(([key]) => key !== "name" && key !== "type" && entry[key]).map(([key, label]) =>
          <div key={key}><dt>{label}</dt><dd>{entry[key]}</dd></div>)}</dl>
        <div className="test-actions">
          <button type="button" onClick={() => setEditing(entry)}>Szerkesztés</button>
          <button type="button" onClick={() => setEditing({ ...entry, id: crypto.randomUUID(), name: `${entry.name} (másolat)` })}>Másolás</button>
        </div>
      </details>
    </li>)}</ul> : <p className="bestiary-empty"><PawPrint size={25} aria-hidden="true" /> Nincs találat.</p>}
  </section>;
}


function CreatureEditor({ draft, onSave, onCancel }) {
  return <form onSubmit={event => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const next = { ...draft, ...Object.fromEntries([...data].map(([key, value]) => [key, value.trim()])) };
    if (next.name && next.type) onSave(next);
  }}>
      {Object.entries(fields).map(([key, label]) => <label key={key}>{label}{
        key === "name" || key === "type" ? <input name={key} defaultValue={draft[key]} required maxLength={120} />
          : <textarea name={key} defaultValue={draft[key]} rows={2} maxLength={4000} />
      }</label>)}
    <button>Saját lény mentése</button>
    <button type="button" onClick={onCancel}>Mégse</button>
  </form>;
}

export function CreatureGenerator({ onSave }) {
  const [drafts, setDrafts] = useState([]);
  return <section>
    <h3>NPC- és lénygenerátor</h3>
    <p>Egyedi, szerkeszthető vázlatok. A KM ellenőrzi a végleges értékeket és az előfeltételeket.</p>
    <form onSubmit={event => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      const count = Number(data.get("count"));
      if (!Number.isInteger(count) || count < 1 || count > 10) return;
      const next = Array.from({ length: count }, () => {
        const draft = generateNpc({ id: crypto.randomUUID(), type: data.get("type").trim(),
          role: data.get("role"), strength: Number(data.get("strength")), habitat: data.get("habitat").trim() });
        return draft && { ...draft, description: data.get("kind"), behavior: data.get("behavior").trim(),
          equipment: data.get("equipment").trim(), magic: data.get("magic").trim(), powers: data.get("powers").trim() };
      }).filter(Boolean);
      setDrafts(next);
    }}>
      <label>Kategória <select name="kind"><option>NPC</option><option>Szörny</option></select></label>
      <label>Generált lény faja vagy típusa <input name="type" required maxLength={120} /></label>
      <label>Szerepkör <select name="role">{npcRoles.map(role => <option key={role}>{role}</option>)}</select></label>
      <label>Erősség <input type="number" name="strength" min="1" max="10" defaultValue="4" required /></label>
      <label>Csoport létszáma <input type="number" name="count" min="1" max="10" defaultValue="1" required /></label>
      <label>Élőhely <input name="habitat" maxLength={120} /></label>
      <label>Viselkedés <input name="behavior" maxLength={400} /></label>
      <label>Felszerelés <input name="equipment" maxLength={400} /></label>
      <label>Mágikus adottságok <input name="magic" maxLength={400} /></label>
      <label>Egyedi képességek <input name="powers" maxLength={400} /></label>
      <button>{drafts.length ? "Újragenerálás" : "Új vázlat generálása"}</button>
    </form>
    {drafts.map(draft => <details key={draft.id} open={drafts.length === 1}>
      <summary>{draft.name} · {draft.type}</summary>
      <CreatureEditor draft={draft} onCancel={() => setDrafts(items => items.filter(item => item.id !== draft.id))}
        onSave={entry => {
          onSave(entry);
          setDrafts(items => items.filter(item => item.id !== draft.id));
        }} />
    </details>)}
  </section>;
}
