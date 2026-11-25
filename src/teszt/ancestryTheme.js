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
};

export function ancestryTheme(race, subrace) {
  const [accent, shade] = (Object.hasOwn(variants, subrace) && variants[subrace]) ||
    (Object.hasOwn(palette, race) && palette[race]) || palette.Ember;
  return { "--sheet-accent": accent, "--sheet-shade": shade };
}
