import { useState } from "react";
import { Bell, BookOpen, Compass, Feather, HeartPulse, Home, Hourglass, Info, MessageCircle,
  Pencil, Play, Plus, Search, Settings, Shield, Sparkles, Star, Swords, Trash2, UserRound, Users, X } from "lucide-react";
import { ancestryTheme } from "./ancestryTheme.js";
import { unreadMessages } from "./localAdventure.js";
import { maxHealth } from "../eletero.js";
import { magicLimits, readMagic } from "../magiaSzabalyok.js";
import "./mainMenu.css";

const unknown = "Nincs megadva";
const textField = (value) => typeof value === "string" ? value.trim() : "";
const identity = (character) => [character.race, character.subrace].filter(Boolean).join(" · ");
const age = (character) => character.age == null || character.age === "" ? "" : `${character.age} év`;
const status = (character) => character.playStatus === "playing" ? "Játékban"
  : character.playStatus === "draft" ? "Tervezet" : "Besorolásra vár";
const searchable = (value) => value.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("hu");

function CharacterPreview({ character, onLoad, onEdit, onDelete }) {
  const health = maxHealth(character);
  const magic = readMagic(character);
  const limits = magicLimits(character);
  const parents = character.ancestry?.parents?.map(parent => parent?.race).filter(Boolean) ?? [];
  const origin = (parents.length ? parents : [character.parent1, character.parent2].filter(Boolean)).join(" / ");
  const facts = [
    ["Hivatás", textField(character.profession) || textField(character.occupation)],
    ["Társadalmi helyzet", textField(character.socialStatus)],
    ["Vallás", character.religion || magic.patron],
    ["Származási hely", textField(character.birthplace) || textField(character.origin)],
    ["Származás", origin],
  ];
  const classified = character.playStatus === "playing" || character.playStatus === "draft";
  return <section className="menu-frame menu-preview" aria-labelledby="menu-character-title" style={ancestryTheme(character.race, character.subrace)}>
    <div className="menu-portrait-hero">
      <Shield className="menu-crest" aria-hidden="true" />
      <h3 id="menu-character-title">{character.name}</h3>
    </div>
    <div className="menu-identity">
      <span><UserRound aria-hidden="true" />{identity(character) || unknown}</span>
      <span>{character.gender || unknown}</span>
      <span><Hourglass aria-hidden="true" />{age(character) || unknown}</span>
    </div>
    <dl className="menu-resources">
      <div><dt><HeartPulse aria-hidden="true" />Életerő (Fp)</dt><dd>{health > 0 ? `${character.currentFp ?? health} / ${health}` : "—"}</dd></div>
      <div><dt><Sparkles aria-hidden="true" />Fsz. Ep</dt><dd>{character.stats?.length > 3 ? limits.release : "—"}</dd></div>
      <div><dt><Shield aria-hidden="true" />Epajzs</dt><dd>{magic.shield == null ? "—" : `${magic.shield} / ${limits.shield}`}</dd></div>
    </dl>
    <details className="menu-facts" open>
      <summary><Info aria-hidden="true" />Rövid adatok</summary>
      <dl>{facts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || unknown}</dd></div>)}</dl>
    </details>
    <div className="menu-character-actions">
      <button type="button" data-tone="green" onClick={() => onLoad(character)}><Play aria-hidden="true" />{classified ? "Betöltés" : "Besorolás"}</button>
      <button type="button" onClick={() => onEdit(character)} disabled={!classified}><Pencil aria-hidden="true" />Szerkesztés</button>
      <button type="button" data-tone="red" onClick={() => onDelete(character)}><Trash2 aria-hidden="true" />Törlés</button>
    </div>
  </section>;
}

