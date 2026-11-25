export function rollDie(sides, random = Math.random) {
  return Math.floor(random() * sides) + 1;
}
