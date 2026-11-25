# Káosz szerepjáték – TESZT 1.0

## Helyi kipróbálás

Node.js 24 alatt futtasd az `npm ci`, majd az `npm run dev` parancsot. A terminál kiírja a helyi címet. A **Kaland kezdete** alatt választható játékos- és kalandmester mód. A mintahelyzetben Léna karakterlapja a kaland áttekintéséből nyitható meg.

A KM az **Üzenetek** oldalon küldhet üzenetet. A **Beállítások** alatt válts játékos módra, válaszd ki ugyanazt a karaktert, majd az **Üzenetek** oldalon válaszolj. A levelezés, a jegyzetek, a szegmenssáv, a saját lények és a térképjelölők az adott böngészőben maradnak. A helyi módok nem adnak szerveroldali hozzáférés-védelmet.

A **Beállítások** oldalon a karakterek JSON-fájlba menthetők és visszahozhatók. Importáláskor a már meglévő azonosítójú karakterek kimaradnak. Az export a karaktereket tartalmazza, a helyi kaland többi adatát külön tárolja a böngésző.

## Ellenőrzés és publikálás

Futtasd az `npm test`, `npm run lint` és `npm run build` parancsokat. A GitHub minden PR-nál ugyanezeket az ellenőrzéseket futtatja.

A GitHub Pages telepítéshez a repository **Settings → Pages → Build and deployment → Source** mezőjében válaszd a **GitHub Actions** lehetőséget. A telepítés a jóváhagyott változások `main` ágra kerülésekor indul. Szükség esetén az Actions felületen futtasd a **GitHub Pages test build** workflow-t a `main` ágról. A telepítési futás kiírja a tényleges HTTPS-címet.

Az egyesítés előtti, kézzel aktiválható tesztbuild a `gh-pages` ágra kerül. A **Settings → Pages → Build and deployment → Source** részen válaszd a **Deploy from a branch** opciót, majd **Branch → gh-pages → /(root) → Save**. A Pages oldalon megjelenő **Visit site** hivatkozás nyitja meg az elkészült publikus telepítést. Ha később a `main`-ről telepítő workflow-t használod, állítsd vissza a forrást **GitHub Actions** értékre.

## Szabályforrás és tesztkorlátok

Az Érzékelés faji értékei tesztelésre szánt háziszabály-javaslatok. Az elflista az alapkönyv 37. oldalán szereplő, természethez kapcsolódó jártasságokhoz ad szűkített kezdőválasztékot. Az Információgyűjtés háziszabály, az Álcázás Jp-költséggörbéjét használja.

A szegmenssáv kézi szegmenst vagy a könyv szerinti folyamatos kezdeményezést fogadja (140. és 143–144. o.). A KM adja meg a cselekvési időt és a korábbi összesített időt, majd kézzel beírhatja az 1k6 eredményét vagy dobhat digitálisan. A titkos próbák a Zafír-táblát és a főértékpróbák szabályát használják (135–136. o.). Az Információgyűjtés két Zafír-próbás ellenpróbája TESZT háziszabály. Azonos kimenetelnél a KM dönt.

Az akadémikus Mágiaelmélet a korábbi kódexértékek közül a legmagasabbat is figyelembe veszi, a mentett jártasságok és Jp-költségek megmaradnak. A szakosodás és a birtokolt mondóka-pergamen TESZT háziszabály. A Vakharc fegyveres támadó- és védőszintet korlátozó szabálya könyvi (107. o.), az Érzékszerv/Intuíció szerinti képzési költség TESZT háziszabály. Az általános felülbírálási napló a KM döntését dokumentálja, a szabálymodulok saját szerkesztői érvényesítik a támogatott kivételeket. A térkép a mintahelyzet saját tájait használja. A bestiárium jelenleg saját lényeket kezel.

## A TESZT 1.0 tárolása

A játékos- és kalandmester mód ugyanabban a böngészőben próbálható ki. A statikus kiadás fiók és háttérszolgáltatás nélkül működik. A karakterek átvitelére a Beállítások JSON-exportja és -importja használható.
