import { attributeAdjustmentLimit, attributes, characterStats, characterAdjustments, effectiveAttribute, withEffectiveStrength } from "./karakterFoeertekek.js";
import { magicLimits, readMagic } from "./magiaSzabalyok.js";
import { maxHealth, woundLevel, woundThresholds } from "./eletero.js";
import { armorProtection } from "./felszereltVert.js";
import { characterSpeed } from "./gyorsasag.js";
import figure from "./assets/theme/pancelzat-karakter-referencia.webp";
import "./KarakterlapElsoOldal.css";
import "./CharacterPage.css";
import { Award, BookOpen, Crosshair, Eye, Feather, Hand, Hourglass, ScanEye, Shield, ShieldCheck, Skull, Sparkles, Sun, UserRound } from "lucide-react";
import { pageAncestryTheme } from "./teszt/ancestryTheme.js";
import { profileFields, readProfile } from "./characterProfile.js";

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
      <p className="armor-legend"><span>Védett zóna</span><span>Védelem nincs jelölve</span></p>
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

const attributeIcons = [
  [Hand, ShieldCheck],
  [Feather, Crosshair],
  [BookOpen, Sun],
  [Sparkles, Shield],
  [Eye, ScanEye],
];

const identityIcons = [Shield, UserRound, Hourglass];

function IdentityLine({ character }) {
  const items = [[character.race, character.subrace].filter(Boolean).join(" · "), character.gender, character.age && `${character.age} év`];
  if (!items.some(Boolean)) return <p>Válassz fajt a karakterhez</p>;
  return <p>{items.map((item, index) => {
    if (!item) return null;
    const Icon = identityIcons[index];
    return <span key={index}><Icon aria-hidden="true" />{item}</span>;
  })}</p>;
}

export function CharacterPageHeader({ character, title, actions }) {
  return <header className="first-page-header" style={pageAncestryTheme(character.race, character.subrace, character.gender)}>
    <div className="first-page-header-art" aria-hidden="true" />
    <h2>{title}</h2>
    <div className="first-page-banner-label">Általános</div>
    <div className="first-page-identity">
      <h1>{character.name || "Új karakter"}</h1>
      <IdentityLine character={character} />
    </div>
    {actions}
  </header>;
}

function EleteroPanel({ current, maximum, savedMaximum, onChange, canIncrease }) {
  const fp = current ?? savedMaximum;
  const level = woundLevel(fp, maximum);
  return <section className="first-page-frame first-page-health" aria-label="Életerő">
    <div className="first-page-health-top">
      <h3><span className="first-page-heart" aria-hidden="true" />Életerő</h3>
      <button type="button" aria-label="Életerő csökkentése" disabled={!onChange || fp <= 0 || fp - 1 > maximum} onClick={() => onChange(-1)}>−</button>
      <div className="first-page-health-value"><output aria-label="Aktuális életerő">{fp}</output> / <span aria-label="Maximális életerő">{maximum}</span></div>
      <button type="button" aria-label="Életerő növelése" disabled={!onChange || !canIncrease || fp < 0 || fp >= maximum} onClick={() => onChange(1)}>+</button>
    </div>
    <div className="first-page-wounds">
      <span aria-live="polite">Sebszint: {level ?? empty} / 10</span>
      <ol className="wound-scale" aria-label="Sebszintek">
        {woundThresholds(maximum).map((limit, index) => <li key={index} data-wounded={level >= index + 1}
          aria-current={level === index + 1 ? "step" : undefined} title={`Elvesztett életerő felső határa: ${limit}`}>{index + 1}</li>)}
      </ol>
    </div>
  </section>;
}

