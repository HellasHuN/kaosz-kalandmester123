import { createClient } from "@supabase/supabase-js";

const projectUrl = import.meta.env?.VITE_SUPABASE_URL?.trim();
const publicKey = import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
export const client = projectUrl && publicKey ? createClient(projectUrl, publicKey, {
  auth: { storageKey: "kaosz-online-session" },
}) : null;

export const normalizeInvite = value => value.trim().toLowerCase();
export const validInvite = value => /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/u.test(normalizeInvite(value));

export function sharedCharacter(character) {
  return { character_name: String(character?.name ?? "").slice(0, 100), character_race: String(character?.race ?? "").slice(0, 40) };
}

export function readableError(error) {
  if (error?.code === "40001") return "A jelenet időközben megváltozott. Olvasd be az új állapotot, majd próbáld újra.";
  if (error?.code === "22023") return "A meghívókód érvénytelen vagy lecserélték.";
  if (error?.code === "42501") return "Ehhez a művelethez nincs jogosultságod.";
  if (error?.code === "anonymous_provider_disabled") return "A szolgáltatáson még nincs engedélyezve a vendégcsatlakozás.";
  return "Az online művelet sikertelen. Ellenőrizd az internetkapcsolatot, majd próbáld újra.";
}

function unwrap({ data, error }) {
  if (error) throw error;
  return data;
}

let sessionRequest;
export function getGuestId() {
  sessionRequest ??= (async () => {
    const existing = unwrap(await client.auth.getSession());
    const session = existing.session ?? unwrap(await client.auth.signInAnonymously()).session;
    if (!session) throw new Error("Missing Supabase session");
    return session.user.id;
  })().finally(() => { sessionRequest = undefined; });
  return sessionRequest;
}

export async function listRooms() {
  return unwrap(await client.from("kaosz_rooms").select("id,title,host_id").order("created_at", { ascending: false }));
}

export async function openRoom(kind, { title, nickname, invite }) {
  return kind === "create"
    ? unwrap(await client.rpc("kaosz_create_room", { room_title: title.trim(), nickname: nickname.trim() }))
    : unwrap(await client.rpc("kaosz_join_room", { invite_code: normalizeInvite(invite), nickname: nickname.trim() }));
}

export async function loadRoom(id) {
  const [room, members, scene, messages] = await Promise.all([
    client.from("kaosz_rooms").select("id,title,host_id").eq("id", id).single(),
    client.from("kaosz_members").select("user_id,display_name,character_name,character_race").eq("room_id", id).order("joined_at"),
    client.from("kaosz_scene").select("scene,segment,version").eq("room_id", id).single(),
    client.from("kaosz_messages").select("id,sender_id,body,sent_at").eq("room_id", id)
      .order("sent_at", { ascending: false }).order("id", { ascending: false }).limit(100),
  ].map(request => request.then(unwrap)));
  return { room, members, scene, messages: [...messages].reverse() };
}

export function subscribeRoom(id, refresh, statusChanged) {
  const channel = client.channel(`kaosz-room-${id}`);
  for (const table of ["kaosz_members", "kaosz_scene", "kaosz_messages"]) {
    channel.on("postgres_changes", { event: "*", schema: "public", table, filter: `room_id=eq.${id}` }, refresh);
  }
  channel.subscribe(status => {
    statusChanged(status);
    if (status === "SUBSCRIBED") refresh();
  });
  return () => { void client.removeChannel(channel); };
}

export async function inviteCode(room, rotate = false) {
  return unwrap(await client.rpc("kaosz_room_invite", { room, rotate }));
}

export async function publishScene(room, expectedVersion, scene, segment) {
  return unwrap(await client.rpc("kaosz_update_scene", {
    room, expected_version: expectedVersion, new_scene: scene, new_segment: segment,
  }));
}

export async function sendMessage(room, body) {
  unwrap(await client.from("kaosz_messages").insert({ room_id: room, body: body.trim() }));
}

export async function updateMemberCharacter(room, user, character) {
  unwrap(await client.from("kaosz_members").update(sharedCharacter(character)).eq("room_id", room).eq("user_id", user));
}
