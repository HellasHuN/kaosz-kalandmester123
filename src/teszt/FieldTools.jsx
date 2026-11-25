import { useState } from "react";
import { generateNpc, npcRoles } from "./npcDraft.js";

const samplePlaces = [
  { id: "fogadó", name: "Ködbe veszett fogadó", x: 36, y: 54, layer: "Helyszínek" },
  { id: "híd", name: "Kőhíd", x: 65, y: 38, layer: "Helyszínek" },
  { id: "erdő", name: "Ködös erdő", x: 22, y: 27, layer: "Táj" },
  { id: "domb", name: "Szeles dombvidék", x: 71, y: 75, layer: "Táj" },
];

export function MapTool({ markers, onChange }) {
  const [zoom, setZoom] = useState(1);
  const [query, setQuery] = useState("");
  const [layers, setLayers] = useState(["Helyszínek", "Táj", "Saját jelölők"]);
  const places = [...samplePlaces, ...markers].filter(place => layers.includes(place.layer) &&
    place.name.toLocaleLowerCase("hu").includes(query.trim().toLocaleLowerCase("hu")));
  return <section>
    <h3>Világtérkép</h3>
    <p>Bemutatótérkép saját helyszínekkel. A pontok és a táj a mintakalandhoz tartoznak.</p>
    <label>Helyszín keresése<input type="search" value={query} onChange={event => setQuery(event.target.value)} /></label>
    <div className="test-actions">
      <button type="button" onClick={() => setZoom(Math.max(1, zoom - .25))} disabled={zoom === 1}>Kicsinyítés</button>
      <button type="button" onClick={() => setZoom(Math.min(3, zoom + .25))} disabled={zoom === 3}>Nagyítás</button>
    </div>
    <fieldset><legend>Rétegek</legend>{["Helyszínek", "Táj", "Saját jelölők"].map(layer =>
      <label key={layer}><span><input type="checkbox" checked={layers.includes(layer)} onChange={event =>
        setLayers(event.target.checked ? [...layers, layer] : layers.filter(item => item !== layer))} /> {layer}</span></label>
    )}</fieldset>
    <div className="test-map-viewport" tabIndex={0} aria-label="Bemutatótérkép, görgethető">
      <div className="test-map" style={{ width: `${zoom * 100}%`, height: `${zoom * 280}px` }}>
        {places.map(place => <span key={place.id} style={{ left: `${place.x}%`, top: `${place.y}%` }}>◆ {place.name}</span>)}
      </div>
    </div>
    <ul>{places.map(place => <li key={place.id}>{place.name} {place.layer === "Saját jelölők" &&
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

export function Bestiary({ entries, onChange }) {
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(null);
  const filtered = entries.filter(entry =>
    `${entry.name} ${entry.type} ${entry.habitat}`.toLocaleLowerCase("hu").includes(query.trim().toLocaleLowerCase("hu")));
  return <section>
    <h3>Bestiárium</h3>
    <p>A saját lények adatai helyben tárolódnak.</p>
    <label>Keresés név, faj vagy élőhely szerint<input type="search" value={query} onChange={event => setQuery(event.target.value)} /></label>
    <button type="button" onClick={() => setEditing({ id: crypto.randomUUID() })}>Saját lény hozzáadása</button>
    <details>
      <summary>NPC- és lénygenerátor</summary>
      <p>Egyedi, szerkeszthető vázlat. Az erősség a generálás beállítása.</p>
      <form onSubmit={event => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const draft = generateNpc({ id: crypto.randomUUID(), type: data.get("type"),
          role: data.get("role"), strength: Number(data.get("strength")), habitat: data.get("habitat").trim() });
        if (draft) setEditing(draft);
      }}>
        <label>Generált lény faja vagy típusa <input name="type" required maxLength={120} /></label>
        <label>Szerepkör <select name="role">{npcRoles.map(role => <option key={role}>{role}</option>)}</select></label>
        <label>Erősség <input type="number" name="strength" min="1" max="10" defaultValue="4" required /></label>
        <label>Élőhely <input name="habitat" maxLength={120} /></label>
        <button type="submit">Új vázlat generálása</button>
      </form>
    </details>
    {editing && <form key={editing.id} onSubmit={event => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      const next = { id: editing.id, ...Object.fromEntries([...data].map(([key, value]) => [key, value.trim()])) };
      if (!next.name || !next.type) return;
      onChange(entries.some(entry => entry.id === next.id) ? entries.map(entry => entry.id === next.id ? next : entry) : [...entries, next]);
      setEditing(null);
    }}>
      {Object.entries(fields).map(([key, label]) => <label key={key}>{label}{
        key === "name" || key === "type" ? <input name={key} defaultValue={editing[key]} required maxLength={120} />
          : <textarea name={key} defaultValue={editing[key]} rows={2} maxLength={4000} />
      }</label>)}
      <button>Saját lény mentése</button>
      <button type="button" onClick={() => setEditing(null)}>Mégse</button>
    </form>}
    {filtered.length ? <ul>{filtered.map(entry => <li key={entry.id}>
      <details><summary>{entry.name} · {entry.type} · Saját lény</summary>
        <dl>{Object.entries(fields).filter(([key]) => key !== "name" && key !== "type" && entry[key]).map(([key, label]) =>
          <div key={key}><dt>{label}</dt><dd>{entry[key]}</dd></div>)}</dl>
        <div className="test-actions">
          <button type="button" onClick={() => setEditing(entry)}>Szerkesztés</button>
          <button type="button" onClick={() => setEditing({ ...entry, id: crypto.randomUUID(), name: `${entry.name} (másolat)` })}>Másolás</button>
        </div>
      </details>
    </li>)}</ul> : <p>Nincs találat.</p>}
  </section>;
}
