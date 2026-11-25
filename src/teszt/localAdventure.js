const storageKey = "kaosz-teszt-kaland";
export const sampleCharacter = Object.freeze({ id: "teszt-utazo", name: "Léna, az utazó", race: "Ember",
  age: 25, playStatus: "playing", stats: Object.freeze([50, 60, 55, 55, 50]), jp: 0 });

export function readAdventure(storage) {
  try {
    const raw = storage.getItem(storageKey);
    if (!raw) return { messages: [], notes: "", blocked: false };
    const value = JSON.parse(raw);
    if (typeof value?.notes === "string" && Array.isArray(value.messages) && value.messages.every(message =>
      typeof message?.text === "string" && typeof message.recipient === "string" &&
      ["km", "player"].includes(message.author) && typeof message.sentAt === "string")) {
      return { messages: value.messages, notes: value.notes, blocked: false };
    }
  } catch {
    return { messages: [], notes: "", blocked: true };
  }
  return { messages: [], notes: "", blocked: true };
}

export function writeAdventure(storage, adventure) {
  if (adventure.blocked) return false;
  try {
    storage.setItem(storageKey, JSON.stringify({ notes: adventure.notes, messages: adventure.messages }));
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
