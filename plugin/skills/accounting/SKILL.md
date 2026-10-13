---
name: accounting
description: Účetnictví a výkazy z Notia Business Serveru (NBS). Použij, když se uživatel ptá na výsledovku (P&L), hospodářský výsledek, EBIT, plnění rozpočtu, celkové náklady a výnosy, aktiva a pasiva, účetní transakce a uzamčení období, nebo na číselníky útvarů, výkonů, účetních zakázek a provozoven, a je připojený konektor Notia Business Server.
---

# Účetnictví a výkazy v NBS

## Společná pravidla

- Konektor čte data z NBS jen pro čtení a s oprávněními přihlášeného uživatele.
- Když konektor některý nástroj nenabízí, firma ho nemá zpřístupněný. Řekni to a data neodhaduj.
- Každý seznam (`*_query`, ale i reporty a podseznamy) vrací `{ rows, total, truncated }`: `rows` jsou vrácené řádky, `total` počet všech záznamů a `truncated: true` znamená, že se všechny nevešly a výsledek je neúplný. Seznamy se stránkováním vrací ve výchozím stavu 50 řádků, další stránku dostaneš přes `offset`.
- Široké seznamy (doklady, produkty, firmy, sklady) nech na výchozím `limit` 50 a nejvýš 100, jinak výsledek přeroste limit velikosti. `limit` 200 posílej jen u krátkých číselníků, u kterých to skill výslovně uvádí.
- Když čekáš hodně záznamů, nejdřív zjisti `total` (stačí `limit` 1). Do konverzace nenačítej víc než pár stránek. Když by odpověď potřebovala víc, zuž dotaz, nebo uživateli řekni, kolik záznamů z `total` jsi prošel.
- Data chodí jako čas v UTC: `2026-03-31T22:00:00.000Z` je 1. 4. 2026 v Česku. Před porovnáním s obdobím je převeď na český čas.
- Relativní období („minulý měsíc“, „letos“, „Q1“) převeď na konkrétní data podle dnešního dne a v odpovědi je uveď.

## Který nástroj kdy

| Otázka | Nástroj |
|---|---|
| Výsledovka, EBIT, srovnání s rozpočtem a loňskem | `report_pl_how` |
| Celkové náklady, výnosy, aktiva a pasiva | `balance_sheet_totals`, spočítané roky `balance_sheet_years` |
| Útvary, výkony, účetní zakázky, provozovny | `shapes_query`, `actions_query`, `orders_codebook_query`, `stores_list` |
| Kód partnera v účetnictví | `accounting_partner_search` |
| Účetní transakce a uzamčení | `journal_entries_query` |
| Účetní doklady za rok | `accounting_documents_query` s `rok` |
| Položky dokladu (částky, účty MD a Dal) | `accounting_document_detail` s `id` dokladu |

## Výsledovka (`report_pl_how`)

- Pošli oba parametry: `limitDate` ve tvaru `YYYY-MM-DD` (rozhoduje jen rok a měsíc) a `interval` 0 pro samotný měsíc, nebo 1 pro období od ledna do daného měsíce.
- Vrací `{ data }` s 11 řádky v pevném pořadí: Čistý obrat, COGS, VLC+FLC, MACO, Gross Margin, BTL, Marketing ostatní, Marketing celkem, Sales OHD, HQ, EBIT.
- Každý řádek má `actual` (skutečnost), `budget` (rozpočet) a `last_year` (stejné období loni). `yoy` a `act_bdg` jsou rozdíly. `yoy_proc` a `act_bdg_proc` jsou indexy zaokrouhlené na dvě desetinná místa, kde 100 znamená beze změny: růst proti loňsku je `yoy_proc` − 100, plnění rozpočtu je `act_bdg_proc` %. Když je loňská hodnota nebo rozpočet 0, vrací 0, což neznamená pokles o 100 %. Ostatní přehledy vrací změny v jiném tvaru, srovnání je v skillu `sales-analysis`.
- Řádek Gross Margin je v procentech (MACO / Čistý obrat), ne v penězích.
- Výsledovka se nastavuje pro každou firmu zvlášť. Když ji firma nemá, vrátí nástroj „Požadovaná data v NBS neexistují“. Pak to řekni a použij `balance_sheet_totals`.
- Plnění rozpočtu uváděj jako procento rozpočtu.

