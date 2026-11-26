# Káosz szerepjáték · TESZT 1.0 ellenőrzés

A vizsgálat alapja a teljes eredeti megbízás, a pontosított kiadási követelmények, a #2-es PR, a forráskód és az automatizált tesztek. A „kész” az adott implementált működésre vonatkozik. A könyvi megfelelés külön ellenőrzést igényel, ahol nincs ellenőrzött forrás.

| Követelmény | Állapot | Bizonyíték vagy hiány |
| --- | --- | --- |
| Öt főérték, 270 pont, aktív/passzív értékek, faji korlátok, életkor, Jp | Részben megvalósított | A pontkeret, életkori határ és Jp számítás tesztelt. A faji Érzékelés táblája TESZT-javaslat. |
| 16 faj és alfajok, faji képességek és torzulások | Részben megvalósított | Az adatvezérelt választók és korlátozások léteznek. Minden adat könyvi hitelesítése nyitott. |
| Félvér szülők, M-jelzés, KM-jóváhagyás, nagyszülők és öröklés | Részben megvalósított | A származási és öröklési modul használatban van. A teljes keresztezési mátrix és a generációs hatások független ellenőrzése hiányzik. |
| Juvenile/adultus, senius, gennymanó Éjszaka és Anyanyelvismeret | Részben megvalósított | A korhatárok és a senius főértékmódosítása tesztelt. Az összes faji jártasságkombináció végigpróbálása hiányzik. |
| 12 képzési csomag, költségek, kiosztás | Kész | Paraméterezett tesztek a jóváhagyásra, terhelésre, kiosztásra és a csomagok ütközéseire. |
| Gilf Mágiaelmélet, faji jártasságok | Kész a tesztelt esetekben | A hozzáférés, kezdési korlát és a szabad mágia kapcsolata regressziós teszttel védett. |
| Fegyverforgatás, hajítás, pajzs, Jp | Részben megvalósított | Támadó és védő fegyveres rang, rokon fegyver és szakosodás tesztelt. A hajítás és pajzs összes könyvi kombinációja nyitott. |
| Elhivatottság, vallás, Jp, korábbi előnyök és hátrányok | Részben megvalósított | Az Elhivatottság KM-jóváhagyása, megszerzett rangok megőrzése és Jp változatlansága tesztelt. Az előnyök/hátrányok teljes táblázati auditja nyitott. |
| Négy karakterlapfül, szerkesztés, mentés, kétlépcsős törlés, JSON és régi mentések | Részben megvalósított | Négy fül, kétlépcsős törlési útvonal, sérült és régi mentések, JSON import/export. A törlés mindkét lépése, a két megszakítási út és a végleges törlés Chromiumban ellenőrzött. |
| Általános akadémikus elmélet, opcionális szakosodás, KM-kivétel | Kész a tesztelt TESZT-szabályokra | A régi rangok megmaradnak, a szakterületi előny és az egyedi engedély tesztelt. |
| Akadémikus, szakrális, praktikus, vad és szabad mágia; mondókák és pergamenek | Részben megvalósított | Jogosultság, katalógus, szerepkör és birtokolt pergamen támogatott. Az egyedi minták és szabálykivételek teljes könyvi auditja nyitott. |
| Változó paraméterek, kézi és digitális dobás, siker és kudarc következményei | Részben megvalósított | Egy szerkeszthető akadémikus varázslat végigpróbálható. Az akadémikus kudarc és a katasztrofális rontás következményét és Ep-veszteségét a KM rögzítheti. Az általános könyvi automatizálás nyitott. |
| Ep-foglalás, egyszeri levonás, feloldás, visszavonás, napló | Kész a tesztelt útvonalakon | Az egymástól elkülönülő foglalások, ismeretlen régi költség, KM-jóváhagyás, akadémikus és szakrális elszámolás tesztelt. |
| Titkos főérték- és Zafír-próba, Információgyűjtés–Álcázás | Kész a támogatott próbákra | A KM-próbafelület, Zafír-tábla és TESZT-ellenpróba elérhető. |
| Vakharc, harci értékek, kezdeményezés és szegmens | Részben megvalósított | A Vakharc korlát és a szegmenssorrend tesztelt. A cselekvési időt a KM adja meg. |
| Egyéni és csoportos NPC, szerkesztés és mentés | Kész | Külön KM-oldal, szerkeszthető tervezet, bestiáriumi mentés. A generált számok KM által véglegesítendő vázlatértékek. |
| KM-jegyzet, helyi címzett üzenete, olvasatlan jelzés, gyorsüzenet | Kész | Helyi tárolás és karakterenkénti beszélgetés, valamint szerkesztőbe beszúrt KM-sablon. |
| Tényleges, naplózott és visszavonható KM-felülbírálás | Részben megvalósított | A titkos főértékpróba naplózott, karakterhez kötött célértéke érvényesül és visszavonható. Egyéb döntéseknél az érintett modul saját engedélyét kell használni. |
| Strukturált bestiárium, keresés, szerkesztés, generátor | Részben megvalósított | A saját szócikkek és a generátor együtt működnek. |
| Jogszerű könyvi bestiárium és földrajz | Nem ellenőrizhető | A munkapéldányhoz nincs engedélyezett, oldalszinten hivatkozható teljes lény- és térképforrás. |
| Térkép, nagyítás, rétegek, keresés, saját pontok, érintés | Részben megvalósított | A jelölt mintatérkép görgethető, nagyítható, kereshető. A könyvi határok és kereskedelmi útvonalak hiányoznak. |
| Fantasy főmenü, négyoldalas karakterlap, varázskönyv, KM-felület | Kész az alapfelületekre | Egységes arculat, saját illusztrációk, mágiaformánkénti ikonok és színek. Beállításokon keresztüli megerősített visszatérés. |
| Fajonként és alfajonként egyedi önálló illusztráció, bestiáriumi képek | Részben megvalósított | Az atlasz és faj-/alfajtéma működik. Az összes kívánt külön illusztráció és a lényenkénti illusztráció hiányzik. |
| Statikus csomag, két helyi szerepkör, fiók nélkül | Kész | A szerveres kód elkülönítve maradt. A teszt szerepkörei egy helyi böngésző adatain osztoznak. |
| Mobil és asztali ellenőrzés | Részben megvalósított | Chromium 1440×1000, 390×844 és 320×700 méretben. Fizikai Android és iPhone Safari ellenőrzése nyitott. |
| Friss GitHub Pages kiadás, nyilvános HTTPS és commit igazolása | Ellenőrzésre vár | A kiadás csak tényleges HTTPS-válasz és böngészős ellenőrzés után tekinthető igazoltnak. |
