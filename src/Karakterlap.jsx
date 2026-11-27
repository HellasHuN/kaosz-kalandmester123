import React from "react";
import Felszereles from "./Felszereles";
import Jartassagok from "./Jartassagok";
import Magia from "./Magia";
import GeneralPage, { CharacterWorkspace, GeneralEditActions } from "./page1/GeneralPage.jsx";

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

  const links = [["details", "Általános", 1], ["skills", "Jártasságok", 2], ["magic", "Mágia", 4], ["equipment", "Felszerelés", 3]]
    .map(([id, label, page]) => ({ id, label, current: page === activePage, onClick: () => openPage(page) }));
  links.push({ id: "chat", label: "Chat", onClick: onChat });
  const actions = <GeneralEditActions editing={editing} onEdit={startEditing} onSave={finalizeEditing} onCancel={cancelEditing} />;
  const header = { onCodex: () => openPage(4), onChat, onSettings, unread };

  if (activePage === 1) return <GeneralPage character={character}
    identity={editing ? { ...character, ...characterEditor.identity } : character}
    stage={stage} mode={mode} edit={editing ? characterEditor : null} onChangeHealth={amount => onChangeHealth(amount, editing)}
    header={header} links={links} actions={actions} />;

  const [subtitle, className, content] = {
    2: ["Jártasságok", "skills-sheet", <Jartassagok ref={editor} character={character} onSave={onSaveSkills} />],
    3: ["Felszerelés", "equipment-sheet", <Felszereles ref={editor} character={character} onSave={onSaveEquipment} />],
    4: ["Mágia", "magic-sheet", <Magia ref={editor} character={character} onSave={onSaveMagic} />],
  }[activePage];
  return <CharacterWorkspace character={character} subtitle={subtitle} mode={mode}
    className={className} header={header} links={links} actions={actions}>
    {activePage === 4 ? <div className="character-codex">{content}</div> : content}
  </CharacterWorkspace>;
}

export default Karakterlap;
