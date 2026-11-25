// Káosz alapkönyv, „Az istenek”, 89–92. oldal.
const pantheons = [
  ["A Káosz istenei", [
    "Yvorl", "Beshyth", "Altiahna", "Magnius", "Ogera", "Darnel", "Fabiot", "Lirien",
    "Diah’lin", "Doleris", "Gloyva", "Gwynon", "Erran Eranthar", "Esthewar", "Seliah",
    "Verghaust", "Zzerrrba’rah", "Kwanremaam", "Obmaar", "Streddihgar",
  ]],
  ["A Rend istenei", [
    "Mark’yhennon", "Ternius", "Mergenos", "Wogard", "Jahnna", "Cerebis", "Ordinis",
    "Fiona", "Wogan", "Kargil Yhron", "Saliah", "Drufian", "Venefius", "Grooms",
    "Ezerfejű Zrogdavar", "Ashkaton", "Dylgo", "R’leen’Ku", "Rachtat", "Morligard", "Homohebes",
  ]],
  ["Az Egyensúly istenei", [
    "Zhénia", "Celiahna", "Lyndara", "Cogart", "Felior", "Garbash", "Tylia",
    "Sulamir", "Maryk", "Mirabella", "Dachan", "Infangus", "Mohartha", "Khereytayri",
    "Scyssath", "Mahout", "Padat Fetus", "Dzsalál",
  ]],
];

export default function VallasValaszto({ value, onChange, original }) {
  const saved = original || value;
  const legacy = saved && !pantheons.some(([, names]) => names.includes(saved));
  return (
    <select aria-label="Vallás" className="religion-select" value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">Nincs megadva</option>
      {legacy && <option value={saved}>{saved} (mentett érték)</option>}
      {pantheons.map(([label, names]) => (
        <optgroup key={label} label={label}>
          {names.map((name) => <option key={name} value={name}>{name}</option>)}
        </optgroup>
      ))}
    </select>
  );
}
