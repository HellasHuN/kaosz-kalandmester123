import { useState } from "react";
import { packageChoiceOptions, packageError, packageSkills, trainingPackages } from "./kepzesiCsomagok.js";

export default function KepzesiCsomagValaszto({ character, onChange }) {
  const [id, setId] = useState("");
  const [record, setRecord] = useState({ choices: [] });
  const [message, setMessage] = useState("");
  const selected = character.trainingPackages ?? {};
  const entry = trainingPackages[id];
  const skills = packageSkills(id, record);
  return <details>
    <summary>Rendek és iskolák</summary>
    {Object.entries(selected).map(([key, value]) => trainingPackages[key] && <p key={key}>
      <strong>{trainingPackages[key].name}</strong> · {value.paidJp} Jp · {packageError(character, key, value) || "Mesélő jóváhagyta"}{" "}
      <button type="button" onClick={() => setMessage(onChange(key))}>Csomag eltávolítása</button>
    </p>)}
    <label>Képzési csomag
      <select value={id} onChange={(event) => { setId(event.target.value); setRecord({ choices: [] }); setMessage(""); }}>
        <option value="">Válassz csomagot</option>
        {Object.entries(trainingPackages).map(([key, option]) =>
          <option key={key} value={key} disabled={Boolean(selected[key]) || (option.women && character.gender !== "Nő")}>
            {option.name} · {option.price} Jp
          </option>)}
      </select>
    </label>
    {entry && <>
      <p>{entry.price} Jp · Alapkönyv, {entry.pages}. o.</p>
      <p>{entry.requirements}</p>
      <p>{entry.effects}</p>
      {entry.choices?.map((choice, index) => <label key={choice.label}>{choice.label} · {choice.levels?.join("/") ?? choice.level}. szint
        <select value={record.choices[index] ?? ""} onChange={(event) => {
          const choices = [...record.choices];
          choices[index] = event.target.value;
          setRecord({ choices });
        }}>
          <option value="">Válassz szakosodást</option>
          {packageChoiceOptions(choice).map((name) => <option key={name}>{name}</option>)}
        </select>
      </label>)}
      {Object.keys(skills).length > 0 && <ul>
        {Object.entries(skills).map(([name, level]) => <li key={name}>{name} · {level}. szint</li>)}
      </ul>}
      <label><input type="checkbox" checked={Boolean(record.approved)}
        onChange={(event) => setRecord({ ...record, approved: event.target.checked })} />
        A Mesélő jóváhagyta a tagságot, a feltételeket és a választott szakosodásokat
      </label>
      <label><input type="checkbox" checked={Boolean(record.overlapApproved)}
        onChange={(event) => setRecord({ ...record, overlapApproved: event.target.checked })} />
        Több tagság vagy szintátfedés esetén a Mesélő jóváhagyta a kombinációt és a teljes csomagárakat
      </label>
      <button type="button" onClick={() => {
        const error = onChange(id, record);
        setMessage(error);
        if (!error) { setId(""); setRecord({ choices: [] }); }
      }}>Csomag felvétele</button>
    </>}
    {message && <p role="status">{message}</p>}
  </details>;
}
