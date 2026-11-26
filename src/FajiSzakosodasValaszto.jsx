import { artGenres, ogreLimbOptions } from "./fajiSzakosodasok.js";

export default function FajiSzakosodasValaszto({ race, subrace, choices, onChange, weaponJp, stage }) {
  const tecath = race === "Gyíklény" && subrace === "Tecath";
  const forestElf = race === "Elf" && subrace === "Erdei elf";
  const weaponRace = race === "Gennymanó" || race === "Gnóm";
  const weaponTraining = choices.weaponTraining ?? {};
  const ranks = tecath || stage === "senius" ? [0, 1, 2, 3, 4] : [0, 1, 2, 3];
  const set = (key, value) => onChange({ ...choices, [key]: value });

  function setRank(track, level) {
    if (!level) set("weaponTraining", {});
    else set("weaponTraining", { attack: 1, defense: 1, ...weaponTraining, [track]: level });
  }

  if (!tecath && !weaponRace && !forestElf && race !== "Ogár") return null;
  return <section className="panel creation-panel">
    <h3>Faji szakosodások</h3>
    <div className="creation-grid">
      {forestElf && <label>Ingyenes Művészet (6. szint)
        <select value={choices.artGenre ?? ""} onChange={(event) => set("artGenre", event.target.value)}>
          <option value="">Válassz műfajt!</option>
          {artGenres.map((genre) => <option key={genre}>{genre}</option>)}
        </select>
      </label>}
      {tecath && <label><input type="checkbox" checked={choices.waterHunting === true}
        onChange={(event) => set("waterHunting", event.target.checked)} /> Vadászat vízi specializációval</label>}
      {race === "Ogár" && <>
        <label>Extra végtag (30 főértékpont darabonként)
          <input type="number" min="0" step="1" value={choices.extraLimbs ?? ""}
            onChange={(event) => set("extraLimbs", event.target.value)} />
        </label>
        {Number(choices.extraLimbs) > 0 && <label>Az extra végtagok leírása
          <input value={choices.extraLimbDescription ?? ""} onChange={(event) => set("extraLimbDescription", event.target.value)} />
        </label>}
        <label>Csonttüskés végtag hozzáadása (3 főértékpont)
          <select value="" onChange={(event) => {
            if (event.target.value) set("spikeLocations", [...(choices.spikeLocations ?? []), event.target.value]);
          }}>
            <option value="">Válassz végtagot!</option>
            {ogreLimbOptions(choices.extraLimbs).filter((limb) => !choices.spikeLocations?.includes(limb))
              .map((limb) => <option key={limb}>{limb}</option>)}
          </select>
        </label>
        {(choices.spikeLocations ?? []).map((limb) => <button type="button" key={limb}
          onClick={() => set("spikeLocations", choices.spikeLocations.filter((item) => item !== limb))}>
          {limb} csonttüskéinek törlése
        </button>)}
        <label><input type="checkbox" checked={choices.torsoSpikes === true} onChange={(event) => set("torsoSpikes", event.target.checked)} />
          Csonttüskék a törzsön (10 főértékpont)
        </label>
        <label>Egyedi torzulás és a Mesélő által meghatározott hatása
          <input value={choices.customMutation ?? ""} onChange={(event) => onChange({
            ...choices, customMutation: event.target.value, customApproved: false,
          })} />
        </label>
        <label>Egyedi torzulás főértékpont-költsége
          <input type="number" min="0" step="1" value={choices.customCost ?? ""} onChange={(event) => onChange({
            ...choices, customCost: event.target.value, customApproved: false,
          })} />
        </label>
        <label><input type="checkbox" checked={choices.customApproved === true}
          onChange={(event) => set("customApproved", event.target.checked)} /> A Mesélő jóváhagyta a torzulást és az árát</label>
      </>}
      {weaponRace && <>
        <label>Fegyvertípus
          <select value={choices.weaponType ?? ""} onChange={(event) => onChange({
            ...choices, weaponType: event.target.value, weaponApproval: false,
          })}>
            <option value="">Nincs kiválasztva</option>
            <option>Közelharci fegyver</option>
            {race === "Gennymanó" && <><option>Fúvócső</option><option>Parittya</option></>}
            <option>Íj</option>
          </select>
        </label>
        {choices.weaponType === "Közelharci fegyver" && <label>A fegyver neve
          <input value={choices.weaponName ?? ""} onChange={(event) => set("weaponName", event.target.value)} />
        </label>}
        {race === "Gennymanó" && choices.weaponType === "Íj" && <label><input type="checkbox" checked={choices.weaponApproval === true}
          onChange={(event) => set("weaponApproval", event.target.checked)} /> A Mesélő engedélyezte az íjat (legfeljebb 3-as fegyvererő)</label>}
        {race === "Gennymanó" && choices.weaponType === "Közelharci fegyver" &&
          <p>Nem mágikus fegyvernél a fegyvererő és a fegyvergyorsaság legfeljebb 3.</p>}
      </>}
      {(tecath || (weaponRace && (choices.weaponType === "Közelharci fegyver" || weaponTraining.attack))) &&
        [["attack", "Támadás"], ["defense", "Védekezés"]].map(([track, label]) => <label key={track}>
          {tecath ? "Vízi lándzsaforgatás" : "Fegyverforgatás"} – {label}
          <select value={weaponTraining[track] ?? 0} onChange={(event) => setRank(track, Number(event.target.value))}>
            {ranks.map((rank) => <option key={rank}>{rank}</option>)}
          </select>
        </label>)}
    </div>
    {weaponJp > 0 && <p>Fegyverforgatás költsége <strong>{weaponJp} Jp</strong></p>}
  </section>;
}