export default function MainMenu({ characters, adventure, onNew, onLoad, onEdit, onDelete, onSheet, onCodex, onSettings, onChat, onPlay, onSaved, onGM }) {
  const [selection, setSelection] = useState(null);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const selected = characters.find(character => character.id === selection) ?? characters[0];
  const matches = searchable(query.trim());
  const visible = characters.filter(character => searchable(`${character.name} ${identity(character)}`).includes(matches));
  const unread = selected?.playStatus === "playing" ? unreadMessages(adventure, selected.id, "player") : 0;

  function openChat() {
    if (selected?.playStatus === "playing") onChat(selected);
    else setMessage("A helyi chathez válassz játékba helyezett karaktert.");
  }

  function openCodex() {
    if (selected?.playStatus === "playing") onCodex(selected);
    else setMessage("A Kódexhez válassz játékba helyezett karaktert.");
  }
  return <section className="main-menu" aria-labelledby="main-menu-title">
    <header className="menu-masthead">
      <div className="menu-corner-left">
        <button type="button" aria-label="Kódex megnyitása" onClick={openCodex}><BookOpen aria-hidden="true" /></button>
        <button type="button" aria-label={unread ? `Értesítések · ${unread} olvasatlan üzenet` : "Értesítések"}
          onClick={() => unread ? openChat() : setMessage("A kiválasztott karakternek nincs olvasatlan helyi üzenete.")}>
          <Bell aria-hidden="true" />{unread > 0 && <span className="menu-badge" aria-hidden="true">{unread}</span>}
        </button>
      </div>
      <button className="menu-gear" type="button" aria-label="Beállítások" onClick={onSettings}><Settings aria-hidden="true" /></button>
      <div className="menu-brand" aria-label="Káosz szerepjáték">
        <Compass aria-hidden="true" />
        <strong>KÁOSZ</strong>
        <span>SZEREPJÁTÉK</span>
        <small>KALANDMESTER SEGÍTŐ PROGRAM</small>
      </div>
    </header>
    <h1 id="main-menu-title" className="menu-title">Főmenü</h1>
    <div className="menu-columns">
      <section className="menu-frame menu-roster" aria-labelledby="menu-roster-title">
        <h2 id="menu-roster-title"><Users aria-hidden="true" />Mentett karakterek <span>{characters.length}</span></h2>
        <div className="menu-search">
          <Search aria-hidden="true" />
          <input type="search" aria-label="Karakterkeresés" placeholder="Karakter keresése…" value={query}
            onChange={event => setQuery(event.target.value)} />
          {query && <button type="button" aria-label="Keresés törlése" onClick={() => setQuery("")}><X aria-hidden="true" /></button>}
        </div>
        <ul className="menu-character-list">
          {visible.map(character => {
            const active = character.id === selected?.id;
            return <li key={character.id}>
              <button type="button" aria-pressed={active} onClick={() => { setSelection(character.id); setMessage(""); }}
                style={ancestryTheme(character.race, character.subrace)}>
                <span className="menu-avatar" aria-hidden="true" />
                <span className="menu-card-copy">
                  <strong>{character.name}</strong>
                  <span>{[identity(character), age(character)].filter(Boolean).join(" · ") || unknown}</span>
                  <small>{textField(character.profession) || textField(character.occupation) || status(character)}</small>
                </span>
                <Star aria-hidden="true" className="menu-star" fill={active ? "currentColor" : "none"} />
              </button>
            </li>;
          })}
        </ul>
        {visible.length === 0 && <p className="menu-empty">{characters.length === 0 ? "Nincs mentett karakter." : "Nincs ilyen karakter."}</p>}
        <button className="menu-new" type="button" onClick={onNew}><Plus aria-hidden="true" />Új karakter létrehozása</button>
      </section>
      {selected ? <CharacterPreview key={selected.id} character={selected} onLoad={onLoad} onEdit={onEdit} onDelete={onDelete} />
        : <section className="menu-frame menu-empty-preview" aria-label="Karakter előnézete"><UserRound aria-hidden="true" /><p>Hozz létre egy karaktert az előnézethez.</p></section>}
    </div>
    {message && <p className="menu-notice" role="status">{message}</p>}
    <nav className="menu-utilities" aria-label="Kaland és mentések">
      <button type="button" onClick={onPlay}>Játék</button>
      <button type="button" onClick={onSaved}>Karakterbetöltés</button>
      <button type="button" onClick={onGM} aria-label="Kalandmester" aria-describedby="menu-km-test"><Swords aria-hidden="true" />Kalandmester <small id="menu-km-test">TESZT</small></button>
    </nav>
    <nav className="menu-bottom" aria-label="Fő navigáció">
      <button type="button" aria-current="page" onClick={() => { setQuery(""); setMessage(""); window.scrollTo(0, 0); }}><Home aria-hidden="true" />Főmenü</button>
      <button type="button" onClick={onNew}><Feather aria-hidden="true" />Karakteralkotás</button>
      <button type="button" onClick={() => selected?.playStatus === "playing" ? onSheet(selected) :
        setMessage("A karakterlaphoz válassz játékba helyezett karaktert.")}><UserRound aria-hidden="true" />Karakterlap</button>
      <button type="button" onClick={openCodex}><BookOpen aria-hidden="true" />Kódex</button>
      <button type="button" onClick={openChat}><MessageCircle aria-hidden="true" />Chat</button>
    </nav>
  </section>;
}
