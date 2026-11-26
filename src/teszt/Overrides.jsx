import { attributes } from "../karakterFoeertekek.js";
import { addTrialOverride, effectiveTrialTarget, revokeTrialOverride } from "./trialOverrides.js";

export default function Overrides({ characters, entries, onChange }) {
  return <section>
    <h3>Kalandmesteri felülbírálások</h3>
    <p>A jóváhagyott célszám a karakter titkos főértékpróbáira érvényes. A próbán megadott helyzeti módosító ehhez adódik.</p>
    <form onSubmit={event => {
      event.preventDefault();
      const fields = new FormData(event.currentTarget);
      const character = characters.find(item => String(item.id) === fields.get("character"));
      if (!character) return;
      const attribute = fields.get("attribute");
      const next = addTrialOverride(entries, character, attribute, effectiveTrialTarget(entries, character, attribute, 0),
        Number(fields.get("target")), fields.get("reason"), crypto.randomUUID(), new Date().toISOString());
      if (next !== entries) {
        onChange(next);
        event.currentTarget.reset();
      }
    }}>
      <label>Karakter <select name="character" required>{characters.map(character =>
        <option key={character.id} value={String(character.id)}>{character.name}</option>)}</select></label>
      <label>Főérték <select name="attribute">{attributes.flat().map(attribute =>
        <option key={attribute}>{attribute}</option>)}</select></label>
      <label>Jóváhagyott célszám <input name="target" type="number" step="1" required /></label>
      <label>Felülbírálás indoka <textarea name="reason" maxLength={1000} required /></label>
      <button type="submit">Célszám jóváhagyása</button>
    </form>
    <h4>Egyéb KM-döntés naplózása</h4>
    <p>Az egyéb döntéseket az érintett szabálymodulban alkalmazd.</p>
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
      {entry.revokedAt && <p>Visszavonva · <time dateTime={entry.revokedAt}>{new Date(entry.revokedAt).toLocaleString("hu-HU")}</time></p>}
      {entry.kind === "attribute-target" && !entry.revokedAt && <button type="button"
        onClick={() => onChange(revokeTrialOverride(entries, entry.id, new Date().toISOString()))}>Felülbírálás visszavonása</button>}
    </li>)}</ul>
  </section>;
}
