const storageKey = "kaosz-teszt-kaland";
export const sampleCharacter = Object.freeze({ id: "teszt-utazo", name: "Léna, az utazó", race: "Ember",
  age: 25, playStatus: "playing", stats: Object.freeze([50, 60, 55, 55, 50]), jp: 0 });

export function readAdventure(storage) {
  try {
    const raw = storage.getItem(storageKey);
    if (!raw) return { messages: [], notes: "", blocked: false };
    const value = JSON.parse(raw);
    if (typeof value?.notes === "string" &&
      (value.readCounts === undefined || (value.readCounts !== null && typeof value.readCounts === "object" &&
        !Array.isArray(value.readCounts) && Object.values(value.readCounts).every(count => Number.isSafeInteger(count) && count >= 0))) &&
      (value.markers === undefined || (Array.isArray(value.markers) && value.markers.every(entry =>
        typeof entry?.id === "string" && typeof entry.name === "string" && entry.layer === "Saját jelölők" &&
        [entry.x, entry.y].every(n => Number.isFinite(n) && n >= 0 && n <= 100)))) &&
      (value.bestiary === undefined || (Array.isArray(value.bestiary) && value.bestiary.every(entry =>
        typeof entry?.id === "string" && typeof entry.name === "string" && typeof entry.type === "string" &&
        Object.values(entry).every(item => typeof item === "string")))) &&
      (value.overrides === undefined || (Array.isArray(value.overrides) && value.overrides.every(entry =>
        ["id", "character", "rule", "previous", "approved", "reason", "recordedAt"].every(key => typeof entry?.[key] === "string")))) &&
      (value.trials === undefined || (Array.isArray(value.trials) && value.trials.every(entry =>
        typeof entry?.id === "string" && typeof entry.actor === "string" && typeof entry.name === "string" &&
        typeof entry.outcome === "string" && Number.isFinite(entry.target) && Number.isFinite(entry.roll)))) &&
      (value.currentSegment == null || (Number.isSafeInteger(value.currentSegment) && value.currentSegment > 0)) &&
      (value.segments === undefined || (Array.isArray(value.segments) && value.segments.every(entry =>
        typeof entry?.id === "string" && typeof entry.name === "string" && typeof entry.visible === "boolean" &&
        Number.isSafeInteger(entry.segment) && entry.segment >= 1))) && Array.isArray(value.messages) && value.messages.every(message =>
      typeof message?.text === "string" && typeof message.recipient === "string" &&
      ["km", "player"].includes(message.author) && typeof message.sentAt === "string")) {
      return { ...value, messages: value.messages, notes: value.notes, blocked: false };
    }
  } catch {
    return { messages: [], notes: "", blocked: true };
  }
  return { messages: [], notes: "", blocked: true };
}

export function writeAdventure(storage, adventure) {
  if (adventure.blocked) return false;
  try {
    const data = { ...adventure };
    delete data.blocked;
    storage.setItem(storageKey, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function addMessage(adventure, recipient, author, text, sentAt) {
  const trimmed = text.trim();
  if (!recipient || !trimmed || trimmed.length > 2000 || !["km", "player"].includes(author)) return adventure;
  return { ...adventure, messages: [...adventure.messages, { recipient: String(recipient), author, text: trimmed, sentAt }] };
}

export function conversationFor(adventure, recipient) {
  if (recipient == null) return [];
  return adventure.messages.filter(message => message.recipient === String(recipient));
}

function readingKey(recipient, mode) {
  return JSON.stringify([String(recipient), mode]);
}

function receivedMessages(adventure, recipient, mode) {
  return conversationFor(adventure, recipient).filter(message => message.author !== mode).length;
}

export function unreadMessages(adventure, recipient, mode) {
  return Math.max(0, receivedMessages(adventure, recipient, mode) -
    (adventure.readCounts?.[readingKey(recipient, mode)] ?? 0));
}

export function markConversationRead(adventure, recipient, mode) {
  if (!unreadMessages(adventure, recipient, mode)) return adventure;
  return { ...adventure, readCounts: { ...adventure.readCounts,
    [readingKey(recipient, mode)]: receivedMessages(adventure, recipient, mode) } };
}
