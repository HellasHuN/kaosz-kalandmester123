import { attributeAdjustmentLimit, attributes, characterStats, characterAdjustments, effectiveAttribute, withEffectiveStrength } from "./karakterFoeertekek.js";
import { magicLimits, readMagic } from "./magiaSzabalyok.js";
import { maxHealth, woundLevel, woundThresholds } from "./eletero.js";
import { armorProtection } from "./felszereltVert.js";
import { characterSpeed } from "./gyorsasag.js";
import figure from "./assets/theme/pancelzat-karakter-referencia.webp";
import "./KarakterlapElsoOldal.css";

const empty = "—";
const attributeIconPositions = [36.04, 41.79, 47.57, 53.18, 64.58];

function AttributeIcon({ position }) {
  return <span className="attribute-icon" style={{ "--icon-y": `${position}%` }} aria-hidden="true" />;
}
const zones = [
  ["Fej", "left", 12, 47, 10],
  ["Nyak", "right", 12, 54, 17],
  ["Mellkas", "right", 25, 50, 26],
  ["Jobb felkar", "left", 29, 39, 34],
  ["Bal felkar", "right", 38, 61, 34],
  ["Jobb alkar", "left", 45, 36, 43],
  ["Bal alkar", "right", 52, 64, 43],
  ["Jobb kéz", "left", 60, 34, 52],
  ["Bal kéz", "right", 65, 66, 52],
  ["Jobb láb", "left", 80, 43, 78],
  ["Bal láb", "right", 80, 57, 78],
];

function ArmorDiagram({ character }) {
  const { protection, unknownEquipment, unknownCoverage, unknownLevel } =
    armorProtection(character.equipment, zones.map(([label]) => label));
  const speed = characterSpeed(withEffectiveStrength(character));
  return (
    <section className="parchment-card armor-card" aria-labelledby="armor-title">
      <h3 id="armor-title">Páncélzat és védettségi zónák</h3>
      <figure className="armor-figure">
        <img src={figure} alt="" />
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {zones.map(([label, side, y, targetX, targetY]) => (
            <g key={label} className={protection[label].covered ? "has-armor" : undefined}>
              {protection[label].covered && <ellipse cx={targetX} cy={targetY} rx="2.4" ry="2.7" />}
              <polyline points={side === "left"
                ? `27,${y} 29,${y} ${targetX},${targetY}`
                : `73,${y} 71,${y} ${targetX},${targetY}`} />
              <circle cx={targetX} cy={targetY} r="0.6" />
            </g>
          ))}
        </svg>
        <ul>
          {zones.map(([label, side, y]) => {
            const zone = protection[label];
            const value = zone.unknown || unknownCoverage || unknownEquipment
              ? empty : zone.levels.length ? zone.levels.join(" / ") : 0;
            return (
              <li key={label} className={`armor-label armor-label-${side}${zone.covered ? " has-armor" : ""}`} style={{ top: `${y}%` }}>
                <span>{label}</span><strong title={value === empty ? "A védelmi érték nem állapítható meg" : "Vértszint"}>{value}</strong>
              </li>
            );
          })}
        </ul>
      </figure>
      <div className="armor-speed">
        <span>Gyorsaság</span>
        <output aria-label="Aktuális gyorsaság">{speed.value ?? empty}</output>
        {speed.reason && <small>{speed.reason}</small>}
      </div>
      {unknownEquipment && <p className="armor-caption">Van olyan vért, amelynél a viselés nincs jelölve.</p>}
      {unknownCoverage && <p className="armor-caption">Egy viselt vért pontos fedettsége nincs meghatározva.</p>}
      {unknownLevel && <p className="armor-caption">Egy viselt vért védelmi értéke nincs meghatározva.</p>}
      {Object.values(protection).some((zone) => zone.levels.length > 1) &&
        <p className="armor-caption">Átfedésnél a viselt darabok vértszintjei külön szerepelnek.</p>}
    </section>
  );
}

