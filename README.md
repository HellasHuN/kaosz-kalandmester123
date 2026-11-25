# Káosz szerepjáték – TESZT 1.0

## Helyi kipróbálás

Node.js 24 alatt futtasd az `npm ci`, majd az `npm run dev` parancsot. A terminál kiírja a helyi címet. A **Kaland kezdete** alatt választható játékos- és kalandmester mód. A mintahelyzetben Léna karakterlapja a kaland áttekintéséből nyitható meg.

A KM az **Üzenetek** oldalon küldhet üzenetet. A **Beállítások** alatt válts játékos módra, válaszd ki ugyanazt a karaktert, majd az **Üzenetek** oldalon válaszolj. A levelezés, a jegyzetek, a szegmenssáv, a saját lények és a térképjelölők az adott böngészőben maradnak. A helyi módok nem adnak szerveroldali hozzáférés-védelmet.

A **Beállítások** oldalon a karakterek JSON-fájlba menthetők és visszahozhatók. Importáláskor a már meglévő azonosítójú karakterek kimaradnak. Az export a karaktereket tartalmazza, a helyi kaland többi adatát külön tárolja a böngésző.

## Ellenőrzés és publikálás

Futtasd az `npm test`, `npm run lint` és `npm run build` parancsokat. A GitHub minden PR-nál ugyanezeket az ellenőrzéseket futtatja.

A GitHub Pages telepítéshez a repository **Settings → Pages → Build and deployment → Source** mezőjében válaszd a **GitHub Actions** lehetőséget. A telepítés a jóváhagyott változások `main` ágra kerülésekor indul. Szükség esetén az Actions felületen futtasd a **GitHub Pages test build** workflow-t a `main` ágról. A telepítési futás kiírja a tényleges HTTPS-címet.

## Szabályforrás és tesztkorlátok

Az Érzékelés faji értékei tesztelésre szánt háziszabály-javaslatok. Az elflista az alapkönyv 37. oldalán szereplő, természethez kapcsolódó jártasságokhoz ad szűkített kezdőválasztékot. Az Információgyűjtés háziszabály, az Álcázás Jp-költséggörbéjét használja.

A szegmenssáv az asztalnál kiszámított értékeket rendezi. A térkép a mintahelyzet saját tájait használja. A bestiárium jelenleg saját lényeket kezel.