## Náklady, výnosy, aktiva a pasiva (`balance_sheet_totals`)

- Pro hlavní knihu pošli jen `roks` jako jeden rok. `idUks` je pracovní kniha z `balance_sheet_books` a s `roks` se neposílá, Hub by ho ignoroval.
- Období pošli jako `obdobiOd` a `obdobiDo` ve tvaru `YYYYMM`, například `202601` a `202609`. Pošli buď obě, nebo žádné. Bez období dostaneš celý rok.
- Součty jsou předpočítané a NBS je přepočítává ručně. Rok, který chybí v `balance_sheet_years`, vrátí samé nuly: řekni uživateli, že účetnictví za ten rok není v NBS přepočítané, ne že je nulové.
- Vrací `{ aktiva, pasiva, naklady, vynosy }`. Hospodářský výsledek za období je `vynosy` − `naklady`.
- Náklady a výnosy jsou obraty za zadané období. Aktiva a pasiva jsou zůstatek ke konci období jen tehdy, když období začíná lednem.
- Pasiva už obsahují výsledek běžného roku, aby rozvaha byla vyrovnaná.
- Do jednoho volání dávej jen jeden rok. Protože se součty přepočítávají ručně, nemusí obsahovat poslední zaúčtování.

## Číselníky

- `shapes_query` (útvary), `actions_query` (výkony) a `orders_codebook_query` (účetní zakázky) jsou krátké seznamy bez hledání. Načti je s `limit` 200. Pole: `kod`, `nazev`, `popis`, nadřízený `matka`, `aktivni`.
- Účetní zakázky mají navíc plán `vynosy_plan`, `naklady_plan`, `realizace_plan` a vedoucího `vedouci`. Nejsou to smlouvy se zákazníky (ty jsou v skillu `contracts`).
- `stores_list` vrací provozovny `{ id, name }` v `rows`.

## Ostatní nástroje

- `accounting_partner_search` hledá podle části názvu (aspoň 2 znaky) a v `rows` vrací `{ partner, nazev }`, 30 výsledků na stránku. Další stránka je `offset` 30, 60 a tak dál.
- `journal_entries_query` vrací účetní transakce, tedy dávky dokladů: `nazev`, `popis`, datum založení `datum`, `uzavreno` a `uctovat_od`. Zápisy s datem do `uctovat_od` jsou uzamčené. Částky ani účty neobsahuje. Jeho `id` je ID transakce, ne dokladu.

## Účetní doklady

- `accounting_documents_query` s `rok` vrací doklady účetního roku: `id`, číslo `dokl_kod`, `dokl_cis` a `dokl_rok`, typ `dokl_typ`, `datum`, `obdobi`, `plneni`, `splatnost`, `stav`, `storno`, `kontrola`, `poznamka` a číslo dokladu od dodavatele `ev_cislo_dd`.
- `accounting_document_detail` s `id` dokladu vrací hlavičku a položky `items`: číslo položky `cislo`, částku `castka` v Kč (`castka_mena` v měně `mena`), účet MD (`us_md`, `ua_md`) a Dal (`us_dal`, `ua_dal`) a partnery `partner_md_nazev`, `partner_dal_nazev`. Hlavička má navíc `pocet_radku`, `soucet_castek` a `radky_s_chybou`.
- `journal_entry_item_detail` vrací všechna pole jedné položky. Bere `id` dokladu a `cislo` položky z detailu dokladu. Obvykle stačí položky z `accounting_document_detail`.

## Co konektor neumí

