export default function Overrides({ characters, entries, onChange }) {
  return <section>
    <h3>Kalandmesteri felülbírálások</h3>
    <p>A kivétel naplózása után a módosítást az érintett modulban rögzítsd. A napló megőrzi az eredeti és az engedélyezett értéket.</p>
    <form onSubmit={event => {
      event.preventDefault();
      const fields = new FormData(event.currentTarget);
      const character = characters.find(item => String(item.id) === fields.get("character"));
      const [rule, previous, approved, reason] = ["rule", "previous", "approved", "reason"].map(key => fields.get(key).trim());
      if (!character || !rule || !previous || !approved || !reason) return;
      onChange([...entries, { id: crypto.randomUUID(), character: character.name, rule, previous, approved, reason,
        recordedAt: new Date().toISOString() }]);
      event.currentTarget.reset();
    }}>
      <label>Érintett karakter <select name="character" required>{characters.map(character =>
        <option key={character.id} value={String(character.id)}>{character.name}</option>)}</select></label>
      <label>Érintett szabály <input name="rule" required maxLength={120} /></label>
      <label>Eredeti állapot <input name="previous" required maxLength={400} /></label>
      <label>Engedélyezett eltérés <input name="approved" required maxLength={400} /></label>
      <label>Indoklás <textarea name="reason" required maxLength={1000} /></label>
      <button type="submit">Kivétel naplózása</button>
    </form>
    <ul>{entries.slice().reverse().map(entry => <li key={entry.id}>
      <strong>{entry.character} · {entry.rule}</strong>
      <p>{entry.previous} → {entry.approved} · {entry.reason}</p>
      <time dateTime={entry.recordedAt}>{new Date(entry.recordedAt).toLocaleString("hu-HU")}</time>
    </li>)}</ul>
  </section>;
}
