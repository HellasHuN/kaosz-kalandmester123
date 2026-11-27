import { useState, useEffect } from "react";
import "./App.css";

const races = {
  Elf: [[20, 70], [50, 90], [55, 90], [30, 85]],
  Ember: [[30, 80], [30, 80], [25, 80], [35, 90]],
  Gennymanó: [[15, 45], [60, 100], [20, 85], [20, 70]],
  Gilf: [[35, 85], [35, 85], [35, 85], [30, 100]],
  Gnóm: [[30, 60], [45, 85], [60, 90], [20, 70]],
  Gyíklény: [[30, 70], [35, 85], [20, 75], [20, 70]],
  Manó: [[15, 50], [30, 70], [20, 65], [15, 65]],
  Ogár: [[55, 95], [25, 70], [15, 60], [10, 60]],
  Ork: [[30, 90], [25, 75], [25, 70], [20, 70]],
  Törpe: [[45, 85], [25, 70], [25, 75], [20, 70]],
  Tündérke: [[10, 30], [40, 100], [25, 80], [25, 80]],
  "Félvér elf": [[35, 75], [45, 85], [35, 80], [25, 80]],
  "Félvér gilf": [[35, 80], [30, 75], [30, 80], [25, 85]],
  "Félvér ogár": [[50, 90], [30, 75], [20, 70], [20, 75]],
  Szürkemanó: [[15, 100], [15, 100], [15, 100], [10, 100]],
  "Félvér ork": [[45, 85], [30, 80], [25, 80], [15, 75]],
};
const breedingRules = {
  Elf: {
    Ember: "T",
    Gilf: "T",
    Gnóm: "M",
    Manó: "T",
    Ogár: "N",
    Ork: "M",
    Törpe: "M",
  },
  Ember: {
    Gilf: "M",
    Gnóm: "T",
    Manó: "T",
    Ogár: "M",
    Ork: "T",
    Törpe: "M",
  },
  Gilf: {
    Gnóm: "N",
    Manó: "T",
    Ogár: "N",
    Ork: "M",
    Törpe: "N",
  },
  Gnóm: {
    Manó: "T",
    Ogár: "M",
    Ork: "T",
    Törpe: "M",
  },
  Manó: {
    Ogár: "T",
    Ork: "T",
    Törpe: "T",
  },
  Ogár: {
    Ork: "T",
    Törpe: "N",
  },
  Ork: {
    Törpe: "N",
  },
};

function getBreedingStatus(race1, race2) {
  if (race1 === race2) return "T";

  return (
    breedingRules[race1]?.[race2] ??
    breedingRules[race2]?.[race1] ??
    "N"
  );
}
const ageLimits = {
  Elf: [33, 300, 350, 550],
  Ember: [13, 70, 90, 110],
  Gennymanó: [1, 10, 15, 20],
  Gilf: [35, 1000, 1100, 1500],
  Gnóm: [21, 100, 120, 170],
  Gyíklény: [9, 150, 200, 300],
  Manó: [3, 30, 40, 55],
  Ogár: [10, 60, 70, 90],
  Ork: [10, 40, 50, 85],
  Törpe: [30, 150, 200, 250],
  Tündérke: [1, 40, 45, 50],

  "Félvér elf": [15, 0, 0, 0],
  "Félvér gilf": [16, 0, 0, 0],
  "Félvér ogár": [18, 0, 0, 0],
  "Félvér ork": [17, 0, 0, 0],

  Szürkemanó: [13, 70, 90, 110],
};

const parentRaces = [
  "Elf",
  "Ember",
  "Gilf",
  "Gnóm",
  "Manó",
  "Ogár",
  "Ork",
  "Törpe",
];

