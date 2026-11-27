# KÁOSZ TESZT · integrációs leltár

A felülvizsgálat kiindulópontja a #8-ban megadott `80fb61d2d7eae4262969b8c55bdd726ac3327ba6` commit. A GitHub #1–#7 pull requestjeinek forráscommitjai és az összes fejlesztési, integrációs és auditág benne vannak a tesztág történetében. A `gh-pages` ágon külön buildtörténet van. A visszaállítási címke `backup/kaosz-egyesitett-teszt-before-issue-8`.

| Terület | Integrált funkciók |
| --- | --- |
| Főmenü | Karakterkeresés, előnézet, új és mentett karakterek, játék indítása, kódex, értesítések, chat, KM és beállítások. |
| Karakteralkotás | Általános adatok, faj és alfaj illusztrációja, félvér származás és öröklés, főértékek, képzési csomagok, jártasságok, felszerelés, mágia és mentés. |
| Általános karakterlap | Főértékek, portré, erőforrások, életerő, profil és KM-szerkesztés. |
| Jártasságok | Keresés, rangok, Jp, előfeltételek, jóváhagyás és megőrzött korábbi költségek. |
| Felszerelés | Tárgyak, mennyiség, páncél és zónák, jegyzetek, módosítás és mentés. |
| Mágia | Akadémikus és praktikus nézet, valamint jártassághoz kötött nézetek. Kódexfüggetlen, Skarlát, Azúr, Gránit, Alabástrom, Smaragd, Fekete, Ezüst, Kígyókő és Arany. Kereshető Összesített kódex az elsajátított akadémikus formulákkal és külön Mágiaelőzmények. |
| Játék, kaland és KM | Aktív karakterlap, helyi üzenetek, harci szegmensek, minta-világtérkép, bestiárium, generátor, titkos próbák, felülbírálások és jegyzetek. |
| Mentés és navigáció | Helyi karaktermentések, JSON import és export, fülek közötti váltás. A Beállítások felső sávjából a „Vissza” az előző fülre visz. A „Vissza a főmenübe” megerősítést kér. |

## Egyeztetett szabályok

- Szakosodástól függetlenül az összes Kódexfüggetlen formula külön kódexengedély nélkül hozzáférhető. Az elsajátítás és a varázslás feltételei érvényesek.
- A KM jártasság nélkül is megadhatja a formulát. A varázsláshoz a szükséges jártasság és a formula feltételei kellenek.
- A KM eltérhet a játékosi korlátoktól az életkor, a főértékek, az erőforrások, a felszerelésértékek és a jártasságszintek szerkesztésekor. A napló az indoklást, a módosított mezőt, az előző és az új értéket, valamint a mentés idejét őrzi.
- A jártasságnál a mentett képzés az alapértelmezett. Az előfeltételek teljesülése és elegendő Jp esetén azonnali TESZT-jóváhagyás is kérhető.
- Kézzel elbírált siker külön dobás és Fp-megerősítés nélkül naplózható. A rögzített kézi és digitális dobás útvonalán az adott formula elszámolási feltételei érvényesek.

## Nyitott területek

A korábbi [TESZT 1.0 ellenőrzési leltárban](TESZT-1.0-ellenorzes.md) dokumentált könyvi teljességi hiányok közé tartozik a teljes faji és öröklési audit, a speciális mágiahatások és következmények automatizálása, valamint a teljes könyvi térkép és bestiárium. A térkép és a szerepkörök a helyi tesztkiadás részei. A Chromium mobilnézetben futó böngészőtesztek mellett a fizikai Android és iPhone Safari ellenőrzése külön feladat.
