import { Backpack, BookOpen, ScrollText, Sparkles } from "lucide-react";
import { ancestryTheme } from "./teszt/ancestryTheme.js";
import React from "react";
import Felszereles from "./Felszereles";
import Jartassagok from "./Jartassagok";
import Magia from "./Magia";
import KarakterlapElsoOldal, { ArmorDiagram } from "./KarakterlapElsoOldal";

const pageIcons = [ScrollText, BookOpen, Backpack, Sparkles];

function Karakterlap({
  character, stage, initialEditing = false, onSaveSkills, onSaveEquipment, onSaveMagic, onStartCharacterEdit,
  onFinalizeCharacterEdit, characterEditor, onChangeHealth, confirmLeaving,
}) {
  const [activePage, setActivePage] = React.useState(1);
  const [editing, setEditing] = React.useState(initialEditing);
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
    <header className="character-cover">
      <div className="character-cover-art" aria-hidden="true" />
      <div className="character-cover-caption">
        <p>{[character.race, character.subrace].filter(Boolean).join(" · ")}</p>
        <h1>{character.name}</h1>
      </div>
    </header>
    <div className="character-sheet-toolbar">
      <nav className="karakterlap-nav" aria-label="Karakterlap oldalai">
        {["Karakter", "Jártasságok", "Felszerelés", "Mágia"].map((label, index) => {
          const Icon = pageIcons[index];
          return <button key={label} type="button" aria-current={activePage === index + 1 ? "page" : undefined}
            onClick={() => openPage(index + 1)}>
            <Icon aria-hidden="true" size={19} />{label}
          </button>;
        })}
      </nav>
    <div className="character-sheet-actions">
      <button type="button" disabled={editing} onClick={startEditing}>Szerkesztés</button>
      <button type="button" disabled={!editing} onClick={finalizeEditing}>Véglegesítés</button>
      {editing && <button type="button" onClick={cancelEditing}>Mégse</button>}
    </div>
    </div>
    {activePage === 1 && <KarakterlapElsoOldal character={character} stage={stage}
      edit={editing ? characterEditor : null} onChangeHealth={onChangeHealth} onOpenSkills={() => openPage(2)} />}
    {activePage === 2 && <Jartassagok ref={editor} character={character} onSave={onSaveSkills} />}
    {activePage === 3 && (
      <div className="equipment-sheet">
        <ArmorDiagram character={character} />
        <Felszereles ref={editor} character={character} onSave={onSaveEquipment} />
      </div>
    )}
    {activePage === 4 && (
      <Magia ref={editor} character={character} onSave={onSaveMagic} />
    )}
    </div>
  );
}

export default Karakterlap;
