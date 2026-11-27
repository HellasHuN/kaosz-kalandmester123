import { useEffect, useRef, useState } from "react";
import {
  client, getGuestId, inviteCode, listRooms, loadRoom, openRoom, publishScene, readableError,
  sendMessage, subscribeRoom, updateMemberCharacter, validInvite,
} from "./rooms.js";
import "./online.css";

function Lobby({ rooms, onOpen, onEnter, busy }) {
  const initialCode = new URLSearchParams(window.location.search).get("kaland") ?? "";
  const [tab, setTab] = useState(initialCode ? "join" : "create");
  return <>
    <div className="online-switch" aria-label="Kaland műveletei">
      <button type="button" aria-pressed={tab === "create"} onClick={() => setTab("create")}>Létrehozás</button>
      <button type="button" aria-pressed={tab === "join"} onClick={() => setTab("join")}>Csatlakozás</button>
    </div>
    <form key={tab} onSubmit={event => {
      event.preventDefault();
      const fields = new FormData(event.currentTarget);
      onEnter(tab, { title: fields.get("title"), nickname: fields.get("nickname"), invite: fields.get("invite") });
    }}>
      {tab === "create" ? <label>Kaland címe<input name="title" required maxLength={80} /></label>
        : <label>Meghívókód<input name="invite" required autoCorrect="off" autoCapitalize="none" spellCheck={false}
          maxLength={36} defaultValue={initialCode} /></label>}
      <label>Megjelenített név<input name="nickname" required maxLength={40} autoComplete="nickname" /></label>
      <button className="online-primary" disabled={busy}>{tab === "create" ? "Kaland létrehozása" : "Csatlakozás a kalandhoz"}</button>
    </form>
    {rooms.length > 0 && <section><h3>Kalandjaim</h3><ul className="online-list">{rooms.map(room =>
      <li key={room.id}><button type="button" onClick={() => onOpen(room.id)}>{room.title}</button></li>)}</ul></section>}
  </>;
}

function SceneEditor({ scene, onSave, busy }) {
  const [draft, setDraft] = useState(scene.scene);
  const [segment, setSegment] = useState(String(scene.segment ?? ""));
  const [version, setVersion] = useState(scene.version);
  return <form onSubmit={async event => {
    event.preventDefault();
    const saved = await onSave(version, draft, segment === "" ? null : Number(segment));
    if (saved) setVersion(saved.version);
  }}>
    {version !== scene.version && <p role="status">A jelenet egy másik munkamenetben frissült.
      <button type="button" onClick={() => { setDraft(scene.scene); setSegment(String(scene.segment ?? "")); setVersion(scene.version); }}>
        Legfrissebb betöltése
      </button>
    </p>}
    <label>Jelenet<textarea value={draft} onChange={event => setDraft(event.target.value)} maxLength={4000} rows={4} /></label>
    <label>Aktuális szegmens<input type="number" value={segment} onChange={event => setSegment(event.target.value)} min="0" max="2147483647" /></label>
    <button className="online-primary" disabled={busy || version !== scene.version}>Jelenet közzététele</button>
  </form>;
}

