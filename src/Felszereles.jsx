import { useEffect, useId, useImperativeHandle, useRef, useState } from "react";
import { felszereles, felszerelesTipusok } from "./felszerelesAdatok.js";

const emptyEquipment = { items: [], notes: "" };
const catalog = new Map(felszereles.map((item) => [item.id, item]));
const labels = {
  speed: "Gyorsaság", preparation: "Előkészítés (szegmens)", strength: "Erő",
  rangeM: "Lőtáv (m)", massKg: "Tömeg (kg)", armorLevel: "Vértszint", protection: "Védett testrész",
  speedModifier: "GyM", minDamageSp: "Minimális sebzés (Sp)",
  conditionalStrength: "Feltételes fegyvererő", meleeSpeedModifier: "Közelharci GyM",
  oneHandMinStrength: "Egykezes használathoz szükséges Erő", requiredStrength: "Szükséges Erő",
};
const numberFormat = new Intl.NumberFormat("hu-HU");

function formatStat(value) {
  return typeof value === "number" ? numberFormat.format(value) : value;
}

function readEquipment(equipment = emptyEquipment) {
  if (Array.isArray(equipment.items)) return equipment;

  return {
    ...equipment,
    items: Object.entries(equipment.items ?? {}).map(([catalogId, quantity]) => ({
      id: catalogId, catalogId, quantity, values: {},
    })),
  };
}

function variableStats(item) {
  return Object.entries(item?.stats ?? {}).filter(([, value]) => Array.isArray(value));
}

function statOptions(min, max, currentValue) {
  const values = [min, ...Array.from(
    { length: Math.max(0, Math.ceil(max) - Math.floor(min) - 1) },
    (_, index) => Math.floor(min) + index + 1
  ), max];

  // Earlier versions accepted fractional weights. Keep the saved value selectable.
  const current = Number(currentValue);
  if (currentValue != null && currentValue !== "" && current >= min && current <= max) {
    values.push(current);
  }
  return [...new Set(values)].sort((first, second) => first - second);
}

function equipmentDetails(item, entry) {
  const stats = Object.entries(item.stats ?? {}).map(([key, value]) =>
    `${labels[key]}: ${Array.isArray(value)
      ? (entry ? formatStat(entry.values[key] ?? "Pontosítandó") : value.map(formatStat).join("–"))
      : formatStat(value)}`
  );
  const enteredMass = entry?.values.massKg;
  const mass = enteredMass != null && enteredMass !== "" ? Number(enteredMass) : item.stats?.massKg;
  if (typeof mass === "number" && Number(entry?.quantity) > 1) {
    stats.push(`Össztömeg: ${formatStat(mass * Number(entry.quantity))} kg`);
  }
  return stats.join(" · ") || "—";
}

