import { BookOpen, ClipboardList, Compass, Dices, Map, MessageCircle, ScrollText, Shield, Swords } from "lucide-react";
import Overrides from "./Overrides.jsx";
import { SecretTrials } from "./TrialTools.jsx";
import { Bestiary, CreatureGenerator, MapTool } from "./FieldTools.jsx";
import SegmentTimeline from "./SegmentTimeline.jsx";
import { useState } from "react";
import { addMessage, conversationFor, markConversationRead, unreadMessages } from "./localAdventure.js";

export default function TestMode({ mode, characters, adventure, onChange, onSelectMode, onOpenCharacter }) {
  const [tab, setTab] = useState("overview");
  const [recipient, setRecipient] = useState("");
  const [text, setText] = useState("");
  if (!mode) return (
    <section className="test-panel">
      <h2>Kaland kezdete</h2>
      <div className="test-actions">
        <button type="button" onClick={() => onSelectMode("player")}>Játékos mód</button>
        <button type="button" onClick={() => onSelectMode("km")}>Kalandmester mód</button>
      </div>
    </section>
  );

  const km = mode === "km";
  const selected = characters.find(({ id }) => String(id) === recipient) ?? characters[0];
  const messages = conversationFor(adventure, selected?.id);
  const unread = km ? characters.reduce((sum, character) => sum + unreadMessages(adventure, character.id, mode), 0)
    : unreadMessages(adventure, selected?.id, mode);

  function readThread(id) {
    const next = markConversationRead(adventure, id, mode);
    if (next !== adventure) onChange(next);
  }

  function send(event) {
    event.preventDefault();
    const next = addMessage(adventure, selected?.id, mode, text, new Date().toISOString());
    if (next !== adventure) {
      onChange(next);
      setText("");
    }
  }

  return <section className="test-panel">
    <h2 className="test-heading">{km ? "Kalandmester mód" : "Játékos mód"}</h2>
    <nav className="test-actions" aria-label="Tesztkaland">
      <button type="button" aria-pressed={tab === "overview"} onClick={() => setTab("overview")}><Compass aria-hidden="true" size={16} />Kaland áttekintése</button>
      <button type="button" aria-pressed={tab === "messages"} onClick={() => {
        setTab("messages");
        readThread(selected?.id);
      }}><MessageCircle aria-hidden="true" size={16} />Üzenetek{unread > 0 && <span aria-label={`${unread} olvasatlan üzenet`}> ({unread})</span>}</button>
      <button type="button" aria-pressed={tab === "segments"} onClick={() => setTab("segments")}><Swords aria-hidden="true" size={16} />Harci szegmensek</button>
      {km && <button type="button" aria-pressed={tab === "map"} onClick={() => setTab("map")}><Map aria-hidden="true" size={16} />Világtérkép</button>}
      {km && <button type="button" aria-pressed={tab === "bestiary"} onClick={() => setTab("bestiary")}><BookOpen aria-hidden="true" size={16} />Bestiárium</button>}
      {km && <button type="button" aria-pressed={tab === "generator"} onClick={() => setTab("generator")}><Dices aria-hidden="true" size={16} />Generátor</button>}
      {km && <button type="button" aria-pressed={tab === "trials"} onClick={() => setTab("trials")}><Shield aria-hidden="true" size={16} />Titkos próbák</button>}
      {km && <button type="button" aria-pressed={tab === "overrides"} onClick={() => setTab("overrides")}><ClipboardList aria-hidden="true" size={16} />Felülbírálások</button>}
      {km && <button type="button" aria-pressed={tab === "notes"} onClick={() => setTab("notes")}><ScrollText aria-hidden="true" size={16} />KM-jegyzetek</button>}
    </nav>
    {((tab === "notes" && !km) || tab === "overview") && <>
      <h3>Mintahelyzet · A ködbe veszett fogadó</h3>
      <p>Egy kihűlt fogadó ablakában lámpa ég. A csapat nyomokat kereshet, vagy bekopoghat.</p>
    </>}
    {(tab === "overview" || tab === "messages") && <>
      <label>Karakter <select value={selected ? String(selected.id) : ""} onChange={event => {
        setRecipient(event.target.value);
        if (tab === "messages") readThread(event.target.value);
      }}>
        {characters.map(character => <option key={character.id} value={String(character.id)}>{character.name}</option>)}
      </select></label>
      {tab === "overview" && selected && <button type="button" onClick={() => onOpenCharacter(selected)}>Karakterlap megnyitása</button>}
    </>}
    {km && tab === "overrides" && <Overrides characters={characters} entries={adventure.overrides ?? []}
      onChange={overrides => onChange({ ...adventure, overrides })} />}
    {km && tab === "trials" && <SecretTrials characters={characters} history={adventure.trials ?? []}
      onRecord={record => onChange({ ...adventure, trials: [...(adventure.trials ?? []), record] })} />}
    {km && tab === "map" && <MapTool markers={adventure.markers ?? []}
      onChange={markers => onChange({ ...adventure, markers })} />}
    {km && tab === "bestiary" && <Bestiary entries={adventure.bestiary ?? []}
      onChange={bestiary => onChange({ ...adventure, bestiary })} />}
    {km && tab === "generator" && <CreatureGenerator
      onSave={entry => onChange({ ...adventure, bestiary: [...(adventure.bestiary ?? []), entry] })} />}
    {tab === "segments" && <SegmentTimeline km={km} characters={characters} entries={adventure.segments ?? []} current={adventure.currentSegment}
      onChange={(segments, currentSegment) => onChange({ ...adventure, segments, currentSegment })} />}
    {km && tab === "notes" && <label>KM-jegyzet<textarea rows={7} value={adventure.notes}
      onChange={event => onChange({ ...adventure, notes: event.target.value })} /></label>}
    {tab === "messages" && <>
      <p>Helyi szimuláció ebben a böngészőben. Az üzenetekhez nincs szerveroldali hozzáférés-védelem.</p>
      {messages.length ? <ul className="test-messages">{messages.map((message, index) => <li key={index}>
        <strong>{message.author === "km" ? "KM" : selected?.name}</strong>{" "}
        <time dateTime={message.sentAt}>{new Date(message.sentAt).toLocaleString("hu-HU")}</time>
        <p>{message.text}</p>
      </li>)}</ul> : <p>Nincsenek üzenetek.</p>}
      <form onSubmit={send}>
        <label>Üzenet <textarea value={text} onChange={event => setText(event.target.value)} required maxLength={2000} /></label>
        <button type="submit" disabled={!selected || !text.trim()}>Küldés</button>
      </form>
    </>}
  </section>;
}
