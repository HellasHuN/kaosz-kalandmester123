export default function ElhivatottsagValaszto({ level, maximum, creation = false, onChange }) {
  function approve(next) {
    const condition = creation
      ? "A karakter induló szerepe és a forrás szerint jogosult a kiválasztott Elhivatottság-szintre?"
      : "A karakter hitéhez és szerepjátékához illik a kiválasztott Elhivatottság-szint?";
    if (window.confirm(`Kalandmesteri jóváhagyás. ${condition}`)) onChange(next, true);
  }

  return <div><label>
    Elhivatottság · {creation ? "400 Jp szintenként" : "szerepjáték alapján, Jp nélkül"}
    <select value={level} onChange={(event) => approve(Number(event.target.value))}>
      {Array.from({ length: Math.max(maximum, level) + 1 }, (_, rank) =>
        <option key={rank} value={rank} disabled={rank > maximum && rank !== level}>
          {rank === 0 ? "Nincs rögzítve" : `${rank}. szint`}
        </option>)}
    </select>
  </label>
    {creation && level > 0 && <button type="button" onClick={() => approve(level)}>Szint jóváhagyása</button>}
  </div>;
}