- Obraty a zůstatky jednotlivých účtů ani hlavní knihu po účtech konektor nevrací. Účetní zápisy jdou číst jen po dokladech a sčítat z nich obrat účtu za delší období nejde. Řekni to a odkaž uživatele do NBS.
- `balance_sheet_transaction_search` slouží k výběru transakcí při nastavení pracovní knihy. Částky nevrací, pro účetní dotazy ho nepoužívej.

## Prezentace

- Začni dvěma až třemi větami s hlavním zjištěním, potom ukaž tabulku. Delší seznamy zkrať na nejvýznamnějších zhruba 15 řádků a zbytek sečti jako „ostatní“.
- Částky piš česky: mezera jako oddělovač tisíců, desetinná čárka, měna za číslem. Data piš jako 1. 4. 2026.
- Procenta zaokrouhli na jedno desetinné místo, pokud uživatel nechce jinou přesnost. Přesnost nikdy nezvyšuj nad to, co zdroj vrací, a když uživatel chce víc, řekni mu to. Změny mezi obdobími piš jako růst v procentech se znaménkem, například +12,0 % nebo −3,5 %.
- Částky v různých měnách nesčítej. Pro souhrn použij pole v Kč, pokud ho zdroj má, a řekni to.
- Když jsi prošel jen část seznamu, řekni, kolik záznamů z `total` výsledek zahrnuje.
- Uveď zdroj a období, aby si uživatel mohl výsledek ověřit v NBS.
- Surový JSON do odpovědi nevkládej.

## Chyby

- „Platnost přihlášení do NBS vypršela“: požádej uživatele, ať konektor Notia Business Server znovu připojí v nastavení konektorů.
- „Správce vaší firmy integraci NBS s Claude vypnul“ nebo „Nemáte v NBS oprávnění používat Claude“: řekni uživateli, že integraci musí zapnout nebo oprávnění přidělit správce NBS v jeho firmě a potom je potřeba konektor znovu připojit. Další nástroje nezkoušej.
- „K těmto datům nemáte v NBS oprávnění“: řekni to uživateli a nezkoušej data získat jiným nástrojem.
- „Neplatné argumenty“ nebo „NBS odmítl parametry dotazu“: oprav parametry podle schématu nástroje a této příručky (formát data, typ hodnoty, číselné `id` místo kódu) a zkus to jednou znovu. Když to znovu selže, řekni uživateli, co se nepodařilo.
- „Požadovaná data v NBS neexistují“ nebo prázdný detail (`""`, `null`, `{}`): ověř, že `id` pochází ze správného seznamu. Když ano, řekni, že záznam v NBS není.
- „Výsledek je příliš velký“ nebo `truncated: true` u seznamu, který potřebuješ celý: sniž `limit` na polovinu, případně zuž období nebo filtry.
- „Příliš mnoho požadavků“: konektor má limit počtu dotazů za minutu na uživatele. Chvíli počkej, další nástroje volej postupně, ne v dávce, a zbytečně neopakuj stejné dotazy.
- „NBS neodpověděl v časovém limitu“: zuž dotaz (menší `limit`, kratší období) a zkus to jednou znovu.
- „NBS API vrátilo chybu“: stejný dotaz neopakuj. Když pro otázku existuje jiný zdroj z tabulky „Který nástroj kdy“, zkus ho, jinak řekni uživateli, co se nepodařilo.
- „Systém NBS je momentálně nedostupný“, „NBS je momentálně přetížený“ nebo „Komunikace s NBS selhala“: řekni to uživateli a nabídni zopakování později.
- „Neznámý nástroj“ nebo „Tento nástroj NBS Hub nezná“: firma nástroj nemá zpřístupněný, postupuj jako u chybějícího nástroje.
- Po žádné chybě data neodhaduj. Chybové odpovědi obsahují „ID požadavku“, při hlášení problému ho uživatel předá podpoře Notia.
