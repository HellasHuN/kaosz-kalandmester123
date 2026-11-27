import { useState } from "react";

export default function ElhivatottsagValaszto({ level, maximum, creation = false, onChange }) {
  const [pending, setPending] = useState(null);
  const chosen = pending ?? level;

  return <div><label>
    Elhivatottság · {creation ? "400 Jp szintenként" : "szerepjáték alapján, Jp nélkül"}
    <select value={chosen} onChange={event => setPending(Number(event.target.value))}>
      {Array.from({ length: maximum + 1 }, (_, rank) =>
        <option key={rank} value={rank} disabled={rank > maximum && rank !== level}>
          {rank === 0 ? "Nincs rögzítve" : `${rank}. szint`}
        </option>)}
      {level > maximum && <option value={level}>{level}. szint (KM)</option>}
    </select>
  </label>
    {(pending !== null || (creation && level > 0)) && <button type="button" onClick={() => {
      onChange(chosen, true);
      setPending(null);
    }}>KM jóváhagyása (TESZT)</button>}
  </div>;
}
