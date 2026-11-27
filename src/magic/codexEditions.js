const editions = {
  Gránit: {
    slug: "granit", motto: "Mélyföldi vésetek", glyph: "◆", ink: "#271710", paper: "#dbc29d", dark: "#251b17", light: "#f5bd82", accent: "#9b5935",
    motif: "M20 130 95 44l28 38 47-60 124 127-70-38-25 25-44-37-43 36-32-18z M92 51l19 37-28 17m87-77 22 66-35 5m78 5-13 29",
  },
  Alabástrom: {
    slug: "alabastrom", motto: "A szelek írása", glyph: "✧", ink: "#27384d", paper: "#e4e8e9", dark: "#26364b", light: "#dcf5ff", accent: "#7797ba",
    motif: "M21 116Q87 44 170 70t118-32M19 134q56-52 146-37t117-31M43 153q67-36 135-29t77-21M72 65q52-52 116-25",
  },
  Smaragd: {
    slug: "smaragd", motto: "Élő fonatok", glyph: "❧", ink: "#18301e", paper: "#d5dfaa", dark: "#102a1e", light: "#d7f29b", accent: "#4d9b58",
    motif: "M152 158Q138 104 172 30q2 45-30 68-28-44-74-51 14 47 73 62-44-19-84 14 39 21 87-7 14-43 70-57-6 46-62 66 44-7 84 18-36 25-81-8",
  },
  Fekete: {
    slug: "fekete", motto: "Obszidián és árnyék", glyph: "✶", ink: "#301f38", paper: "#e2cddf", dark: "#1d1027", light: "#ebbdff", accent: "#8d517f",
    motif: "M149 25c-54 0-82 35-79 71l25 19 9 37h90l9-37 26-19c3-36-25-71-80-71z M94 87q28-28 43 12-22 14-43-12zm110 0q-28-28-43 12 22 14 43-12z M140 119l10-19 10 19z M119 135v17m20-17v17m20-17v17m20-17v17",
  },
  Ezüst: {
    slug: "ezust", motto: "Az idő ezüstívei", glyph: "⌛", ink: "#262744", paper: "#d9def2", dark: "#171b38", light: "#f0ebff", accent: "#797ec6",
    motif: "M103 30h94m-94 125h94M114 30v18c0 23 20 31 36 44-16 13-36 21-36 44v19m72-125v18c0 23-20 31-36 44 16 13 36 21 36 44v19M121 141l29-31 29 31z M127 62h46",
  },
  Kígyókő: {
    slug: "kigyoko", motto: "Pikkely és holdfény", glyph: "☾", ink: "#23302f", paper: "#dae4ca", dark: "#12282b", light: "#cbffe0", accent: "#529d8a",
    motif: "M79 150q-35-53 35-54t91-29q15-27-32-29t-55 32q-15 29 44 39t54 41h-53m-22-116 15-19 22 21m-5 4 18-16 14 22",
  },
  Arany: {
    slug: "arany", motto: "Nappecsét és látás", glyph: "☉", ink: "#362410", paper: "#f1dcac", dark: "#312413", light: "#ffeea8", accent: "#bd8e3d",
    motif: "M50 97Q150 2 250 97 150 192 50 97z M150 59a38 38 0 1 0 0 76 38 38 0 1 0 0-76z M150 12v30m0 110v25M80 23l24 29m116-29-24 29M80 165l24-29m116 29-24-29",
  },
};

export const remainingCodexNames = Object.freeze(Object.keys(editions));

export function codexEdition(name) {
  return Object.hasOwn(editions, name) ? editions[name] : undefined;
}

// The formula ID rotates the inscription and seeds the starlight; the central
// engraving belongs to the edition and is ornamental, not a rule illustration.
export function editionArtwork(edition, id = "") {
  const seed = [...id].reduce((value, character) => Math.imul(value, 31) + character.codePointAt(0) >>> 0, 19);
  const stars = Array.from({ length: 42 }, (_, index) => {
    const value = Math.imul(seed + index * 17, 2654435761) >>> 0;
    return `<circle cx="${11 + value % 278}" cy="${8 + (value >>> 10) % 164}" r="${index % 5 === 0 ? 1.3 : .55}"/>`;
  }).join("");
  const engraving = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 180">
    <defs>
      <radialGradient id="halo"><stop stop-color="${edition.accent}"/><stop offset="1" stop-color="${edition.dark}"/></radialGradient>
      <filter id="glow"><feGaussianBlur stdDeviation="3"/></filter>
      <pattern id="weave" width="12" height="12" patternUnits="userSpaceOnUse"><path d="m0 6 6-6 6 6-6 6z" fill="none" stroke="${edition.light}" stroke-opacity=".12"/></pattern>
    </defs>
    <path d="M0 0h300v180H0z" fill="url(#halo)"/><path d="M0 0h300v180H0z" fill="url(#weave)"/>
    <g fill="${edition.light}" opacity=".72">${stars}</g>
    <g fill="none" stroke="${edition.light}">
      <path d="M23 7h254l16 16v134l-16 16H23L7 157V23zM26 12h248l14 14v128l-14 14H26l-14-14V26z" opacity=".8"/>
      <ellipse cx="150" cy="90" rx="102" ry="72" stroke-dasharray="1 5" transform="rotate(${seed % 30 - 15} 150 90)"/>
      <ellipse cx="150" cy="90" rx="116" ry="64" opacity=".4"/>
      <path d="${edition.motif}" stroke-width="8" opacity=".65" filter="url(#glow)"/>
      <path d="${edition.motif}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
    </g></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(engraving)}`;
}

export function editionColors(edition) {
  return Object.fromEntries(["ink", "paper", "dark", "light", "accent"].map(key => [`--edition-${key}`, edition[key]]));
}
