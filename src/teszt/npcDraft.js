import { rollDie } from "./dice.js";

const roles = {
  Őr: ["Hallgatózás", "Vértviselet", "Taktika"],
  Felderítő: ["Nyomolvasás", "Lopakodás", "Tájékozódás"],
  Vándor: ["Helyismeret", "Meggyőzés", "Lovaglás"],
};

export const npcRoles = Object.keys(roles);

// Egyedi TESZT 1.0 vázlatok. A számok szerkeszthető kiindulóértékek.
export function generateNpc({ id, type, role, strength, habitat }, random = Math.random) {
  if (!id || !type.trim() || !Object.hasOwn(roles, role) || !Number.isInteger(strength) || strength < 1 || strength > 10) return null;
  const secondary = Math.max(1, strength - 2);
  const stats = Array.from({ length: 5 }, () => 33 + 3 * strength + rollDie(12, random));
  const skills = roles[role].map((skill, index) => `${skill}: ${index === 0 ? strength : secondary}`);
  return { id, name: `${role} ${rollDie(20, random)}`, type, habitat,
    attributes: ["Fizikum", "Rátermettség", "Tudat", "Esszencia", "Érzékelés"].map((name, index) => `${name}: ${stats[index]}`).join("\n"),
    skills: skills.join("\n"), combat: `Támadás: ${strength}\nVédekezés: ${secondary}\nÉleterő: ${stats[0]}`,
    reference: "Egyedi TESZT 1.0 generált vázlat. A KM ellenőrzi a végleges értékeket és az előfeltételeket." };
}
