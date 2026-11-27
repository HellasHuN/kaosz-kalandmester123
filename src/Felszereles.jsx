import { useEffect, useId, useImperativeHandle, useRef, useState } from "react";
import { ArmorDiagram } from "./ArmorDiagram.jsx";
import "./Felszereles.css";
import { felszereles, felszerelesTipusok } from "./felszerelesAdatok.js";

import { catalog, labels, formatStat, readEquipment, variableStats, statOptions, equipmentDetails,
  validQuantity, validEquipmentStat } from "./felszerelesSzerkesztes.js";

export default function Felszereles({ character, onSave, ref }) {
  const searchId = useId();
  const [query, setQuery] = useState("");
  const [inventoryQuery, setInventoryQuery] = useState("");
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
  const inventorySearch = inventoryQuery.trim().toLocaleLowerCase("hu");
  const matchesSearch = (item, term) =>
    `${item.name} ${felszerelesTipusok[item.kind] ?? ""}`.toLocaleLowerCase("hu").includes(term);
  const choices = felszereles.filter(item => matchesSearch(item, search));
  const rows = current.items.map((entry) => ({
    entry,
    item: catalog.get(entry.catalogId) ?? { name: entry.catalogId },
  })).filter(({ item }) => matchesSearch(item, inventorySearch));
  const needsDetails = current.items.some((entry) =>
    variableStats(catalog.get(entry.catalogId)).some(([key]) => entry.values[key] == null || entry.values[key] === ""));

  function addItem(catalogId) {
    const entry = {
      id: crypto.randomUUID(), catalogId, quantity: 1, values: {},
      ...(catalog.get(catalogId)?.kind === "armor" && { equipped: false }),
    };
    setDraft((previous) => ({ ...previous, items: [...previous.items, entry] }));
    setNewEntryId(entry.id);
    setInventoryQuery("");
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
      if (!validQuantity(quantity)) {
        window.alert("A felszerelés darabszáma pozitív egész szám legyen.");
        return false;
      }

      const values = { ...entry.values };
      for (const [key, [min, max]] of variableStats(catalog.get(entry.catalogId))) {
        const raw = values[key];
        const value = Number(raw);
        if (!validEquipmentStat(key, raw, min, max)) {
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
    start: () => { setQuery(""); setInventoryQuery(""); setDraft(saved); },
    save,
    cancel: closeEditor,
  }));

  return (
    <>
    <ArmorDiagram character={editing ? { ...character, equipment: draft } : character} />
    <section className="general-frame sheet-inventory" data-unsaved={editing && JSON.stringify(draft) !== JSON.stringify(saved)}>
      <h2>Felszerelés és egyéb adatok</h2>
      <p className="equipment-view-status">{editing ? "Szerkesztés" : "Megtekintés"}</p>
      {needsDetails && <p>A pontosítandó értékeket szerkesztéskor kell megadni a mentéshez.</p>}
      <form onSubmit={(event) => event.preventDefault()}>
        <label className="equipment-search" htmlFor={`${searchId}-inventory`}>Keresés a felszerelésben</label>
        <input id={`${searchId}-inventory`} type="search" value={inventoryQuery} onChange={(event) => setInventoryQuery(event.target.value)} />
        {rows.length ? (
          <div className="skills-table-container">
            <table className="equipment-table" role="table">
              <thead role="rowgroup">
                <tr role="row">
                  <th scope="col" role="columnheader">Tárgy</th>
                  <th scope="col" role="columnheader">Típus</th>
                  <th scope="col" role="columnheader">Darab</th>
                  <th scope="col" role="columnheader">Tulajdonságok</th>
                  <th scope="col" role="columnheader">Könyv szerinti ár</th>
                  <th scope="col" role="columnheader">Viselés</th>
                  {editing && <th scope="col" role="columnheader">Eltávolítás</th>}
                </tr>
              </thead>
              <tbody role="rowgroup">
                {rows.map(({ item, entry }) => (
                  <tr role="row" key={entry.id}>
                    <th scope="row" role="rowheader">{item.name}</th>
                    <td role="cell" data-label="Típus">{felszerelesTipusok[item.kind] ?? "—"}</td>
                    <td role="cell" data-label="Darab">
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
                    <td role="cell" data-label="Tulajdonságok">
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
                    <td role="cell" data-label="Könyv szerinti ár">{item.price ?? "—"}</td>
                    <td role="cell" data-label="Viselés">{item.kind !== "armor" ? "—" : editing ? (
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
                      <td role="cell" className="equipment-row-action">
                        <button type="button" aria-label={`${item.name} eltávolítása`} onClick={() => removeItem(entry.id)}>Eltávolítás</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p>{inventorySearch ? "Nincs találat." : "Nincs felvett felszerelés."}</p>}
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
                <table className="equipment-table" role="table">
                  <thead role="rowgroup"><tr role="row"><th scope="col" role="columnheader">Tárgy</th><th scope="col" role="columnheader">Típus</th><th scope="col" role="columnheader">Tulajdonságok</th><th scope="col" role="columnheader">Könyv szerinti ár</th><th scope="col" role="columnheader">Felvétel</th></tr></thead>
                  <tbody role="rowgroup">
                    {choices.map((item) => (
                      <tr role="row" key={item.id}>
                        <th scope="row" role="rowheader">{item.name}</th>
                        <td role="cell" data-label="Típus">{felszerelesTipusok[item.kind]}</td>
                        <td role="cell" data-label="Tulajdonságok">{equipmentDetails(item)}</td>
                        <td role="cell" data-label="Könyv szerinti ár">{item.price ?? "—"}</td>
                        <td role="cell" className="equipment-row-action"><button type="button" aria-label={`${item.name} hozzáadása`} onClick={() => addItem(item.id)}>Hozzáadás</button></td>
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
    </>
  );
}
