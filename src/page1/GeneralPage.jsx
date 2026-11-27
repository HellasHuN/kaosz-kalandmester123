import {
  Award, Backpack, Bell, BookOpen, Crosshair, Eye, Feather, Hand, Hourglass, MessageCircle,
  Pencil, ScanEye, Settings, Shield, ShieldCheck, Skull, Sparkles, Sun, Swords, UserRound,
} from "lucide-react";
import { attributeAdjustmentLimit, attributes, characterAdjustments, characterStats, effectiveAttribute } from "../karakterFoeertekek.js";
import { maxHealth, woundLevel, woundThresholds } from "../eletero.js";
import { magicLimits, readMagic } from "../magiaSzabalyok.js";
import { profileFields, readProfile } from "../characterProfile.js";
import { pageAncestryTheme, portraitUrl } from "../teszt/ancestryTheme.js";
import "./general-page.css";

const missing = "—";
const componentIcons = [[Hand, ShieldCheck], [Feather, Crosshair], [BookOpen, Sun], [Sparkles, Shield], [Eye, ScanEye]];
const navigationIcons = { details: UserRound, skills: Swords, magic: BookOpen, equipment: Backpack, chat: MessageCircle };

export function IllustratedHeader({ character, creation, actions, onCodex, onChat, onSettings, unread }) {
  const { race, subrace, gender, age, name } = character;
  return <header className="general-hero" style={pageAncestryTheme(race, subrace, gender)}>
    <div className="general-hero-portrait" role="img" aria-label={[race, subrace, gender, "portré"].filter(Boolean).join(" · ")} />
    {character.ancestry?.parents?.some(parent => parent?.race) && <div className="general-parent-portraits" aria-label="Szülői származás">
      {character.ancestry.parents.map((parent, index) => parent?.race && <img key={index}
        src={portraitUrl(parent.race, parent.subrace, parent.gender)} alt={parent.race} title={parent.race} />)}
    </div>}
    <div className="general-ribbon">
      <h2>{creation ? "Karakteralkotás" : "Karakterlap"}</h2>
      <span>Általános</span>
    </div>
    <div className="general-identity">
      <h1>{name || "Új karakter"}</h1>
      <div className="general-identity-tags">
        {race && <span><Shield />{[race, subrace].filter(Boolean).join(" · ")}</span>}
        {gender && <span><UserRound />{gender}</span>}
        {age && <span><Hourglass />{age} év</span>}
      </div>
    </div>
    {creation ? actions && <div className="general-new">{actions}</div> : <>
      <div className="general-hero-tools">
        <button type="button" aria-label="Kódex" onClick={onCodex}><BookOpen /></button>
        <button type="button" aria-label={unread ? `Értesítések · ${unread} olvasatlan üzenet` : "Értesítések"} onClick={onChat}>
          <Bell />{unread > 0 && <sup aria-hidden="true">{unread}</sup>}
        </button>
      </div>
      <button className="general-settings" type="button" aria-label="Beállítások" onClick={onSettings}><Settings /></button>
    </>}
  </header>;
}

function ComponentValue({ index, direction, label, character, edit }) {
  const value = effectiveAttribute(character, index, direction);
  return edit?.changeComponent ? <input type="number" step="1" aria-label={label}
    value={character.componentOverrides?.[index]?.[direction] ?? ""} placeholder={String(value ?? "")}
    onChange={event => edit.changeComponent(index, direction, event.target.value)} />
    : <output aria-label={label}>{value}</output>;
}

