import { useState } from "react";
import { createRoot } from "react-dom/client";
import { Bell, BookOpen, Hand, Hourglass, Mars, Settings, ShieldCheck, Venus } from "lucide-react";
import { attributes, characterAdjustments, characterStats, effectiveAttribute } from "../karakterFoeertekek.js";
import { pageAncestryTheme } from "../teszt/ancestryTheme.js";
import crest from "./crest.svg";
import physique from "./physique.svg";
import "./preview.css";

const examples = [
  { name: "Déri Áron", race: "Ember", gender: "Férfi", age: 31, stats: [57, 58, 51, 54, 50], adjustments: [5] },
  { name: "Mirél", race: "Gilf", gender: "Nő", age: 42, stats: [48, 59, 54, 59, 50], adjustments: [-4] },
];

const controls = [["Kódex", BookOpen], ["Értesítések", Bell], ["Beállítások", Settings]];

function IllustratedHeader({ character, panel, onPanel }) {
  const GenderIcon = character.gender === "Nő" ? Venus : Mars;
  return <header className="forge-hero" style={pageAncestryTheme(character.race, character.subrace, character.gender)}>
    <div className="forge-portrait" aria-hidden="true" />
    <div className="forge-title"><h1>Karakterlap</h1><span>Általános</span></div>
    <div className="forge-identity">
      <h2>{character.name}</h2>
      <ul>
        <li><img src={crest} alt="" />{[character.race, character.subrace].filter(Boolean).join(" · ")}</li>
        <li><GenderIcon aria-hidden="true" />{character.gender}</li>
        <li><Hourglass aria-hidden="true" />{character.age} éves</li>
      </ul>
    </div>
    <div className="forge-controls">
      {controls.map(([name, Icon], index) => <button key={name} className="forge-frame" type="button"
        aria-label={name} aria-expanded={panel === name} aria-controls={panel === name ? "forge-control-panel" : undefined}
        data-position={index} onClick={() => onPanel(panel === name ? null : name)}><Icon aria-hidden="true" /></button>)}
    </div>
  </header>;
}

function PhysiqueRow({ character }) {
  const displayed = { ...character, stats: characterStats(character), adjustments: characterAdjustments(character) };
  const [name, active, passive] = attributes[0];
  const components = [[active, 1, Hand], [passive, -1, ShieldCheck]];
  return <section className="forge-attribute" aria-label={name}>
    <div className="forge-frame forge-stat">
      <img src={physique} alt="" />
      <h2>{name}</h2>
      <output aria-label={name} className="forge-frame">{effectiveAttribute(displayed, 0)}</output>
    </div>
    <dl className="forge-frame forge-pair">{components.map(([label, direction, Icon]) => <div key={label}>
      <dt><Icon aria-hidden="true" />{label}</dt>
      <dd><output aria-label={label}>{effectiveAttribute(displayed, 0, direction)}</output></dd>
    </div>)}</dl>
  </section>;
}

function Preview() {
  const [example, setExample] = useState(0);
  const [panel, setPanel] = useState(null);
  const character = examples[example];
  return <main className="forge-preview" onKeyDown={event => { if (event.key === "Escape") setPanel(null); }}>
    <IllustratedHeader character={character} panel={panel} onPanel={setPanel} />
    <PhysiqueRow character={character} />
    {panel && <aside className="forge-frame forge-popover" id="forge-control-panel" aria-label={panel}>
      <p>{panel === "Kódex" ? "A kódex a játékban nyitható meg." : panel === "Értesítések" ? "Nincs értesítés ebben az előnézetben." :
        <label>Előnézeti karakter <select value={example} onChange={event => setExample(Number(event.target.value))}>
          {examples.map(({ name, race }, index) => <option value={index} key={name}>{name} · {race}</option>)}
        </select></label>}</p>
      <button type="button" onClick={() => setPanel(null)}>Bezárás</button>
    </aside>}
  </main>;
}

createRoot(document.getElementById("root")).render(<Preview />);
