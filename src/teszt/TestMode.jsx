import SegmentTimeline from "./SegmentTimeline.jsx";
import { useState } from "react";
import { addMessage, conversationFor } from "./localAdventure.js";

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
  function send(event) {
    event.preventDefault();
    const next = addMessage(adventure, selected?.id, mode, text, new Date().toISOString());
    if (next !== adventure) {
      onChange(next);
      setText("");
    }
  }

  return <section className="test-panel">
    <h2>{km ? "Kalandmester mód" : "Játékos mód"}</h2>
    <nav className="test-actions" aria-label="Tesztkaland">
      <button type="button" aria-pressed={tab === "overview"} onClick={() => setTab("overview")}>Kaland áttekintése</button>
      <button type="button" aria-pressed={tab === "messages"} onClick={() => setTab("messages")}>Üzenetek</button>
      <button type="button" aria-pressed={tab === "segments"} onClick={() => setTab("segments")}>Harci szegmensek</button>
      {km && <button type="button" aria-pressed={tab === "notes"} onClick={() => setTab("notes")}>KM-jegyzetek</button>}
    </nav>
    {((tab === "notes" && !km) || tab === "overview") && <>
      <h3>Mintahelyzet · A ködbe veszett fogadó</h3>
      <p>Egy kihűlt fogadó ablakában lámpa ég. A csapat nyomokat kereshet, vagy bekopoghat.</p>
    </>}
    {(tab === "overview" || tab === "messages") && <>
      <label>Karakter <select value={selected ? String(selected.id) : ""} onChange={event => setRecipient(event.target.value)}>
        {characters.map(character => <option key={character.id} value={String(character.id)}>{character.name}</option>)}
      </select></label>
      {tab === "overview" && selected && <button type="button" onClick={() => onOpenCharacter(selected)}>Karakterlap megnyitása</button>}
    </>}
    {tab === "segments" && <SegmentTimeline km={km} entries={adventure.segments ?? []} current={adventure.currentSegment}
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
