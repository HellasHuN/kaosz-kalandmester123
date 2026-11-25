import { ancestryTheme } from "./teszt/ancestryTheme.js";
import React from "react";
import Felszereles from "./Felszereles";
import Jartassagok from "./Jartassagok";
import Magia from "./Magia";
import KarakterlapElsoOldal from "./KarakterlapElsoOldal";

function Karakterlap({
  character, stage, onSaveSkills, onSaveEquipment, onSaveMagic, onStartCharacterEdit,
  onFinalizeCharacterEdit, characterEditor, onChangeHealth, confirmLeaving,
}) {
  const [activePage, setActivePage] = React.useState(1);
  const [editing, setEditing] = React.useState(false);
  const editor = React.useRef(null);
  if (!character) {
    return (
      <section className="panel">
        <h2>Karakterlap</h2>
        <p>Nincs betöltött karakter.</p>
      </section>
    );
  }

  function openPage(page) {
    if (page !== activePage && confirmLeaving()) {
      setEditing(false);
      setActivePage(page);
    }
  }

  function startEditing() {
    if (activePage === 1) onStartCharacterEdit();
    else editor.current.start();
    setEditing(true);
  }

  function finalizeEditing() {
    const saved = activePage === 1 ? onFinalizeCharacterEdit() : editor.current.save();
    if (saved) setEditing(false);
  }

  function cancelEditing() {
    if (!confirmLeaving()) return;
    if (activePage !== 1) editor.current.cancel();
    setEditing(false);
  }

  return (
    <div className={`themed-sheet ${activePage === 1 ? "parchment-page" : activePage === 2 ? "skills-reference-page" : ""}`}
      style={ancestryTheme(character.race, character.subrace)}>
    {activePage === 1 && <header className="parchment-banner">
      <h1>KÁOSZ SZEREPJÁTÉK</h1>
      <p>Karakterlap • 1. oldal</p>
    </header>}
    {activePage === 2 && <header className="skills-reference-banner"><h1>KÁOSZ SZEREPJÁTÉK</h1></header>}
    <div className="character-sheet-toolbar">
    <nav className="karakterlap-nav" aria-label="Karakterlap oldalai">
  {[activePage === 2 ? "Karakterlap I." : "Karakter", activePage <= 2 ? "Jártasságok" : "Képzettségek", "Felszerelés", "Mágia"].map((label, index) => (
    <button key={index} type="button" aria-label={label} aria-current={activePage === index + 1 ? "page" : undefined}
      onClick={() => openPage(index + 1)}>
      {activePage === 1 && <span aria-hidden="true">{["♟", "⚔", "▣", "☆"][index]}</span>}{label}
    </button>
  ))}
</nav>
    <div className="character-sheet-actions">
      <button type="button" disabled={editing} onClick={startEditing}>Szerkesztés</button>
      <button type="button" disabled={!editing} onClick={finalizeEditing}>Véglegesítés</button>
      {editing && <button type="button" onClick={cancelEditing}>Mégse</button>}
    </div>
    </div>
    {activePage === 1 && <KarakterlapElsoOldal character={character} stage={stage}
      edit={editing ? characterEditor : null} onChangeHealth={onChangeHealth} />}
    {activePage === 2 && <Jartassagok ref={editor} character={character} onSave={onSaveSkills} />}
    {activePage === 3 && (
      <Felszereles ref={editor} character={character} onSave={onSaveEquipment} />
    )}
    {activePage === 4 && (
      <Magia ref={editor} character={character} onSave={onSaveMagic} />
    )}
    </div>
  );
}

export default Karakterlap;