function AttributeRow({ index, names: [name, active, passive], character, edit }) {
  const { stats, adjustments } = character;
  const bounds = edit?.limits[index];
  const limit = attributeAdjustmentLimit(stats[index]);
  const [ActiveIcon, PassiveIcon] = componentIcons[index];
  return <tr className="general-attribute" data-attribute={index} data-editable={Boolean(bounds)}>
    <th scope="row"><div className="general-attribute-title">
      <i aria-hidden="true" />
      <span>{name}{bounds && <small>{bounds.join("–")}</small>}</span>
      <output aria-label={name}>{effectiveAttribute(character, index)}</output>
      {bounds && <div className="general-steppers">
        <button type="button" aria-label={`${name} csökkentése`} disabled={!edit.override && stats[index] <= bounds[0]} onClick={() => edit.changeStat(index, -1)}>−</button>
        <button type="button" aria-label={`${name} növelése`} disabled={!edit.override && stats[index] >= bounds[1]} onClick={() => edit.changeStat(index, 1)}>+</button>
      </div>}
    </div></th>
    <td><div className="general-components">
      <div><ActiveIcon /><span>{active}</span><ComponentValue index={index} direction={1} label={active} character={character} edit={edit} />
        {bounds && !edit.override && <div className="general-steppers">
          <button type="button" aria-label={`${active} csökkentése`} disabled={!edit.override && adjustments[index] <= -limit} onClick={() => edit.changeAdjustment(index, -1)}>−</button>
          <button type="button" aria-label={`${active} növelése`} disabled={!edit.override && adjustments[index] >= limit} onClick={() => edit.changeAdjustment(index, 1)}>+</button>
        </div>}
      </div>
      <div><PassiveIcon /><span>{passive}</span><ComponentValue index={index} direction={-1} label={passive} character={character} edit={edit} /></div>
    </div></td>
  </tr>;
}

function HealthPanel({ current, maximum, canIncrease, onChange, field }) {
  const level = woundLevel(current, maximum);
  return <section className="general-health general-frame" aria-label="Életerő">
    <div className="general-vitals">
      <h3><i aria-hidden="true" />Életerő <small>(ÉP)</small></h3>
      <button type="button" aria-label="Életerő csökkentése" disabled={!onChange || current <= 0 || current - 1 > maximum} onClick={() => onChange(-1)}>−</button>
      <strong>{field || <output aria-label="Aktuális életerő">{current}</output>} / <span aria-label="Maximális életerő">{maximum}</span></strong>
      <button type="button" aria-label="Életerő növelése" disabled={!onChange || !canIncrease || current < 0 || current >= maximum} onClick={() => onChange(1)}>+</button>
    </div>
    <div className="general-wounds">
      <span aria-live="polite">Sebszint: {level ?? missing} / 10</span>
      <ol aria-label="Sebszintek">
        {woundThresholds(maximum).map((limit, index) => <li key={index} data-wounded={level >= index + 1}
          aria-current={level === index + 1 ? "step" : undefined} title={`Elvesztett életerő felső határa: ${limit}`}>{index + 1}</li>)}
      </ol>
    </div>
  </section>;
}

