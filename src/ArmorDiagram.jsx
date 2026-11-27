import { withEffectiveStrength } from "./karakterFoeertekek.js";
import { armorProtection } from "./felszereltVert.js";
import { characterSpeed } from "./gyorsasag.js";
import figure from "./assets/theme/pancelzat-karakter-referencia.webp";
import "./KarakterlapElsoOldal.css";

const empty = "—";
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

export function ArmorDiagram({ character }) {
  const { protection, unknownEquipment, unknownCoverage, unknownLevel } =
    armorProtection(character.equipment, zones.map(([label]) => label));
  const speed = characterSpeed(withEffectiveStrength(character));
  return (
    <section className="general-frame armor-card" aria-labelledby="armor-title">
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
      <p className="armor-legend"><span>Védett zóna</span><span>Védetlen vagy ismeretlen</span></p>
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
