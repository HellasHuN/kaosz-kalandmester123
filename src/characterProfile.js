export const profileFields = [
  ["birthplace", "Származási hely"], ["heightCm", "Magasság", "cm"], ["weightKg", "Testsúly", "kg"],
  ["hairColor", "Hajszín"], ["eyeColor", "Szemszín"], ["socialStatus", "Társadalmi helyzet"],
  ["distinguishingMarks", "Különleges jegyek"],
];

export function readProfile(character) {
  return Object.fromEntries(profileFields.map(([key]) => {
    const value = character?.profile?.[key] ?? character?.[key];
    return [key, typeof value === "string" || Number.isFinite(value) ? String(value) : ""];
  }));
}

export function profileError(profile, previous = {}) {
  return profileFields.some(([key, , unit]) => profile[key] !== previous[key] &&
    (profile[key].length > 160 || (unit && profile[key] && !(Number.isFinite(Number(profile[key])) && Number(profile[key]) > 0))))
    ? "A magasság és a testsúly pozitív szám legyen. Egy adat legfeljebb 160 karakter lehet." : "";
}