function EssenceDisplays({ magic, limits, resourceFields }) {
  const displays = [
    ["flame", "Aktuális aktív Ep", resourceFields?.("activeEp", limits.activeEp) ?? `${magic.activeEp ?? missing} / ${limits.activeEp}`],
    ["vortex", "Felszabadítható esszencia", `${limits.release} Ep`],
    ["shield", "Aktuális Esszenciapajzs", resourceFields?.("shield", limits.shield) ?? `${magic.shield ?? missing} / ${limits.shield}`],
  ];
  return <dl className="general-essences">{displays.map(([kind, label, value]) =>
    <div className="general-frame" data-essence={kind} key={kind}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}

function DataList({ fields, className }) {
  return <dl className={className}>{fields.map(([label, value]) =>
    <div key={label}><dt>{label}</dt><dd>{value || missing}</dd></div>)}</dl>;
}

function CharacterInformation({ character, stage, magic, edit }) {
  const profile = edit?.profile ?? readProfile(character);
  const parents = character.ancestry?.parents?.map(parent => parent?.race).filter(Boolean) ?? [];
  const origin = (parents.length ? parents : [character.parent1, character.parent2].filter(Boolean)).join(" / ");
  const basics = [
    ["Név", edit?.name ?? character.name], ["Faj", edit?.race ?? character.race],
    ["Életkor", edit?.age ?? (character.age && `${character.age} év`)], ["Nem", edit?.gender ?? character.gender],
  ];
  const background = [
    ["Származási hely", profile.birthplace], ["Vallás", edit?.religion ?? (character.religion || magic.patron)],
    ["Származás", origin], ["Életszakasz", edit?.stage ?? stage],
    ...(character.jp != null ? [["Elkölthető Jp", String(character.jp)]] : []),
  ];
  const profileValue = ([key, label, unit]) => [label, edit
    ? <input aria-label={label} type={unit ? "number" : "text"} min={unit ? "0.01" : undefined} step={unit ? "any" : undefined}
        maxLength={160} value={profile[key]} onChange={event => edit.setProfile(key, event.target.value)} />
    : profile[key] && `${profile[key]}${unit ? ` ${unit}` : ""}`];
  if (edit) background.shift();
  return <section className="general-info general-frame" aria-label="Karakter adatai">
    <h3><UserRound />Karakter adatai</h3>
    <DataList className="general-basics" fields={basics} />
    {edit?.subrace}
    <details>
      <summary>További adatok</summary>
      <div className="general-info-columns">
        <DataList className="general-data" fields={background} />
        <DataList className="general-data" fields={profileFields.filter(([key]) => edit || key !== "birthplace").map(profileValue)} />
      </div>
      {edit?.ancestry}
      {edit?.ageOptions}
      <div className="general-notes">
        <span>Megjegyzések</span>
        {edit?.setNotes ? <textarea aria-label="Megjegyzések" value={edit.notes} onChange={event => edit.setNotes(event.target.value)} /> : <p>{character.equipment?.notes || missing}</p>}
      </div>
    </details>
  </section>;
}

function TraitPanel({ label, items, Icon, tone }) {
  return <details className="general-frame" data-tone={tone}>
    <summary><Icon />{label} ({items?.length ?? 0})</summary>
    {items?.length ? <ul>{items.map((item, index) => <li key={index}>{item.name ?? item}</li>)}</ul> : <p>{missing}</p>}
  </details>;
}

export function GeneralNavigation({ links, creation = false }) {
  return <nav className="general-navigation" aria-label={creation ? "A karakteralkotás részei" : "Karakterlap oldalai"}>
    {links.map(({ id, label, current, onClick }) => {
      const Icon = navigationIcons[id];
      return <button key={id} type="button" aria-current={!creation && current ? "page" : undefined}
        aria-pressed={creation ? current : undefined} onClick={onClick}><Icon /><span>{label}</span></button>;
    })}
  </nav>;
}

export function GeneralEditActions({ editing, onEdit, onSave, onCancel }) {
  return <div className="general-edit">
    <button type="button" disabled={editing} onClick={onEdit}><Pencil />Szerkesztés</button>
    {editing && <><button type="button" onClick={onSave}>Véglegesítés</button><button type="button" onClick={onCancel}>Mégse</button></>}
  </div>;
}

export default function GeneralPage({ character, identity = character, stage, edit, mode = "player", onChangeHealth,
  extra, budget, actions, header, links }) {
  const creation = mode === "creation";
  const displayed = { ...character, stats: edit?.stats ?? characterStats(character), adjustments: edit?.adjustments ?? characterAdjustments(character), componentOverrides: edit?.componentOverrides ?? character.componentOverrides };
  const magic = readMagic(character);
  return <article className="general-sheet" data-mode={mode} data-unsaved={!creation && Boolean(edit?.changed)}>
    <IllustratedHeader character={identity} creation={creation} {...header} />
    <section aria-label="Főértékek">
      <table className="general-attributes"><tbody>
        {attributes.map((names, index) => <AttributeRow key={names[0]} index={index} names={names} character={displayed} edit={edit} />)}
      </tbody></table>
      {budget}
      {edit && !creation && <p>{!edit.override && <>Hátralévő főértékpont: {edit.remaining ?? missing} · </>}Elkölthető Jp: {edit.jp || character.jp || 0}</p>}
    </section>
    <HealthPanel current={edit?.health ?? character.currentFp ?? maxHealth(character)} maximum={maxHealth(displayed)}
      field={edit?.healthField} onChange={onChangeHealth} canIncrease={mode === "gm" || Boolean(edit)} />
    <EssenceDisplays magic={magic} limits={magicLimits(displayed)} resourceFields={edit?.resourceFields} />
    <CharacterInformation character={character} stage={stage} magic={magic} edit={edit} />
    {extra}
    <div className="general-traits">
      <TraitPanel label="Előnyök" items={edit?.advantages ?? character.advantages} Icon={Award} tone="green" />
      <TraitPanel label="Hátrányok" items={edit?.disadvantages ?? character.disadvantages} Icon={Skull} tone="red" />
    </div>
    {edit?.renderTraits && <details className="general-frame"><summary>Előnyök és hátrányok szerkesztése</summary>{edit.renderTraits(creation)}</details>}
    {actions}
    {links && <GeneralNavigation links={links} creation={creation} />}
  </article>;
}