function TraitList({ items }) {
  if (!items?.length) return <p>{empty}</p>;
  return <ul className="parchment-traits">{items.map((item, index) => <li key={index}>{item.name ?? item}</li>)}</ul>;
}

function EleteroPanel({ current, maximum, savedMaximum, onChange }) {
  const fp = current ?? savedMaximum;
  const level = woundLevel(fp, maximum);
  const status = level == null ? "Az aktuális Fizikumpont nincs rögzítve vagy érvénytelen."
    : fp < 0 ? "0 alatti Fp · halál" : fp === 0 ? "0 Fp · 10. sebszint"
      : level === 0 ? "Sértetlen" : `${level}. sebszint`;

  return (
    <section className="parchment-card">
      <h3>Életerő</h3>
      <dl className="sheet-data sheet-health"><div><dt>Életerő (Fp)</dt><dd>
        <div className="health-controls">
          <button type="button" aria-label="Életerő csökkentése" disabled={fp <= 0 || fp - 1 > savedMaximum} onClick={() => onChange(-1)}>−</button>
          <output aria-label="Aktuális életerő">{fp}</output>
          <button type="button" aria-label="Életerő növelése" disabled={fp < 0 || fp >= Math.min(maximum, savedMaximum)} onClick={() => onChange(1)}>+</button>
        </div>
        {" / "}<span aria-label="Maximális életerő">{maximum}</span>
      </dd></div></dl>
      <ol className="wound-scale" aria-label="Sebszintek">
        {woundThresholds(maximum).map((limit, index) => (
          <li key={index} aria-current={level === index + 1 ? "step" : undefined}
            title={`A(z) ${index + 1}. rubrika felső határa: ${limit} elvesztett Fp`}>{index + 1}</li>
        ))}
      </ol>
      <p className="wound-status" aria-live="polite">{status}</p>
      {current == null && <p className="wound-status">Kiinduló érték a Fizikumból. Aktuális érték még nincs külön rögzítve.</p>}
    </section>
  );
}