export default function KarakterlapElsoOldal({ character, stage, edit, mode = "player", onChangeHealth, extra, budget, actions }) {
  const stats = edit?.stats ?? characterStats(character);
  const adjustments = edit?.adjustments ?? characterAdjustments(character);
  const displayed = { ...character, stats, adjustments };
  const magic = readMagic(character);
  const limits = magicLimits(displayed);
  const profile = edit?.profile ?? readProfile(character);
  const parents = character.ancestry?.parents?.map(parent => parent?.race).filter(Boolean) ?? [];
  const origin = (parents.length ? parents : [character.parent1, character.parent2].filter(Boolean)).join(" / ");
  const showDetailsEditor = Boolean(edit);
  const basics = [
    ["Név", edit?.name ?? character.name], ["Faj", edit?.race ?? character.race],
    ["Életkor", edit?.age ?? (character.age ? `${character.age} év` : empty)], ["Nem", edit?.gender ?? character.gender],
  ];
  return <div className="first-page-body" data-unsaved={mode !== "creation" && Boolean(edit?.changed)}>
    <section aria-label="Főértékek">
      <ul className="first-page-stats">
        {attributes.map(([name, active, passive], index) => {
          const base = stats[index];
          const adjustment = adjustments[index];
          const bounds = edit?.limits[index];
          const [ActiveIcon, PassiveIcon] = attributeIcons[index];
          return <li className="creation-stat first-page-stat" key={name} data-stat={index}>
            <div className="first-page-stat-base">
              <span><i className="first-page-stat-medallion" aria-hidden="true" /><span>{name}{bounds && <small className="first-page-bounds">{bounds.join("–")}</small>}</span></span>
              {bounds && <button type="button" aria-label={`${name} csökkentése`} disabled={base <= bounds[0]} onClick={() => edit.changeStat(index, -1)}>−</button>}
              <output aria-label={name}>{effectiveAttribute(displayed, index)}</output>
              {bounds && <button type="button" aria-label={`${name} növelése`} disabled={base >= bounds[1]} onClick={() => edit.changeStat(index, 1)}>+</button>}
            </div>
            <div className="first-page-stat-split">
              <div><span><ActiveIcon aria-hidden="true" />{active}</span><output aria-label={active}>{effectiveAttribute(displayed, index, 1)}</output>
                {bounds && <span className="first-page-adjust">
                  <button type="button" aria-label={`${active} csökkentése`} disabled={adjustment <= -attributeAdjustmentLimit(base)} onClick={() => edit.changeAdjustment(index, -1)}>−</button>
                  <button type="button" aria-label={`${active} növelése`} disabled={adjustment >= attributeAdjustmentLimit(base)} onClick={() => edit.changeAdjustment(index, 1)}>+</button>
                </span>}
              </div>
              <div><span><PassiveIcon aria-hidden="true" />{passive}</span><output aria-label={passive}>{effectiveAttribute(displayed, index, -1)}</output></div>
            </div>
          </li>;
        })}
      </ul>
      {budget}
      {edit && mode !== "creation" && <p>Hátralévő főértékpont: {edit.remaining ?? empty} · Elkölthető Jp: {character.jp ?? 0}</p>}
    </section>
    <EleteroPanel current={edit?.health ?? character.currentFp} maximum={maxHealth(displayed)} savedMaximum={maxHealth(character)}
      onChange={onChangeHealth} canIncrease={mode === "gm" || Boolean(edit)} />
    <dl className="first-page-resources">
      <div data-essence="flame"><dt>Aktuális aktív Ep</dt><dd>{edit?.resourceFields?.("activeEp", limits.activeEp) ?? `${magic.activeEp ?? empty} / ${limits.activeEp}`}</dd></div>
      <div data-essence="vortex"><dt>Felszabadítható esszencia</dt><dd>{limits.release} Ep</dd></div>
      <div data-essence="shield"><dt>Aktuális Esszenciapajzs</dt><dd>{edit?.resourceFields?.("shield", limits.shield) ?? `${magic.shield ?? empty} / ${limits.shield}`}</dd></div>
    </dl>
    <section className="first-page-frame first-page-details" aria-label="Karakter adatai">
      <h3><UserRound aria-hidden="true" />Karakter adatai</h3>
      <dl className="first-page-basics creation-grid">{basics.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || empty}</dd></div>)}</dl>
      {edit?.subrace}
      <details>
        <summary>További adatok</summary>
        <dl className="first-page-info">
          <div><dt>Vallás</dt><dd>{edit?.religion ?? (character.religion || magic.patron || empty)}</dd></div>
          <div><dt>Származás</dt><dd>{origin || empty}</dd></div>
          <div><dt>Életszakasz</dt><dd>{edit?.stage ?? stage ?? empty}</dd></div>
          {character.jp != null && <div><dt>Elkölthető Jp</dt><dd>{character.jp}</dd></div>}
          {profileFields.map(([key, label, unit]) => <div key={key}><dt>{label}</dt><dd>{showDetailsEditor
            ? <input aria-label={label} type={unit ? "number" : "text"} min={unit ? "0.01" : undefined} step={unit ? "any" : undefined}
                maxLength={160} value={profile[key]} onChange={event => edit.setProfile(key, event.target.value)} />
            : profile[key] ? `${profile[key]}${unit ? ` ${unit}` : ""}` : empty}</dd></div>)}
        </dl>
        {edit?.ancestry}
        {edit?.ageOptions}
        <p>Megjegyzések</p>
        {edit?.setNotes ? <textarea aria-label="Megjegyzések" value={edit.notes} onChange={event => edit.setNotes(event.target.value)} />
          : <p>{character.equipment?.notes || empty}</p>}
      </details>
    </section>
    {extra}
    <div className="first-page-traits">
      {[["Előnyök", edit?.advantages ?? character.advantages, Award], ["Hátrányok", edit?.disadvantages ?? character.disadvantages, Skull]].map(([label, values, Icon]) =>
        <details className="first-page-frame" key={label}><summary><Icon aria-hidden="true" />{label} ({values?.length ?? 0})</summary><TraitList items={values} /></details>)}
    </div>
    {edit?.renderTraits && <details className="first-page-frame"><summary>Előnyök és hátrányok szerkesztése</summary>{edit.renderTraits(mode === "creation")}</details>}
    {actions}
  </div>;
}
