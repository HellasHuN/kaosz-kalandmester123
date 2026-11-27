import { editionColors } from "./codexEditions.js";
import { getCodexIcon } from "../codexIcons.js";
import "./codex-editions.css";
import { BookOpen, Compass, Droplet, Flame } from "lucide-react";
import { useRef, useState } from "react";
import book from "./independent-assets/open-grimoire.webp";
import "./independent-codex.css";
import "./scarlet-codex.css";
import "./azure-codex.css";

function CastingRecord({ record, onAdjudicate }) {
  const [error, setError] = useState(false);
  const pending = record.status === "pending";
  return <li>
    <strong>{record.spellName}</strong> · {record.outcome}
    {record.status && <> · {record.roll} / {record.target} ·{" "}
      <time dateTime={record.recordedAt}>{new Date(record.recordedAt).toLocaleString("hu-HU")}</time></>}
    {pending ? <> · <strong>KM elbírálására vár</strong></>
      : <> · {record.status === "adjudicated" && "KM elbírálta · "}{record.previousEp - record.remainingEp} Ep</>}
    {record.consequence && <p>{record.consequence}</p>}
    {pending && onAdjudicate && <form className="codex-neutral-adjudication" aria-label={`Dobás elbírálása: ${record.roll} / ${record.target}`}
      onSubmit={event => {
        event.preventDefault();
        const fields = new FormData(event.currentTarget);
        setError(!onAdjudicate(record.id, Number(fields.get("loss")), fields.get("consequence")));
      }}>
      <label>KM által megállapított Ep-veszteség <input name="loss" type="number" min="0" step="any" required /></label>
      <label>A kudarc következménye <textarea name="consequence" maxLength={1000} required /></label>
      <button type="submit">Elbírálás rögzítése</button>
      {error && <p role="alert">Ellenőrizd a szabad Ep-keretet és a megadott következményt.</p>}
    </form>}
  </li>;
}