const attributes = [
  ["Fizikum", "Erő", "Szívósság"],
  ["Rátermettség", "Ügyesség", "Reflex"],
  ["Tudat", "Intelligencia", "Lelkierő"],
  ["Esszencia", "Varázserő", "Esszenciapajzs"],
];
function getAncestryAgeLimits(node) {
  if (!node) return [];

  const ownLimits = ageLimits[node.race];
  if (!ownLimits) return [];

  const parents = node.parents || [];

  if (parents.length === 0) {
    return ownLimits;
  }

  const firstLimits = parents[0]?.race
    ? getAncestryAgeLimits(parents[0])
    : ownLimits;

  const secondLimits = parents[1]?.race
    ? getAncestryAgeLimits(parents[1])
    : ownLimits;

  if (!firstLimits.length || !secondLimits.length) {
    return ownLimits;
  }

  return [0, 1, 2, 3].map((index) =>
    Math.round(
      (firstLimits[index] + secondLimits[index]) / 2
    )
  );
}
function initialStats(race) {
  const limits = races[race];
  const values = limits.map((limit) => limit[0]);

  let remaining = 220 - values.reduce((sum, value) => sum + value, 0);

  while (remaining > 0) {
    let changed = false;

    for (let i = 0; i < values.length && remaining > 0; i++) {
      if (values[i] < limits[i][1]) {
        values[i]++;
        remaining--;
        changed = true;
      }
    }

    if (!changed) break;
  }

  return values;
}

