import { useState } from "react";
import { startingApprovalContext, startingTrainingCap, startingTrainingSources, seniorStartingCap } from "./induloJartassagEngedelyek.js";
import { creationSkillLimit, creationSkillNames, ordinaryCreationSkillLimit } from "./alkotasiJartassagok.js";
import { skillPrices } from "./jpSzamitas.js";
import { gilfStartingSkillCap } from "./gilfMagia.js";

export default function InduloJartassagEngedelyek({ character, onChange }) {
  const [name, setName] = useState("");
  const approvals = character.startingSkillApprovals ?? {};
  const exceptions = approvals.exceptions ?? {};
  const senior = approvals.senior ?? {};
  const record = exceptions[name] ?? {};
  const context = startingApprovalContext(character);
  const limit = name ? ordinaryCreationSkillLimit(character, name) : 0;
  const max = name ? Math.min(skillPrices(name).length, startingTrainingCap(record.source, name, character)) : 0;
  function update(changes) {
    onChange({ ...approvals, exceptions: { ...exceptions, [name]: { ...record, ...changes } } });
  }
  return <details>
    <summary>Induló jártasságszintek mesélői jóváhagyása</summary>
    {character.creationStage === "senius" && <fieldset>
      <legend>Senius induló plafon</legend>
      <label>Választott plafon
        <select value={senior.level ?? ""} onChange={(event) => onChange({ ...approvals,
          senior: { level: Number(event.target.value), approved: false } })}>
          <option value="">6. szint (alap)</option><option value="6">6. szint</option><option value="7">7. szint</option>
        </select>
      </label>
      <label><input type="checkbox" disabled={!senior.level}
        checked={senior.approved === true && JSON.stringify(senior.context) === JSON.stringify(context)}
        onChange={(event) => onChange({ ...approvals, senior: { ...senior, approved: event.target.checked, context } })} />
        A Mesélő jóváhagyta a választott plafont
      </label>
      <p>Érvényes általános plafon: {seniorStartingCap(character)}. szint</p>
    </fieldset>}
    <label>Érintett jártasság
      <select value={name} onChange={(event) => setName(event.target.value)}>
        <option value="">Válassz jártasságot</option>
        {creationSkillNames.filter((skill) => Math.min(skillPrices(skill).length, gilfStartingSkillCap(character, skill)) >
          ordinaryCreationSkillLimit(character, skill) ||
          Object.hasOwn(exceptions, skill)).map((skill) => <option key={skill}>{skill}</option>)}
      </select>
    </label>
    {name && <>
      <label>Kivétel alapja
        <select value={record.source ?? ""} onChange={(event) => update({ source: event.target.value, level: 0, approved: false })}>
          <option value="">Válassz képzést vagy egyedi kivételt</option>
          {Object.entries(startingTrainingSources).filter(([key]) => startingTrainingCap(key, name, character) > limit ||
            key === record.source).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
      </label>
      <label>Engedélyezett szint
        <select value={record.level || ""} onChange={(event) => update({ level: Number(event.target.value), approved: false })}>
          <option value="">Válassz szintet</option>
          {Array.from({ length: Math.max(0, max - limit) }, (_, index) => index + limit + 1)
            .map((level) => <option key={level}>{level}</option>)}
        </select>
      </label>
      <label>Képzés vagy kivétel indoka
        <input value={record.reason ?? ""} maxLength={200}
          onChange={(event) => update({ reason: event.target.value, approved: false })} />
      </label>
      <label><input type="checkbox" checked={record.approved === true && JSON.stringify(record.context) === JSON.stringify(context)}
        disabled={!record.reason?.trim() || record.level <= limit || record.level > max}
        onChange={(event) => update({ approved: event.target.checked, context })} />
        A Mesélő ellenőrizte a képzés jogcímét és jóváhagyta ezt a szintet
      </label>
      <p>Érvényes plafon: {creationSkillLimit(character, name)}. szint.
        {record.approved && record.level > creationSkillLimit(character, name) && " A kivétel jelenleg nem érvényes."}
      </p>
    </>}
  </details>;
}