function LiveRoom({ id, user, characters, onBack }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("scene");
  const [connection, setConnection] = useState("CONNECTING");
  const [invite, setInvite] = useState("");
  const [notice, setNotice] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const refreshCurrent = useRef(null);
  const isHost = data?.room.host_id === user;
  useEffect(() => {
    let mounted = true;
    let request = 0;
    async function refresh() {
      const version = ++request;
      try {
        const snapshot = await loadRoom(id);
        if (mounted && version === request) {
          setData(previous => previous && previous.scene.version > snapshot.scene.version
            ? { ...snapshot, scene: previous.scene } : snapshot);
        }
      } catch (failure) {
        if (mounted && version === request) setError(readableError(failure));
      }
    }
    refreshCurrent.current = refresh;
    const stop = subscribeRoom(id, refresh, setConnection);
    void refresh();
    const checkConnection = setInterval(() => { if (!document.hidden) void refresh(); }, 30000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      mounted = false;
      stop();
      clearInterval(checkConnection);
      document.removeEventListener("visibilitychange", refresh);
      refreshCurrent.current = null;
    };
  }, [id]);

  async function act(action) {
    if (pending.current) return undefined;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      return await action();
    } catch (failure) {
      setError(readableError(failure));
      if (failure?.code === "40001") await refreshCurrent.current?.();
      return undefined;
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  if (!data) return <><button type="button" onClick={onBack}>Vissza a kalandokhoz</button>
    {error ? <p role="alert">{error}</p> : <p role="status">Kaland betöltése…</p>}</>;

  async function shareInvite() {
    const code = invite || await act(() => inviteCode(id));
    if (!code) return;
    setInvite(code);
    const url = new URL(window.location.href);
    url.search = "";
    url.searchParams.set("kaland", code);
    try {
      await navigator.clipboard.writeText(url.href);
      setNotice("Meghívólink másolva.");
    } catch {
      setNotice("Másold ki az alább megjelenő kódot, és küldd el a játékosnak.");
    }
  }

  return <>
    <header className="online-room-header">
      <button type="button" onClick={onBack}>← Kalandok</button>
      <span aria-live="polite">{connection === "SUBSCRIBED" ? "Élő kapcsolat" : "Élő kapcsolat helyreállítása…"}</span>
      <h2>{data.room.title}</h2>
      <p>{isHost ? "Kalandmester" : "Játékos"}</p>
    </header>
    {error && <p role="alert">{error}</p>}
    <nav className="online-switch" aria-label="Kaland felülete">
      {[["scene", "Jelenet"], ["chat", "Üzenetek"], ["members", "Csapat"]].map(([key, label]) =>
        <button type="button" key={key} onClick={() => setTab(key)} aria-pressed={tab === key}>{label}</button>)}
    </nav>
    {tab === "scene" && <>
      <h3>Közös jelenet</h3>
      {data.scene.segment != null && <p>Aktuális szegmens: <strong>{data.scene.segment}</strong></p>}
      <p className="online-scene">{data.scene.scene || "A KM még nem tett közzé jelenetet."}</p>
      {isHost && <SceneEditor scene={data.scene} busy={busy} onSave={(expected, scene, segment) => act(async () => {
        const updated = await publishScene(id, expected, scene, segment);
        setData(previous => previous.scene.version < updated.version ? { ...previous, scene: updated } : previous);
        return updated;
      })} />}
    </>}
    {tab === "chat" && <section>
      <h3>Üzenetek</h3>
      <ol className="online-messages" aria-label="A kaland utolsó 100 üzenete">{data.messages.map(item => <li key={item.id}>
        <strong>{data.members.find(member => member.user_id === item.sender_id)?.display_name ?? "Csapattag"}</strong>
        <time dateTime={item.sent_at}>{new Date(item.sent_at).toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" })}</time>
        <p>{item.body}</p>
      </li>)}</ol>
      <form onSubmit={event => {
        event.preventDefault();
        if (!message.trim()) return;
        const sent = message;
        void act(async () => {
          await sendMessage(id, sent);
          setMessage(previous => previous === sent ? "" : previous);
          await refreshCurrent.current?.();
        });
      }}>
        <label>Üzenet<textarea value={message} onChange={event => setMessage(event.target.value)} maxLength={1000} rows={2} required /></label>
        <button className="online-primary" disabled={busy || !message.trim()}>Küldés</button>
      </form>
    </section>}
    {tab === "members" && <section>
      <h3>Csapat</h3>
      <ul className="online-list">{data.members.map(member => <li key={member.user_id}>
        <strong>{member.display_name}</strong>{member.user_id === data.room.host_id && " · KM"}
        {member.character_name && <p>{member.character_name}{member.character_race && ` · ${member.character_race}`}</p>}
      </li>)}</ul>
      <form onSubmit={event => {
        event.preventDefault();
        const key = new FormData(event.currentTarget).get("character");
        void act(async () => {
          await updateMemberCharacter(id, user, characters.find(character => String(character.id) === key));
          await refreshCurrent.current?.();
        });
      }}>
        <label>Megosztott karakter neve és faja<select name="character">
          <option value="">Nincs megosztott karakter</option>
          {characters.map(character => <option key={character.id} value={String(character.id)}>{character.name}</option>)}
        </select></label>
        <button disabled={busy}>Név és faj megosztása</button>
      </form>
      {isHost && <div className="online-invite">
        <button type="button" onClick={shareInvite} disabled={busy}>Meghívólink másolása</button>
        {invite && <label>Meghívókód<input readOnly value={invite} /></label>}
        {invite && <button type="button" disabled={busy} onClick={() => {
          if (window.confirm("Lecseréled a meghívókódot? A jelenlegi tagok maradnak.")) {
            void act(async () => { setInvite(await inviteCode(id, true)); setNotice("Új meghívókód készült."); });
          }
        }}>Kód cseréje</button>}
        {notice && <p role="status">{notice}</p>}
      </div>}
    </section>}
  </>;
}

export default function OnlineAdventure({ characters }) {
  const [user, setUser] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [room, setRoom] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);

  useEffect(() => {
    let active = true;
    if (!client) return;
    void getGuestId().then(async id => {
      const items = await listRooms();
      if (active) { setUser(id); setRooms(items); }
    }).catch(failure => { if (active) setError(readableError(failure)); });
    return () => { active = false; };
  }, []);

  async function enter(kind, fields) {
    if (pending.current) return;
    if (!fields.nickname?.trim() || (kind === "create" ? !fields.title?.trim() : !validInvite(fields.invite ?? ""))) {
      setError("Adj meg egy nevet és érvényes kalandcímet vagy meghívókódot.");
      return;
    }
    pending.current = true;
    setError("");
    setBusy(true);
    try {
      const id = await openRoom(kind, fields);
      setRoom(id);
      const url = new URL(window.location.href);
      url.searchParams.delete("kaland");
      window.history.replaceState(null, "", url);
    } catch (failure) { setError(readableError(failure)); }
    finally { pending.current = false; setBusy(false); }
  }

  return <section className="online-panel">
    {!room && <header><p className="online-kicker">KÁOSZ SZEREPJÁTÉK</p><h2>Online kaland</h2>
      <p>Csatlakozz a csapathoz meghívóval, akár külön telefonról.</p></header>}
    {!client ? <p role="status">Az online módhoz a Supabase projektet még össze kell kapcsolni a kiadással.</p>
      : room && user ? <LiveRoom key={room} id={room} user={user} characters={characters} onBack={() => {
        setRoom(null);
        void listRooms().then(setRooms).catch(failure => setError(readableError(failure)));
      }} /> : <>
        {error && <p role="alert">{error}</p>}
        {user ? <Lobby rooms={rooms} busy={busy} onOpen={setRoom} onEnter={enter} />
          : !error && <p role="status">Kapcsolódás az online játékhoz…</p>}
      </>}
  </section>;
}