function App() {
  const [race, setRace] = useState("");
  const [page, setPage] = useState("alkotas");
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [parent1, setParent1] = useState("");
const [parent2, setParent2] = useState("");
const [ancestry, setAncestry] = useState({
  race: "",
  parents: [],
});
  const [stats, setStats] = useState([55, 55, 55, 55]);

  // Az aktív érték eltérése az alap főértéktől.
  // A passzív érték ugyanennyivel csökken.
  const [adjustments, setAdjustments] = useState([0, 0, 0, 0]);
const [savedCharacters, setSavedCharacters] = useState(() => {
  try {
    return JSON.parse(localStorage.getItem("kaosz-karakterek") || "[]");
  } catch {
    return [];
  }
});
const [deletingCharacter, setDeletingCharacter] = useState(null);
const [deleteStep, setDeleteStep] = useState(0);
const [farewellMessage, setFarewellMessage] = useState("");
useEffect(() => {
  localStorage.setItem(
    "kaosz-karakterek",
    JSON.stringify(savedCharacters)
  );
}, [savedCharacters]);
  const total = stats.reduce((sum, value) => sum + value, 0);
  const remaining = 220 - total;
  const isHalfBlood =
  race.startsWith("Félvér") || race === "Szürkemanó";

const calculatedAgeLimits =
  ancestry.parents.length === 2 &&
  ancestry.parents.every((parent) => parent?.race)
    ? getAncestryAgeLimits(ancestry)
    : ageLimits[race];

function changeRace(value) {
  setRace(value);
    setAncestry({
    race: value,
    parents: [],
  });
  setAge("");
  setParent1("");
  setParent2("");

  if (value) {
    setStats(initialStats(value));
  }

  if (value === "Félvér elf") {
    setParent1("Elf");
  } else if (value === "Félvér gilf") {
    setParent1("Gilf");
  } else if (value === "Félvér ogár") {
    setParent1("Ogár");
  } else if (value === "Félvér ork") {
    setParent1("Ork");
  
  }

  setAdjustments([0, 0, 0, 0]);
  if (value.startsWith("Félvér")) {
  const fixedParent = {
    "Félvér elf": "Elf",
    "Félvér gilf": "Gilf",
    "Félvér ogár": "Ogár",
    "Félvér ork": "Ork",
  }[value];

  setAncestry({
    race: value,
    parents: [
      { race: fixedParent, parents: [] },
      { race: "", parents: [] },
    ],
  });
}
}

  function changeStat(index, amount) {
    if (!race) return;

    const limits = races[race];
    const next = [...stats];
    const newValue = next[index] + amount;

    if (newValue < limits[index][0] || newValue > limits[index][1]) {
      return;
    }

    next[index] = newValue;
    setStats(next);

    // A főérték változásakor az aktív/passzív rész visszaáll
    // az új főértékre.
    const nextAdjustments = [...adjustments];
    nextAdjustments[index] = 0;
    setAdjustments(nextAdjustments);
  }

  function changeAdjustment(index, amount) {
    const limit = Math.floor(stats[index] / 5);
    const next = [...adjustments];
    const newValue = next[index] + amount;

    if (Math.abs(newValue) > limit) return;

    next[index] = newValue;
    setAdjustments(next);
  }
  function changeGrandparent(parentIndex, grandparentIndex, value) {
  setAncestry((previous) => {
    const parents = [...previous.parents];

    const parent = parents[parentIndex] || {
      race: "",
      parents: [],
    };

    const grandparents = [...(parent.parents || [])];

    grandparents[grandparentIndex] = {
      race: value,
      parents: [],
    };

    parents[parentIndex] = {
      ...parent,
      parents: grandparents,
    };

    return {
      ...previous,
      parents,
    };
  });
}
function saveCharacter() {
  if (!name.trim() || !age || !race) {
    alert("Töltsd ki a nevet, életkort és válaszd ki a fajt!");
    return;
  }

  if (total !== 220) {
    alert("A főértékek összege pontosan 220 kell legyen!");
    return;
  }

  const character = {
    id: Date.now(),
    name: name.trim(),
    age,
    race,
    parent1,
parent2,
ancestry: JSON.parse(JSON.stringify(ancestry)),
    stats: [...stats],
    adjustments: [...adjustments],
  };

  setSavedCharacters((previous) => [...previous, character]);

  alert("A karakter sikeresen elmentve!");
}
  function loadCharacter(character) {
  setName(character.name);
  setAge(character.age);
  setRace(character.race);
  setParent1(character.parent1 || "");
setParent2(character.parent2 || "");
setAncestry(
  character.ancestry || {
    race: character.race,
    parents: [],
  }
);
  setStats([...character.stats]);
  setAdjustments([...character.adjustments]);
}
    function startDelete(character) {
  
  setDeletingCharacter(character);
  setDeleteStep(1);
}

function confirmDelete() {
  setDeleteStep(2);
}

function characterDied() {
  const characterName = deletingCharacter.name;

  setSavedCharacters((previous) =>
    previous.filter((character) => character.id !== deletingCharacter.id)
  );

  setDeletingCharacter(null);
  setDeleteStep(0);
  setFarewellMessage(
    `${characterName} kalandja véget ért. Emléke örökre megmarad a történetekben.`
  );
}

function characterSurvived() {
  const characterName = deletingCharacter.name;

  setDeletingCharacter(null);
  setDeleteStep(0);
  setFarewellMessage(
    `${characterName} életben marad! Talán egy másik kalandban még találkozunk vele.`
  );
}
  
function checkCharacter() {
    if (!name.trim()) {
      alert("Add meg a karakter nevét!");
      return;
    }

    if (!age || Number(age) <= 0) {
      alert("Add meg a karakter életkorát!");
      return;
    }
    if (!race) {
  alert("Válassz fajt!");
  return;
}
if (isHalfBlood && (!parent1 || !parent2)) {
  alert("Válaszd ki mindkét szülő faját!");
  return;
}

const ageLimit = calculatedAgeLimits;

if (!ageLimit) {
  alert("Az életkorhatárok még nem számíthatók ki!");
  return;
}

if (Number(age) > ageLimit[3]) {
  alert("A karakter életkora meghaladja a faj maximális életkorát!");
  return;
}
    

    if (total !== 220) {
      alert("A főértékek összege pontosan 220 kell legyen!");
      return;
    }

    const limits = races[race];

    const withinLimits = stats.every(
      (value, index) =>
        value >= limits[index][0] && value <= limits[index][1]
    );

    if (!withinLimits) {
      alert("Valamelyik főérték kívül esik a faj határértékein!");
      return;
    }

    alert("A karakter alapadatai érvényesek!");
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <h1>KÁOSZ</h1>
        <p>Szerepjáték</p>

        <nav className="menu">
<div className={page === "alkotas" ? "active" : ""} onClick={() => setPage("alkotas")}>Karakteralkotás</div>
<div className={page === "karakterlap" ? "active" : ""} onClick={() => setPage("karakterlap")}>Karakterlap</div>
<div className={page === "jartassagok" ? "active" : ""} onClick={() => setPage("jartassagok")}>Jártasságok</div>
<div className={page === "felszereles" ? "active" : ""} onClick={() => setPage("felszereles")}>Felszerelés</div>
<div className={page === "karakterek" ? "active" : ""} onClick={() => setPage("karakterek")}>Karakterek</div>
        </nav>
      </aside>

      <main>
        {page === "alkotas" && (
        <><div className="welcome">
          <h2>Karakteralkotás</h2>
          <p>Hozd létre a kalandod főszereplőjét!</p>
        </div>

        <section className="panel">
          <h3>Alapadatok</h3>

          <label>Karakter neve</label>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Karakter neve"
          />

         

          <label>Faj</label>
          <select
            value={race}
            onChange={(event) => changeRace(event.target.value)}
          >
            <option value="">Válassz fajt!</option>
            {Object.keys(races).map((raceName) => (
              <option key={raceName} value={raceName}>
                {raceName}
              </option>
            ))}
          </select>
       {(race.startsWith("Félvér") || race === "Szürkemanó") && (
  <>
    <h3>Szülők származása</h3>

    <label>Első szülő faja</label>
 <select
  disabled={race.startsWith("Félvér")}
      value={parent1}
      onChange={(event) => {
       setParent1(event.target.value);
setAge("");
setAncestry((previous) => ({
  ...previous,
  parents: [
    { race: event.target.value, parents: [] },
    previous.parents[1] || { race: "", parents: [] },
  ],
}));
      }}
    >
      <option value="">Válassz fajt!</option>
    {parentRaces
  .filter((item) =>
    !parent2 || getBreedingStatus(item, parent2) !== "N"
  )
  .map((item) => (
    <option key={item} value={item}>{item}</option>
  ))}
    </select>

    <label>Második szülő faja</label>
    <select
      value={parent2}
      onChange={(event) => {
       setParent2(event.target.value);
setAge("");
setAncestry((previous) => ({
  ...previous,
  parents: [
    previous.parents[0] || { race: "", parents: [] },
    { race: event.target.value, parents: [] },
  ],
}));
      }}
    >
      <option value="">Válassz fajt!</option>
     {parentRaces
  .filter((item) =>
    !parent1 || getBreedingStatus(parent1, item) !== "N"
  )
  .map((item) => (
  <option key={item} value={item}>
  {item}{getBreedingStatus(parent1, item) === "M" ? " (M)" : ""}
</option>
  ))}
    </select><h4>Első szülő nagyszülei</h4>

<label>Első nagyszülő</label>
<select
  value={ancestry.parents[0]?.parents?.[0]?.race || ""}
  onChange={(event) => changeGrandparent(0, 0, event.target.value)}
>
  <option value="">Nincs megadva</option>
  {parentRaces.map((item) => (
    <option key={item} value={item}>{item}</option>
  ))}
</select>

<label>Második nagyszülő</label>
<select
  value={ancestry.parents[0]?.parents?.[1]?.race || ""}
  onChange={(event) => changeGrandparent(0, 1, event.target.value)}
>
  <option value="">Nincs megadva</option>
  {parentRaces.map((item) => (
    <option key={item} value={item}>{item}</option>
  ))}
</select>

<h4>Második szülő nagyszülei</h4>

<label>Harmadik nagyszülő</label>
<select
  value={ancestry.parents[1]?.parents?.[0]?.race || ""}
  onChange={(event) => changeGrandparent(1, 0, event.target.value)}
>
  <option value="">Nincs megadva</option>
  {parentRaces.map((item) => (
    <option key={item} value={item}>{item}</option>
  ))}
</select>

<label>Negyedik nagyszülő</label>
<select
  value={ancestry.parents[1]?.parents?.[1]?.race || ""}
  onChange={(event) => changeGrandparent(1, 1, event.target.value)}
>
  <option value="">Nincs megadva</option>
  {parentRaces.map((item) => (
    <option key={item} value={item}>{item}</option>
  ))}
</select>
  </>
  )}
{race && calculatedAgeLimits && (
  <>
    <label>Életkor</label>
    <select
      value={age}
      onChange={(event) => setAge(event.target.value)}
    >
      <option value="">Válassz életkort!</option>

      {Array.from(
        { length: calculatedAgeLimits[3] },
        (_, i) => i + 1
      ).map((ageValue) => (
        <option key={ageValue} value={ageValue}>
          {ageValue} év
        </option>
      ))}
    </select>

    <small>
      Juvenis határ: {calculatedAgeLimits[0]} év
      <br />
      Átlagos életkor: {calculatedAgeLimits[1]}–{calculatedAgeLimits[2]} év
      <br />
      Extrém maximum: {calculatedAgeLimits[3]} év
    </small>
  </>
)}
        </section>

        {race && (
          <section className="panel">
            <h3>Főértékek</h3>

            <div className="points">
              <span>Elosztható főértékpont: 220</span>
              <strong>Hátralévő pont: {remaining}</strong>
            </div>

            <div className="bar">
              <div
                className="bar-fill"
                style={{
                  width: `${Math.min((total / 220) * 100, 100)}%`,
                }}
              />
            </div>

            {attributes.map((attribute, index) => {
              const adjustment = adjustments[index];
              const activeValue = stats[index] + adjustment;
              const passiveValue = stats[index] - adjustment;
              const adjustmentLimit = Math.floor(stats[index] / 5);

              return (
                <div className="attribute" key={attribute[0]}>
                  <div className="attribute-title">
                    <strong>{attribute[0]}</strong>
                    <span>
                      {races[race][index][0]}–{races[race][index][1]}
                    </span>
                  </div>

                  <div className="stat-control">
                    <button
                      onClick={() => changeStat(index, -1)}
                      disabled={stats[index] <= races[race][index][0]}
                    >
                      −
                    </button>

                    <strong>{stats[index]}</strong>

                    <button
                      onClick={() => changeStat(index, 1)}
                      disabled={stats[index] >= races[race][index][1]}
                    >
                      +
                    </button>
                  </div>

                  <div className="split-controls">
                    <div className="split-value">
                      <span>{attribute[1]} (aktív)</span>
                      <strong>{activeValue}</strong>
                    </div>

                    <div className="split-buttons">
                      <button
                        onClick={() => changeAdjustment(index, -1)}
                        disabled={adjustment <= -adjustmentLimit}
                        title="Aktív érték csökkentése"
                      >
                        −
                      </button>

                      <span>
                        {adjustment > 0 ? `+${adjustment}` : adjustment}
                      </span>

                      <button
                        onClick={() => changeAdjustment(index, 1)}
                        disabled={adjustment >= adjustmentLimit}
                        title="Aktív érték növelése"
                      >
                        +
                      </button>
                    </div>

                    <div className="split-value">
                      <span>{attribute[2]} (passzív)</span>
                      <strong>{passiveValue}</strong>
                    </div>
                  </div>

                  <small>
                    Megengedett eltérés: ±{adjustmentLimit} pont
                  </small>
                </div>
              );
            })}

            <button className="save" onClick={checkCharacter}>
              KARAKTER ELLENŐRZÉSE
            </button>
<button className="save" onClick={saveCharacter}> 
   KARAKTER MENTÉSE
</button>
</section>
        )}
        </>)}
      {page === "karakterek" && (
  <section className="panel">
    <h2>Elmentett karakterek</h2>

    {savedCharacters.length === 0 ? (
      <p>Még nincs elmentett karaktered.</p>
    ) : (
      savedCharacters.map((character) => (
        <div key={character.id} className="attribute">
          <h3>{character.name}</h3>
          <p>{character.race} – {character.age} éves</p>
          <button
            className="save"
            onClick={() => {
              loadCharacter(character);
              setPage("alkotas");
            }}
          >
            Karakter betöltése
          </button><button
  className="save"
  onClick={() => startDelete(character)}
>
  Karakter eltávolítása
</button>
        </div>
      ))
    )}
  </section>
  )}
{deletingCharacter && (
  <div className="modal-overlay">
    <section className="modal-panel">
      {deleteStep === 1 && (
        <>
          <h2>Biztosan törlöd?</h2>
          <p>
            Biztos törölni akarod {deletingCharacter.name} karaktert?
          </p>
          <button className="save" onClick={confirmDelete}>
            Igen, tovább
          </button>
          <button
            className="save"
            onClick={() => {
              setDeletingCharacter(null);
              setDeleteStep(0);
            }}
          >
            Mégsem
          </button>
        </>
      )}

      {deleteStep === 2 && (
        <>
          <h2>Nem gondoltad meg magad?</h2>
          <p>{deletingCharacter.name} sorsa a te kezedben van.</p>
          <button className="save" onClick={characterDied}>
            Meghalt
          </button>
          <button className="save" onClick={characterSurvived}>
            Életben marad
          </button>
        </>
      )}
    </section>
  </div>
)}

{farewellMessage && (
  <div className="modal-overlay">
    <section className="modal-panel">
    <h2>Búcsú a kaland végén</h2>
    <p>{farewellMessage}</p>
    <button className="save" onClick={() => setFarewellMessage("")}>
      Bezárás
    </button>
  </section>
</div>)}</main>
   
    </div>
  );
}


export default App;