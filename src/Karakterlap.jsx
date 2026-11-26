import { Backpack, BookOpen, ScrollText, Sparkles } from "lucide-react";
import { ancestryTheme } from "./teszt/ancestryTheme.js";
import React from "react";
import Felszereles from "./Felszereles";
import Jartassagok from "./Jartassagok";
import Magia from "./Magia";
import { ArmorDiagram } from "./ArmorDiagram.jsx";
import GeneralPage, { GeneralEditActions } from "./page1/GeneralPage.jsx";

const pageIcons = [ScrollText, BookOpen, Backpack, Sparkles];

function Karakterlap({
  character, stage, initialEditing = false, initialPage = 1, mode = "player", onSettings, onChat, unread = 0, onSaveSkills, onSaveEquipment, onSaveMagic, onStartCharacterEdit,
  onFinalizeCharacterEdit, onCancelCharacterEdit, characterEditor, onChangeHealth, confirmLeaving,
}) {
  const [activePage, setActivePage] = React.useState(initialPage);
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
      if (activePage === 1 && editing) onCancelCharacterEdit();
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
    if (activePage === 1) onCancelCharacterEdit();
    else editor.current.cancel();
    setEditing(false);
  }

  if (activePage === 1) {
    const links = [["details", "Általános", 1], ["skills", "Jártasságok", 2], ["magic", "Mágia", 4], ["equipment", "Felszerelés", 3]]
      .map(([id, label, page]) => ({ id, label, current: page === 1, onClick: () => openPage(page) }));
    links.push({ id: "chat", label: "Chat", onClick: onChat });
    return <GeneralPage character={character} identity={editing ? { ...character, ...characterEditor.identity } : character}
      stage={stage} mode={mode} edit={editing ? characterEditor : null} onChangeHealth={amount => onChangeHealth(amount, editing)}
      header={{ onCodex: () => openPage(4), onChat, onSettings, unread }} links={links}
      actions={<GeneralEditActions editing={editing} onEdit={startEditing} onSave={finalizeEditing} onCancel={cancelEditing} />} />;
  }

  return (
    <div className={`themed-sheet${activePage === 2 ? " skills-reference-page" : ""}`}
      style={ancestryTheme(character.race, character.subrace)}>
    <header className="character-cover">
      <div className="character-cover-art" aria-hidden="true" />
      <div className="character-cover-caption"><p>{[character.race, character.subrace].filter(Boolean).join(" · ")}</p><h1>{character.name}</h1></div>
    </header>
    <div className="character-sheet-toolbar">
      <nav className="karakterlap-nav" aria-label="Karakterlap oldalai">
        {["Karakter", "Jártasságok", "Felszerelés", "Mágia"].map((label, index) => {
          const page = index + 1;
          const Icon = pageIcons[index];
          return <button key={page} type="button" aria-current={activePage === page ? "page" : undefined}
            onClick={() => openPage(page)}><Icon aria-hidden="true" size={19} />{label}</button>;
        })}
      </nav>
      <div className="character-sheet-actions">
        <button type="button" disabled={editing} onClick={startEditing}>Szerkesztés</button>
        <button type="button" disabled={!editing} onClick={finalizeEditing}>Véglegesítés</button>
        {editing && <button type="button" onClick={cancelEditing}>Mégse</button>}
      </div>
    </div>
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