export default function KarakterlapElsoOldal({ character, stage, edit, onChangeHealth, onOpenSkills }) {
  const stats = edit?.stats ?? characterStats(character);
  const adjustments = edit?.adjustments ?? characterAdjustments(character);
  const displayed = { ...character, stats, adjustments };
  const magic = readMagic(character);
  const limits = magicLimits(edit ? { ...character, stats, adjustments } : character);
  const parents = character.ancestry?.parents?.map(({ race }) => race).filter(Boolean) ?? [];
  const origin = (parents.length ? parents : [character.parent1, character.parent2].filter(Boolean)).join(" / ");
  const featuredSkills = Object.entries(character.skills ?? {})
    .filter(([, rank]) => Number.isFinite(rank) && rank > 0)
    .sort((first, second) => second[1] - first[1]).slice(0, 5);
  const info = [
    ["Név", edit?.name ?? character.name],
    ["Faj", edit?.race ?? character.race],
    ["Nem", character.gender],
    ["Életkor", edit ? edit.age : character.age ? `${character.age} év` : null],
    ["Életszakasz", edit ? edit.stage : stage],
    ["Származás", origin],
    ["Vallás", edit?.religion ?? character.religion ?? magic.patron],
  ];

  return (
    <div className="parchment-sheet" data-unsaved={edit?.changed ?? false}>
      <div className="sheet-left">
        <section className="parchment-card sheet-identity">
          <h3>Karakter adatai</h3>
          <div className="identity-layout">
            <dl className="sheet-data">{info.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || empty}</dd></div>)}</dl>
            <div className="sheet-crest" aria-hidden="true" />
          </div>
          {edit?.ancestry && <details><summary>Származás szerkesztése</summary>{edit.ancestry}</details>}
          {edit?.ageOptions}
        </section>
        <section className="parchment-card sheet-attributes">
          <h3>Főértékek</h3>
          <table>
            <thead><tr><th scope="col">Főérték</th><th scope="col">Érték</th><th scope="col">Aktív</th><th scope="col">Passzív</th></tr></thead>
            <tbody>
              {attributes.map(([name, active, passive], index) => {
                const base = stats[index];
                const adjustment = adjustments[index];
                return <tr key={name}>
                  <th scope="row"><span className="attribute-name"><AttributeIcon position={attributeIconPositions[index]} />{name}</span></th>
                  <td>{edit && <button type="button" aria-label={`${name} csökkentése`} disabled={!edit.limits[index] || base <= edit.limits[index][0]} onClick={() => edit.changeStat(index, -1)}>−</button>}
                    {effectiveAttribute(displayed, index)}
                    {edit && <button type="button" aria-label={`${name} növelése`} disabled={!edit.limits[index] || base >= edit.limits[index][1]} onClick={() => edit.changeStat(index, 1)}>+</button>}
                  </td>
                  <td><strong>{effectiveAttribute(displayed, index, 1)}</strong><small>{active}</small>
                    {edit && <div className="sheet-split-controls">
                      <button type="button" aria-label={`${active} csökkentése`} disabled={adjustment <= -attributeAdjustmentLimit(base)} onClick={() => edit.changeAdjustment(index, -1)}>−</button>
                      <button type="button" aria-label={`${active} növelése`} disabled={adjustment >= attributeAdjustmentLimit(base)} onClick={() => edit.changeAdjustment(index, 1)}>+</button>
                    </div>}
                  </td>
                  <td><strong>{effectiveAttribute(displayed, index, -1)}</strong><small>{passive}</small></td>
                </tr>;
              })}
            </tbody>
          </table>
          {edit && <p>Hátralévő főértékpont: {edit.remaining ?? empty}</p>}
          <dl className="sheet-data"><div><dt>Elkölthető Jp</dt><dd>{character.jp ?? 0}</dd></div></dl>
          <div className="sheet-landscape" aria-hidden="true" />
        </section>
      </div>
      <div className="sheet-center">
        <EleteroPanel current={character.currentFp} maximum={maxHealth(displayed)} savedMaximum={maxHealth(character)} onChange={onChangeHealth} />
        <section className="parchment-card">
          <h3>Esszencia</h3>
          <table className="sheet-resources">
            <thead><tr><th scope="col">Erőforrás</th><th scope="col">Aktuális</th><th scope="col">Maximum</th></tr></thead>
            <tbody>
              <tr><th scope="row">Aktív esszencia (Ep)</th><td>{magic.activeEp ?? empty}</td><td>{limits.activeEp}</td></tr>
              <tr><th scope="row">Esszenciapajzs</th><td>{magic.shield ?? <span title="Az aktuális pajzsérték nincs rögzítve a Mágia oldalon.">{empty}</span>}</td><td>{limits.shield}</td></tr>
            </tbody>
          </table>
          {magic.shield == null && <p className="armor-caption">Az aktuális pajzsérték nincs rögzítve a Mágia oldalon.</p>}
        </section>
        <ArmorDiagram character={edit ? { ...character, race: edit.race, stats, adjustments } : character} />
      </div>
      <div className="sheet-right">
        {featuredSkills.length > 0 && <section className="parchment-card sheet-featured">
          <h3>Kiemelt jártasságok</h3>
          <dl className="sheet-data">{featuredSkills.map(([name, rank]) =>
            <div key={name}><dt>{name}</dt><dd>{rank}</dd></div>)}</dl>
          <button type="button" onClick={onOpenSkills}>Összes jártasság</button>
        </section>}
        <section className="parchment-card">
          <h3>Egyéb jellemzők</h3>
          <h4>Előnyök</h4><TraitList items={character.advantages} />
          <h4>Hátrányok</h4><TraitList items={character.disadvantages} />
          {edit && <details><summary>Előnyök és hátrányok szerkesztése</summary>{edit.renderTraits()}</details>}
          <h4>Megjegyzések</h4>
          {edit ? <textarea aria-label="Megjegyzések" value={edit.notes} onChange={(event) => edit.setNotes(event.target.value)} />
            : <p className="sheet-notes">{character.equipment?.notes || empty}</p>}
        </section>
      </div>
    </div>
  );
}