export default function Felszereles({ character, onSave, ref }) {
  const searchId = useId();
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState(null);
  const [newEntryId, setNewEntryId] = useState(null);
  const newStatInput = useRef(null);

  useEffect(() => {
    newStatInput.current?.focus();
  }, [newEntryId]);

  const saved = readEquipment(character.equipment);
  const editing = draft !== null;
  const current = draft ?? saved;
  const search = query.trim().toLocaleLowerCase("hu");
  const matchesSearch = (item) =>
    `${item.name} ${felszerelesTipusok[item.kind] ?? ""}`.toLocaleLowerCase("hu").includes(search);
  const choices = felszereles.filter(matchesSearch);
  const rows = current.items.map((entry) => ({
    entry,
    item: catalog.get(entry.catalogId) ?? { name: entry.catalogId },
  })).filter(({ item }) => editing || matchesSearch(item));
  const needsDetails = current.items.some((entry) =>
    variableStats(catalog.get(entry.catalogId)).some(([key]) => entry.values[key] == null || entry.values[key] === ""));

  function addItem(catalogId) {
    const entry = {
      id: crypto.randomUUID(), catalogId, quantity: 1, values: {},
      ...(catalog.get(catalogId)?.kind === "armor" && { equipped: false }),
    };
    setDraft((previous) => ({ ...previous, items: [...previous.items, entry] }));
    setNewEntryId(entry.id);
  }

  function updateItem(id, update) {
    setDraft((previous) => ({
      ...previous,
      items: previous.items.map((entry) => entry.id === id ? update(entry) : entry),
    }));
  }

  function removeItem(id) {
    setDraft((previous) => ({ ...previous, items: previous.items.filter((entry) => entry.id !== id) }));
  }

  function closeEditor() {
    setDraft(null);
    setQuery("");
    setNewEntryId(null);
  }

  function save() {
    if (JSON.stringify(draft) === JSON.stringify(saved)) {
      closeEditor();
      return true;
    }
    const items = [];
    for (const entry of draft.items) {
      const quantity = Number(entry.quantity);
      if (!Number.isSafeInteger(quantity) || quantity < 1) {
        window.alert("A felszerelés darabszáma pozitív egész szám legyen.");
        return false;
      }

      const values = { ...entry.values };
      for (const [key, [min, max]] of variableStats(catalog.get(entry.catalogId))) {
        const raw = values[key];
        const value = Number(raw);
        if (raw == null || raw === "" || !Number.isFinite(value) || value < min || value > max ||
            (key !== "massKg" && !Number.isInteger(value))) {
          window.alert("Add meg a tárgy minden pontosítandó értékét a megengedett tartományból.");
          return false;
        }
        values[key] = value;
      }
      items.push({ ...entry, quantity, values });
    }
    onSave(character, { ...draft, items });
    closeEditor();
    return true;
  }

  useImperativeHandle(ref, () => ({
    start: () => { setQuery(""); setDraft(saved); },
    save,
    cancel: closeEditor,
  }));

  return (
    <section className="panel equipment-panel" data-unsaved={editing && JSON.stringify(draft) !== JSON.stringify(saved)}>
      <h2>Felszerelés és egyéb adatok</h2>
      <p>{character.name}</p>
      {needsDetails && <p>A pontosítandó értékeket szerkesztéskor kell megadni a mentéshez.</p>}
      <form onSubmit={(event) => event.preventDefault()}>
        {!editing && (
          <>
            <label htmlFor={searchId}>Keresés a felszerelésben</label>
            <input id={searchId} type="search" value={query} onChange={(event) => setQuery(event.target.value)} />
          </>
        )}
        {rows.length ? (
          <div className="skills-table-container">
            <table className="skills-table">
              <thead>
                <tr>
                  <th scope="col">Tárgy</th>
                  <th scope="col">Típus</th>
                  <th scope="col">Darab</th>
                  <th scope="col">Tulajdonságok</th>
                  <th scope="col">Könyv szerinti ár</th>
                  <th scope="col">Viselés</th>
                  {editing && <th scope="col">Eltávolítás</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map(({ item, entry }) => (
                  <tr key={entry.id}>
                    <th scope="row">{item.name}</th>
                    <td>{felszerelesTipusok[item.kind] ?? "—"}</td>
                    <td>
                      {editing ? (
                        <input
                          aria-label={`${item.name} darabszáma`}
                          type="number" min="1" max={Number.MAX_SAFE_INTEGER} step="1" required
                          value={entry.quantity}
                          onChange={(event) => {
                            const quantity = event.target.value;
                            updateItem(entry.id, (current) => ({ ...current, quantity }));
                          }}
                        />
                      ) : entry.quantity}
                    </td>
                    <td>
                      {equipmentDetails(item, entry)}
                      {editing && variableStats(item).map(([key, [min, max]], index) => (
                        <label className="equipment-stat" key={key}>
                          {labels[key]} ({formatStat(min)}–{formatStat(max)})
                          <select
                            ref={entry.id === newEntryId && index === 0 ? newStatInput : undefined}
                            required
                            value={entry.values[key] ?? ""}
                            onChange={(event) => {
                              const value = event.target.value;
                              updateItem(entry.id, (current) => ({
                                ...current, values: { ...current.values, [key]: value },
                              }));
                            }}
                          >
                            <option value="" disabled>Válassz értéket!</option>
                            {statOptions(min, max, key === "massKg"
                              ? saved.items.find((item) => item.id === entry.id)?.values[key]
                              : undefined)
                              .map((value) => <option key={value} value={value}>{formatStat(value)}</option>)}
                          </select>
                        </label>
                      ))}
                    </td>
                    <td>{item.price ?? "—"}</td>
                    <td>{item.kind !== "armor" ? "—" : editing ? (
                      <label className="magic-checkbox">
                        <input type="checkbox" checked={entry.equipped === true}
                          onChange={(event) => {
                            const equipped = event.target.checked;
                            updateItem(entry.id, (current) => ({ ...current, equipped }));
                          }} />
                        Viseli
                      </label>
                    ) : entry.equipped === true ? <strong className="equipment-worn">Viseli</strong>
                      : entry.equipped === false ? "Levett vért" : "Viselés nincs jelölve"}</td>
                    {editing && (
                      <td>
                        <button className="skills-remove" type="button" aria-label={`${item.name} eltávolítása`} onClick={() => removeItem(entry.id)}>×</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p>{!editing && search ? "Nincs találat." : "Nincs felvett felszerelés."}</p>}
        {editing && (
          <>
            <label htmlFor={searchId}>Új tárgy keresése név vagy típus alapján</label>
            <input
              id={searchId}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Enter") event.preventDefault(); }}
            />
            {search && (choices.length ? (
              <div className="skills-table-container equipment-results">
                <table className="skills-table">
                  <thead><tr><th scope="col">Tárgy</th><th scope="col">Típus</th><th scope="col">Tulajdonságok</th><th scope="col">Könyv szerinti ár</th><th scope="col">Felvétel</th></tr></thead>
                  <tbody>
                    {choices.map((item) => (
                      <tr key={item.id}>
                        <th scope="row">{item.name}</th>
                        <td>{felszerelesTipusok[item.kind]}</td>
                        <td>{equipmentDetails(item)}</td>
                        <td>{item.price ?? "—"}</td>
                        <td><button type="button" aria-label={`${item.name} hozzáadása`} onClick={() => addItem(item.id)}>Hozzáadás</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p>Nincs felvehető találat.</p>)}
          </>
        )}
        <h3>Egyéb adatok</h3>
        {editing ? (
          <>
            <label htmlFor={`${searchId}-notes`}>Megjegyzések</label>
            <textarea id={`${searchId}-notes`} rows="3" value={current.notes} onChange={(event) => {
              const notes = event.target.value;
              setDraft((previous) => ({ ...previous, notes }));
            }} />
          </>
        ) : (
          <>
            <p className="equipment-notes">{current.notes || "Nincs megjegyzés."}</p>
          </>
        )}
      </form>
    </section>
  );
}
