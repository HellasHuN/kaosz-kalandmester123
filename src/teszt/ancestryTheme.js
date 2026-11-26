import { subraces } from "../fajiSzabalyok.js";

const palette = {
  Elf: ["#607c4c", "#294632"], Ember: ["#a67c52", "#5c3c30"],
  Gennymanó: ["#7d8949", "#3a4125"], Gilf: ["#8b6d9a", "#40304d"],
  Gnóm: ["#b67746", "#644027"], Gyíklény: ["#548e7b", "#244a42"],
  Manó: ["#938857", "#514a2c"], Ogár: ["#aa6c54", "#4c362a"],
  Ork: ["#a7875d", "#57492e"], Törpe: ["#9b6d42", "#46352a"],
  Tündérke: ["#869769", "#3e5d44"], "Félvér elf": ["#8c9760", "#485637"],
  "Félvér gilf": ["#9b7f9d", "#504057"], "Félvér ogár": ["#9e7463", "#593f34"],
  "Félvér ork": ["#9d8865", "#4d422c"], Szürkemanó: ["#8a8e86", "#484d44"],
};
const variants = {
  "Erdei elf": ["#79924e", "#304b2a"],
  "Bérci könnyűléptű": ["#8296a7", "#324756"],
  Tecath: ["#649c9f", "#234b51"],
  Scyss: ["#78a58a", "#244c3d"],
  "Hegyi ork": ["#bb8a5c", "#583d2c"],
  "Üregi (dombi) ork": ["#879a62", "#394537"],
  "Mocsári ork": ["#6e9c83", "#28473b"],
  "Barlangi manó": ["#a79b76", "#434035"],
  Vízimanó: ["#6e9bab", "#2d4954"],
  Tündérke: ["#a4af69", "#4e6644"],
  Tündérmanó: ["#b68faf", "#513b54"],
  "Átlagos gnóm": ["#b78058", "#66442e"],
  "Fekete gnóm": ["#9690a0", "#3a333e"],
  "Városi gnóm": ["#d2ac74", "#745538"],
};

const raceOrder = Object.keys(palette);
const variantOrder = ["Erdei elf", "Bérci könnyűléptű", "Hegyi ork", "Üregi (dombi) ork", "Mocsári ork",
  "Barlangi manó", "Vízimanó", "Tündérke", "Tündérmanó", "Átlagos gnóm", "Fekete gnóm", "Városi gnóm", "Tecath", "Scyss"];

export function ancestryTheme(race, subrace) {
  const variant = Object.hasOwn(subraces, race) && subraces[race].includes(subrace) ? subrace : null;
  const [accent, shade] = variants[variant] ?? (Object.hasOwn(palette, race) ? palette[race] : palette.Ember);
  const raceIndex = raceOrder.indexOf(race);
  const prefix = variant ? `variant-${variantOrder.indexOf(variant) + 1}` : `race-${raceIndex < 0 ? 2 : raceIndex + 1}`;
  const directory = new URL(`${import.meta.env.BASE_URL}ancestry/`, document.baseURI).href;
  return { "--sheet-accent": accent, "--sheet-shade": shade,
    "--ancestry-portrait": `url("${directory}${prefix}.webp")`,
    "--ancestry-background": `url("${directory}${prefix}-landscape.webp")` };
}
