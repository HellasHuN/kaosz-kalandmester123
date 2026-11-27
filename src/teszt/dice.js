export function rollDie(sides, random = Math.random) {
  return Math.floor(random() * sides) + 1;
}

export function readPercentileRoll(value) {
  const face = typeof value === "string" ? value.trim() : "";
  if (face === "00") return 100;
  return /^(?:0?[1-9]|[1-9][0-9]|100)$/u.test(face) ? Number(face) : NaN;
}
