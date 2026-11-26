import { Backpack, Bell, BookOpen, MessageCircle, Pencil, ScrollText, Settings, Sparkles, Swords, UserRound } from "lucide-react";
import { ancestryTheme } from "./teszt/ancestryTheme.js";
import React from "react";
import Felszereles from "./Felszereles";
import Jartassagok from "./Jartassagok";
import Magia from "./Magia";
import KarakterlapElsoOldal, { ArmorDiagram, CharacterPageHeader } from "./KarakterlapElsoOldal";

const pageIcons = [ScrollText, BookOpen, Backpack, Sparkles];
const generalPageIcons = [UserRound, Swords, Backpack, BookOpen];

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

  const general = activePage === 1;
  const tabs = general ? [1, 2, 4, 3] : [1, 2, 3, 4];
  const labels = [general ? "Általános" : "Karakter", "Jártasságok", "Felszerelés", "Mágia"];
  const editActions = <div className="character-sheet-actions">
      <button type="button" disabled={editing} onClick={startEditing}>{general && <Pencil aria-hidden="true" />}Szerkesztés</button>
      {(!general || editing) && <button type="button" disabled={!editing} onClick={finalizeEditing}>Véglegesítés</button>}
      {editing && <button type="button" onClick={cancelEditing}>Mégse</button>}
    </div>;
  const toolbar = <div className={general ? "first-page-toolbar" : "character-sheet-toolbar"}>
    {general && editActions}
    <nav className={general ? "first-page-tabs" : "karakterlap-nav"} aria-label="Karakterlap oldalai">
      {tabs.map((page) => {
        const Icon = (general ? generalPageIcons : pageIcons)[page - 1];
        return <button key={page} type="button" aria-current={activePage === page ? "page" : undefined}
          onClick={() => openPage(page)}><Icon aria-hidden="true" size={19} />{labels[page - 1]}</button>;
      })}
      {general && <button type="button" onClick={onChat}><MessageCircle aria-hidden="true" size={19} />Chat</button>}
    </nav>
    {!general && editActions}
  </div>;
  return (
    <div className={`themed-sheet ${general ? "first-page-shell active-first-page" : activePage === 2 ? "skills-reference-page" : ""}`}
      style={ancestryTheme(character.race, character.subrace)}>
    {general ? <CharacterPageHeader title="Karakterlap" character={editing ? { ...character, ...characterEditor.identity } : character}
      actions={<div className="first-page-header-actions">
        <div>
          <button type="button" aria-label="Kódex" onClick={() => openPage(4)}><BookOpen aria-hidden="true" /></button>
          <button type="button" aria-label={unread ? `Értesítések · ${unread} olvasatlan üzenet` : "Értesítések"} onClick={onChat}>
            <Bell aria-hidden="true" />{unread > 0 && <span aria-hidden="true">{unread}</span>}
          </button>
        </div>
        <button type="button" aria-label="Beállítások" onClick={onSettings}><Settings aria-hidden="true" /></button>
      </div>} />
      : <header className="character-cover">
        <div className="character-cover-art" aria-hidden="true" />
        <div className="character-cover-caption"><p>{[character.race, character.subrace].filter(Boolean).join(" · ")}</p><h1>{character.name}</h1></div>
      </header>}
    {!general && toolbar}
    {general && <>
      <KarakterlapElsoOldal character={character} stage={stage} mode={mode}
        edit={editing ? characterEditor : null} onChangeHealth={(amount) => onChangeHealth(amount, editing)} />
      {toolbar}
    </>}
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
