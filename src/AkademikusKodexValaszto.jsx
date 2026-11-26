import { academicCodices } from "./teszt/academic.js";

export default function AkademikusKodexValaszto({ specialization, onChange }) {
  const codex = specialization?.codex ?? "";
  return <label>Alapkódex
    <select value={codex} onChange={(event) => onChange(event.target.value)}>
      <option value="">Általános akadémikus</option>
      {codex && !academicCodices.includes(codex) && <option disabled>{codex}</option>}
      {academicCodices.map(value => <option key={value}>{value}</option>)}
    </select>
  </label>;
}
