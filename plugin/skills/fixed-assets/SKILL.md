---
name: fixed-assets
description: Dlouhodobý majetek z Notia Business Serveru (NBS). Použij, když se uživatel ptá na evidenci majetku, pořizovací a zůstatkovou cenu, účetní nebo daňové odpisy, kolik zbývá odepsat, technické zhodnocení, umístění majetku nebo jeho vyřazení, a je připojený konektor Notia Business Server.
---

# Dlouhodobý majetek v NBS

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
| Seznam majetku a jeho hodnoty | `fixed_assets_query` |
| Aktuální hodnoty jedné karty | `fixed_asset_detail` |
| Účetní odpisy po obdobích | `fixed_asset_accounting_depreciation` |
| Daňové odpisy po letech | `fixed_asset_tax_depreciation` |
| Z čeho se skládá pořizovací cena | `fixed_asset_cost_components` |
| Vyřazení z evidence | `fixed_asset_disposals` a `fixed_asset_detail` |

Všechny nástroje pro jednu kartu berou číselné `id` z `fixed_assets_query`. `fixed_assets_query` hledání nemá, kartu podle názvu nebo inventárního čísla proto najdeš procházením stránek. Seznam je seřazený od naposledy založených.

## Pole majetku

- Inventární číslo je `kod` + `cislo`, dále `nazev`, `skupina`, `podskupina`.
- Stav `stav`: 0 Nový, 1 V používání, 2 Vyřazený. Datum uvedení do užívání `uvedeni`, vyřazení `vyrazeni`.
- Účetní hodnoty mají příponu `_uc`, daňové `_da`: pořizovací cena `pc_*`, oprávky `opr_*`, zůstatková cena `zc_*`. Kolik zbývá odepsat, je zůstatková cena.
- Odpisy: účetní metoda `odpmet_uc` a doba `doba_uc`, daňová odpisová skupina `m_skupina_da` a příznak rovnoměrného odpisu `rovnom_da`.
- Příznaky `hmotny`, `investicni`, `odpisovany`. Umístění `lokalita`, `budova`, `mistnost`, útvar `utvar`.
- `fixed_asset_detail` má navíc hodnoty po částečném vyřazení `akt_pc_uc`, `akt_opr_uc`, `akt_zc_uc` (a `_da`). Pro „kolik má majetek teď“ použij tyto. Když karta neexistuje, vrátí prázdnou odpověď.
- Vždy uveď, jestli jde o účetní, nebo daňové hodnoty.

## Odpisy a složky ceny

- Účetní odpisy: řádek za období `obdobi` s částkou `castka` za to období. Typ `typ`: 0 Počáteční oprávky, 1 Běžný, 2 Přerušení odpisů, 3 Vyřazení, 4 Částečné vyřazení.
- Daňové odpisy: řádek za rok `rok` s částkou `castka`, stejným `typ`, názvem metody `metoda` a daňovou uznatelností `uznatelnost`.
- Složky pořizovací ceny: `nazev`, `castka` v měně `mena`, `castka_kc` v Kč, `typ` (0 účetní i daňová, 1 jen účetní, 2 jen daňová) a `zvyseni` (0 navýšení ceny, 1 technické zhodnocení).
- `fixed_asset_disposals` je záznam vyřazování množství a přesunů (`datum`, `mnozstvi`, `duvod`, umístění). Částky neobsahuje. Hodnotu a způsob vyřazení najdeš v detailu karty (`vyrazeno_uc`, `vyrazeno_da`, `zpusob_vyr_nazev`, `prijem_vyr`).

## Typické dotazy

- **Celková hodnota majetku.** Projdi všechny stránky a sečti `pc_uc` a `zc_uc` karet ve stavu 1. Pro daňový pohled použij `_da`.
- **Odpisy za rok.** Souhrn za celý majetek konektor nevrací. Pro jednotlivé karty sečti účetní odpisy s `obdobi` v daném roce. U velké evidence to uživateli nabídni jen pro vybrané karty.

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
