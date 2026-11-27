import { inheritanceOptions } from "./felverOrokles.js";

export default function OroklesPanel({ ancestry, records, onChange }) {
  const options = inheritanceOptions(ancestry);
  return <section className="panel creation-panel" aria-labelledby="inheritance-title">
    <h3 id="inheritance-title">Örökölhető faji tulajdonságok</h3>
    <p>A Mesélő jóváhagyása igazolja, hogy a tisztavérű szülő rendelkezett a tulajdonsággal.</p>
    {options.length === 0 ? <p>Nincs igazolható öröklési lehetőség a megadott származásból.</p>
      : <div className="skills-table-container"><table className="skills-table">
        <thead><tr><th>Tulajdonság</th><th>Forrás</th><th>Hatás és költség</th><th>Állapot</th></tr></thead>
        <tbody>{options.map(({ key, name, source, page, effect, modifier, signature }) => {
          const selected = records[key];
          const update = (value) => onChange(key, value && { signature, ...value });
          return <tr key={key}>
            <th scope="row">{name}</th><td>{source} · {page}. o.</td>
            <td>{effect} {modifier ? "A felár a jártasság árában szerepel." : "Az alapkönyv külön öröklési árat nem ad meg."}</td>
            <td>
              <label><input type="checkbox" checked={!!selected}
                onChange={(event) => update(event.target.checked ? { approved: false } : null)} /> Kiválasztva</label>
              {selected && <>
                {!modifier && <label>Mesélői hatás és feltételek
                  <input value={selected.note ?? ""} onChange={(event) => update({ note: event.target.value, approved: false })} />
                </label>}
                <label><input type="checkbox" checked={selected.approved === true}
                  disabled={!modifier && !selected.note?.trim()}
                  onChange={(event) => update({ ...selected, approved: event.target.checked })} />
                  {selected.approved ? "KM által jóváhagyva" : "Jóváhagyásra vár"}</label>
                {!selected.approved && <button type="button" disabled={!modifier && !selected.note?.trim()}
                  onClick={() => update({ ...selected, approved: true, approvalSource: "test" })}>KM jóváhagyása (TESZT)</button>}
              </>}
            </td>
          </tr>;
        })}</tbody>
      </table></div>}
  </section>;
}
