import { rememberViewValue } from "./teszt/useApplicationNavigation.js";
import { useId, useState } from "react";
import { felszereles, felszerelesTipusok } from "./felszerelesAdatok.js";
import { catalog, equipmentDetails, formatStat, labels, readEquipment, statOptions, validEquipmentStat,
  validQuantity, variableStats } from "./felszerelesSzerkesztes.js";
import "./Jartassagok.css";

const quantityError = "A felszerelés darabszáma pozitív egész szám legyen.";
const statError = "Add meg a tárgy minden pontosítandó értékét a megengedett tartományból.";

function EquipmentFields({ item, entry, onQuantity, onStat, onWear }) {
  return <div className="equipment-creation-options">
    <label>Darabszám
      <input type="number" min={1} max={Number.MAX_SAFE_INTEGER} step={1}
        aria-label={`${item.name} darabszáma`} value={entry.quantity ?? ""}
        onChange={(event) => onQuantity(event.target.value)} />
    </label>
    {variableStats(item).map(([key, [min, max]]) => (
      <label key={key}>{labels[key]} ({formatStat(min)}–{formatStat(max)})
        <select value={entry.values?.[key] ?? ""} onChange={(event) => onStat(key, event.target.value, min, max)}>
          <option value="" disabled>Válassz értéket!</option>
          {statOptions(min, max, key === "massKg" ? entry.values?.[key] : undefined).map((value) => (
            <option key={value} value={value}>{formatStat(value)}</option>
          ))}
        </select>
      </label>
    ))}
    {item.kind === "armor" && <label className="magic-checkbox">
      <input type="checkbox" checked={entry.equipped === true} onChange={(event) => onWear(event.target.checked)} />
      Viseli
    </label>}
  </div>;
}

export default function AlkotasiFelszereles({ equipment, onChange, viewMemory }) {
  const headingId = useId();
  const searchId = useId();
  const pendingId = useId();
  const [query, updateQuery] = useState(viewMemory?.creationEquipmentQuery ?? "");
  const setQuery = rememberViewValue(viewMemory, "creationEquipmentQuery", updateQuery);
  const [pending, setPending] = useState(null);
  const [message, setMessage] = useState("");
  const current = readEquipment(equipment);
  const search = query.trim().toLocaleLowerCase("hu");
  const choices = search ? felszereles.filter((item) =>
    [item.name, felszerelesTipusok[item.kind], item.kind].some((label) => label?.toLocaleLowerCase("hu").includes(search))) : [];
  const selected = pending && catalog.get(pending.catalogId);

  function choose(item) {
    setPending({ catalogId: item.id, quantity: 1, values: {},
      ...(item.kind === "armor" && { equipped: false }) });
    setQuery("");
    setMessage("");
  }

  function add() {
    if (!validQuantity(pending.quantity)) {
      setMessage(quantityError);
      return;
    }
    if (variableStats(selected).some(([key, [min, max]]) => !validEquipmentStat(key, pending.values[key], min, max))) {
      setMessage(statError);
      return;
    }
    const entry = { ...pending, id: crypto.randomUUID(), quantity: Number(pending.quantity) };
    onChange({ ...current, items: [...current.items, entry] });
    setPending(null);
    setMessage("");
  }

  function update(index, entry) {
    onChange({ ...current, items: current.items.map((item, position) => position === index ? entry : item) });
    setMessage("");
  }

  return <div className="creation-equipment">
    <section className="skills-reference general-frame" aria-labelledby={headingId}>
      <h2 id={headingId}>Felszerelés</h2>
      <label htmlFor={searchId}>Új tárgy keresése név vagy típus alapján</label>
      <input id={searchId} type="search" value={query} onChange={(event) => setQuery(event.target.value)} />
      {search && (choices.length ? <ul className="skills-results">
        {choices.map((item) => <li key={item.id}>
          <button type="button" onClick={() => choose(item)}>{item.name}</button>
        </li>)}
      </ul> : <p>Nincs felvehető találat.</p>)}
      {selected && <section className="creation-skill-pending" aria-labelledby={pendingId}>
        <h3 id={pendingId}>Kiválasztva: {selected.name}</h3>
        {selected.price && <p>Könyv szerinti ár · {selected.price}</p>}
        <EquipmentFields item={selected} entry={pending}
          onQuantity={(quantity) => setPending({ ...pending, quantity })}
          onStat={(key, value) => setPending({ ...pending, values: { ...pending.values, [key]: Number(value) } })}
          onWear={(equipped) => setPending({ ...pending, equipped })} />
        <div className="creation-skill-controls">
          <button type="button" onClick={add}>Hozzáadás</button>
          <button type="button" onClick={() => { setPending(null); setMessage(""); }}>Mégse</button>
        </div>
      </section>}
      <p role="status" hidden={!message}>{message}</p>
      <div className="skills-reference-scroll">
        <table role="table">
          <thead role="rowgroup"><tr role="row"><th scope="col" role="columnheader">Tárgy</th><th scope="col" role="columnheader">Mennyiség és tulajdonságok</th></tr></thead>
          <tbody role="rowgroup">
            {current.items.map((entry, index) => {
              const item = catalog.get(entry.catalogId) ?? { name: entry.catalogId };
              return <tr role="row" key={`${entry.id}-${index}`}>
                <th scope="row" role="rowheader">{item.name}
                  <small>{felszerelesTipusok[item.kind] ?? "Régi katalógustétel"}</small>
                  {item.price && <small>Könyv szerinti ár · {item.price}</small>}
                  {item.stats && <small>{equipmentDetails(item, entry)}</small>}
                </th>
                <td role="cell" data-label="Mennyiség és tulajdonságok">
                  <EquipmentFields item={item} entry={entry}
                    onQuantity={(quantity) => {
                      if (validQuantity(quantity)) update(index, { ...entry, quantity: Number(quantity) });
                      else setMessage(quantityError);
                    }}
                    onStat={(key, value, min, max) => {
                      if (validEquipmentStat(key, value, min, max)) {
                        update(index, { ...entry, values: { ...entry.values, [key]: Number(value) } });
                      } else setMessage(statError);
                    }}
                    onWear={(equipped) => update(index, { ...entry, equipped })} />
                  <button type="button" aria-label={`${item.name} eltávolítása`} onClick={() => {
                    onChange({ ...current, items: current.items.filter((_, position) => position !== index) });
                    setMessage("");
                  }}>Eltávolítás</button>
                </td>
              </tr>;
            })}
            {!current.items.length && <tr role="row"><td role="cell" colSpan={2}>Nincs felvett felszerelés.</td></tr>}
          </tbody>
        </table>
      </div>
      <label>Megjegyzések
        <textarea rows={3} value={current.notes ?? ""} onChange={(event) =>
          onChange({ ...(equipment ?? current), notes: event.target.value })} />
      </label>
    </section>
  </div>;
}