export function IndependentCodex({ scarlet = false, azure = false, edition, editionName, catalog, costLabel, activeEp, availableEp, release, known, log, onAdjudicate, page, onPage, selected, onSelect, rows, artwork, filters, children }) {
  const heading = useRef(null);
  const themed = scarlet || azure || Boolean(edition);
  const title = edition ? `${editionName} Kódex` : azure ? "Azúr Kódex" : scarlet ? "Skarlát Kódex" : "Kódexfüggetlen";
  const Icon = edition ? getCodexIcon(editionName) : azure ? Droplet : scarlet ? Flame : Compass;
  const featuredId = azure ? "official:esoidezes" : "official:tuzgyuru";
  const featured = edition ? known[0] ?? catalog[0] : themed && (known.find(({ spell }) => spell.id === featuredId) ??
    (azure ? catalog.find(({ spell }) => spell.id === featuredId) : known[0] ?? catalog.find(({ spell }) => spell.id === featuredId)));
  const logHeading = useRef(null);
  function open(next) {
    onPage(next);
    heading.current?.scrollIntoView({ block: "nearest" });
  }
  const row = ({ spell, access }) => <li key={spell.id}>
    <button type="button" aria-label={`${spell.name} kiválasztása`} onClick={() => { onSelect(spell.id); open("detail"); }}>
      <img src={artwork(spell)} alt="" width="96" height="70" loading="lazy" />
      <span><strong>{spell.name}</strong><small>{spell.type}</small>{themed && <small className="scarlet-list-cost">{costLabel(spell.ep)}</small>}</span>
      <small className="codex-neutral-status" data-known={access.recorded}>{access.recorded ? "Ismert" : "Még nincs megszerezve"}</small>
    </button>
  </li>;
  return <section className={`codex-neutral${edition ? ` codex-edition edition-${edition.slug}` : azure ? " azure-codex" : scarlet ? " scarlet-codex" : ""}`} aria-labelledby="academic-magic-heading" style={edition ? editionColors(edition) : undefined}>
    <header className="codex-neutral-hero" ref={heading}>
      <Icon aria-hidden="true" />{themed && <span className="scarlet-eyebrow">{edition?.motto ?? "Akadémikus mágia"}</span>}<h3 id="academic-magic-heading">{title}</h3>
    </header>
    <nav aria-label={`${title} oldalak`} className="codex-neutral-tabs">
      {[
        ["home", "Áttekintés"], ["list", "Varázslatok"], ["book", "Varázskönyv"],
      ].map(([id, label]) => <button key={id} type="button" aria-current={page === id || (page === "detail" && id === "list") ? "page" : undefined} onClick={() => open(id)}>{label}</button>)}
    </nav>
    <dl className="codex-neutral-resources">
      <div><dt>Aktív Ep</dt><dd>{activeEp ?? "—"}</dd></div>
      <div><dt>Elérhető Ep</dt><dd>{availableEp ?? "—"}</dd></div>
      <div><dt>Felszabadítható Ep</dt><dd>{release}</dd></div>
    </dl>
    {page === "home" && themed && <>
      {edition && <p className="edition-counter">{edition.glyph} {known.length} ismert formula / {catalog.length}</p>}
      {featured && <section className="codex-neutral-paper scarlet-feature">
        <h4>{featured.spell.name}</h4>
        <img src={artwork(featured.spell)} width="480" height="270" alt="" />
        <p>{featured.access.recorded ? "Ismert formula" : featured.spell.type} · {costLabel(featured.spell.ep)}</p>
        <button type="button" onClick={() => { onSelect(featured.spell.id); open("detail"); }}>Adatlap</button>
      </section>}
      <section className="codex-neutral-paper scarlet-quick">
        <h4>Varázslatok</h4>
        <ul className="codex-neutral-index">{(edition ? catalog.filter(entry => entry !== featured).slice(0, 3) :
          (azure ? ["vizteremtes", "vizaura", "jegnyil"] : ["langhivas", "langpajzs", "tuzgolyo"]).map(id =>
            catalog.find(({ spell }) => spell.id === `official:${id}`)).filter(Boolean)).map(row)}</ul>
        <div className="scarlet-home-actions">
          <button type="button" onClick={() => open("list")}>Teljes varázslatlista</button>
          <button type="button" onClick={() => open("book")}>Varázskönyv megnyitása</button>
          {edition && <button type="button" onClick={() => {
            open("book");
            requestAnimationFrame(() => logHeading.current?.focus());
          }}>Varázslási napló megnyitása</button>}
        </div>
      </section>
    </>}
    {page === "home" && !themed && <div className="codex-neutral-spread">
      <section className="codex-neutral-paper">
        <h4>Varázslatok</h4>
        <ul className="codex-neutral-index">{(known.length ? known : rows).slice(0, 3).map(row)}</ul>
        <button type="button" onClick={() => open("list")}>Teljes varázslatlista</button>
      </section>
      <section className="codex-neutral-paper">
        <h4><BookOpen aria-hidden="true" /> Varázskönyv</h4>
        <img className="codex-neutral-book" src={book} alt="Ezüstibolya jelekkel rajzolt, nyitott varázskönyv" />
        <button type="button" onClick={() => open("book")}>Varázskönyv megnyitása · {known.length} ismert formula</button>
      </section>
    </div>}
    {page === "list" && <section className="codex-neutral-paper">
      <h4>Varázslatlista</h4>
      {filters}
      {themed && <p role="status">{rows.length} formula</p>}
      {rows.length ? <ul className="codex-neutral-index">{rows.map(row)}</ul> : <p>Nincs megjeleníthető találat.</p>}
    </section>}
    {page === "detail" && selected && <section className="codex-neutral-paper codex-neutral-detail">
      <h4>Varázslat adatlapja</h4>
      <header><img src={artwork(selected.spell)} alt="" width="480" height="270" /><h3>{selected.spell.name}</h3></header>
      {children}
      <button type="button" onClick={() => open("list")}>Vissza a varázslatlistához</button>
    </section>}
    {page === "book" && <section className="codex-neutral-paper">
      <h4>Ismert formulák</h4>
      {known.length ? <ul className="codex-neutral-index">{known.map(row)}</ul> : <p>A varázskönyvben még nincs ismert {title} formula.</p>}
      <h4 ref={logHeading} tabIndex={edition ? -1 : undefined}>Varázslási napló</h4>
      {log.length ? <ol>{log.slice().reverse().map(record => <CastingRecord key={record.id} record={record} onAdjudicate={onAdjudicate} />)}</ol>
        : <p>Még nincs rögzített {title} varázslás.</p>}
    </section>}
  </section>;
}
