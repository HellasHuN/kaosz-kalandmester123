import { useRef, useState } from "react";

export default function TestSettings({ mode, onMode, onHome, onExport, onImport }) {
  const fileInput = useRef(null);
  const [message, setMessage] = useState("");

  async function importFile(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setMessage("Legfeljebb 5 MB méretű karaktermentés tölthető be.");
      return;
    }
    try {
      setMessage(onImport(await file.text()));
    } catch {
      setMessage("A fájl nem olvasható.");
    }
  }

  return <section className="test-panel">
    <h2>Beállítások</h2>
    <p>A tesztadatok ebben a böngészőben maradnak. Más eszközökön külön mentés szükséges.</p>
    <div className="test-actions">
      {mode && <button type="button" onClick={() => onMode(mode === "km" ? "player" : "km")}>
        Váltás {mode === "km" ? "játékos" : "kalandmester"} módra
      </button>}
      <button type="button" onClick={onHome}>Vissza a főmenübe</button>
      <button type="button" onClick={onExport}>Karakterek exportálása (JSON)</button>
      <button type="button" onClick={() => fileInput.current.click()}>Karakterek importálása (JSON)</button>
      <input ref={fileInput} type="file" accept=".json,application/json" hidden onChange={importFile} />
    </div>
    {message && <p role="status">{message}</p>}
  </section>;
}
