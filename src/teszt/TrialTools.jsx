import { blindCombatRanks } from "./blindCombat.js";
import { specialization, specializationNames, weaponRanks } from "../jartassagSzakosodasok.js";
import { useState } from "react";
import { attributes } from "../karakterFoeertekek.js";
import { jpKoltsegek } from "../jpKoltsegek.js";
import { readPercentileRoll, rollDie } from "./dice.js";
import { attributeTarget, investigationContest, percentileResult, skillTarget } from "./trials.js";

const weapons = specializationNames.filter(name => {
  const item = specialization(name);
  return item.base === "Fegyverforgatás" && !item.branch && !item.requiresWeapon;
});

function BlindCombat({ characters }) {
  const [actorId, setActorId] = useState("");
  const [weaponName, setWeaponName] = useState(weapons[0]);
  const character = characters.find(item => String(item.id) === actorId) ?? characters[0];
  if (!character) return null;
  const rank = character.skills?.Vakharc ?? 0;
  const result = blindCombatRanks(weaponRanks(character, specialization(weaponName).id), rank);
  return <details><summary>Vakharc harcértékei</summary>
    <label>Vakharcoló karakter <select value={String(character.id)} onChange={event => setActorId(event.target.value)}>
      {characters.map(item => <option key={item.id} value={String(item.id)}>{item.name}</option>)}
    </select></label>
    <label>Fegyver <select value={weaponName} onChange={event => setWeaponName(event.target.value)}>
      {weapons.map(name => <option key={name}>{name}</option>)}
    </select></label>
    <p>Vakharc: {rank}. Támadás: {result.attack} · Védekezés: {result.defense}.</p>
  </details>;
}

const outcomeLabels = {
  invalid: "Ellenőrizd a megadott értékeket.", "follow-up": "További százalékos dobás szükséges.",
  success: "Siker", failure: "Kudarc", "critical-failure": "Katasztrofális rontás",
  narrator: "Azonos kimenetel. A KM dönt.", discovered: "Az álcázás lelepleződött.", hidden: "Az álcázás megmaradt.",
};

export function SecretTrials({ characters, history, onRecord }) {
  const [kind, setKind] = useState("skill");
  const [response, setResponse] = useState(null);
  return <section>
    <h3>Titkos KM-próbák</h3>
    <p>A próba eredménye a helyi KM-nézetben látható. A körülmények módosítóját a KM állapítja meg.</p>
    <label>Próba típusa <select value={kind} onChange={event => {
      setKind(event.target.value);
      setResponse(null);
    }}>
      <option value="skill">Jártasság · Zafír</option>
      <option value="attribute">Főérték</option>
      <option value="contest">Információgyűjtés és Álcázás · háziszabály</option>
    </select></label>
    <form key={kind} onSubmit={event => {
      event.preventDefault();
      const fields = new FormData(event.currentTarget);
      const character = characters.find(item => String(item.id) === fields.get("character"));
      if (!character) return;
      const attribute = kind === "attribute";
      const contest = kind === "contest";
      const name = contest ? "Információgyűjtés" : fields.get("name");
      const modifier = Number(fields.get("modifier"));
      const target = attribute ? attributeTarget(character, name, modifier)
        : skillTarget(character.skills?.[name] ?? 0, Number(fields.get("difficulty")) + modifier);
      const digital = fields.has("digital");
      const roll = digital ? rollDie(100) : readPercentileRoll(fields.get("roll"));
      const followUp = attribute && roll === 100 && target >= 100
        ? (digital ? rollDie(100) : readPercentileRoll(fields.get("followUp"))) : undefined;
      const result = percentileResult(target, roll, { attribute, followUp });
      const disguise = contest ? characters.find(item => String(item.id) === fields.get("opponent")) : null;
      const defenseTarget = disguise && skillTarget(disguise.skills?.["Álcázás"] ?? 0, Number(fields.get("defenseDifficulty")));
      const defenseRoll = contest ? (digital ? rollDie(100) : readPercentileRoll(fields.get("defenseRoll"))) : null;
      const outcome = contest ? investigationContest(result, percentileResult(defenseTarget, defenseRoll)) : result;
      const record = { id: crypto.randomUUID(), actor: character.name, name, target, roll, outcome,
        ...(followUp ? { followUp } : {}), ...(contest ? { opponent: disguise?.name ?? "", defenseTarget, defenseRoll } : {}) };
      setResponse(record);
      if (!["invalid", "follow-up"].includes(outcome)) onRecord(record);
    }}>
      <label>{kind === "contest" ? "Kereső karakter" : "Karakter"} <select name="character" required>
        {characters.map(item => <option key={item.id} value={String(item.id)}>{item.name}</option>)}
      </select></label>
      {kind !== "contest" && <label>{kind === "attribute" ? "Főérték" : "Jártasság"} <select name="name">
        {(kind === "attribute" ? attributes.flat() : Object.keys(jpKoltsegek)).map(name => <option key={name}>{name}</option>)}
      </select></label>}
      {kind !== "attribute" && <label>Nehézség (0–10) <input name="difficulty" type="number" min="0" max="10" defaultValue="4" required /></label>}
      <label>{kind === "attribute" ? "Célszámmódosító" : "Nehézségmódosító"} <input name="modifier" type="number" defaultValue="0" required /></label>
      <label>Kézi k100 (00 = 100) <input name="roll" type="text" inputMode="numeric" maxLength={3} /></label>
      {kind === "attribute" && <label>Második dobás 100 esetére <input name="followUp" type="text" inputMode="numeric" maxLength={3} /></label>}
      {kind === "contest" && <>
        <label>Álcázó karakter <select name="opponent" required>
          {characters.map(item => <option key={item.id} value={String(item.id)}>{item.name}</option>)}
        </select></label>
        <label>Álcázás nehézsége <input name="defenseDifficulty" type="number" min="0" max="10" defaultValue="4" required /></label>
        <label>Álcázás kézi k100 <input name="defenseRoll" type="text" inputMode="numeric" maxLength={3} /></label>
      </>}
      <label><span><input name="digital" type="checkbox" /> Digitális dobás</span></label>
      <button type="submit">Próba elbírálása</button>
    </form>
    {response && <p role="status">{outcomeLabels[response.outcome]} Célszám: {response.target ?? "—"} · Dobás: {response.roll || "—"}
      {response.followUp ? ` · Második dobás: ${response.followUp}` : ""}
      {response.opponent && ` · Álcázás: ${response.defenseRoll} / ${response.defenseTarget}`}</p>}
    <BlindCombat characters={characters} />
    {history.length > 0 && <details><summary>Próbák előzményei</summary><ul>{history.slice().reverse().map(record =>
      <li key={record.id}>{record.actor} · {record.name} · {record.roll} / {record.target} · {outcomeLabels[record.outcome]}</li>)}</ul></details>}
  </section>;
}
