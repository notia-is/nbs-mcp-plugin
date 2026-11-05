---
name: receivables-payables
description: Pohledávky, závazky a platby z Notia Business Serveru (NBS). Použij, když se uživatel ptá na vystavené nebo přijaté faktury, neuhrazené doklady a doklady po splatnosti, saldo partnera, kdo nám dluží nebo komu dlužíme, součty a obraty faktur za období podle partnerů, produktů nebo měsíců, závazky čekající na schválení, bankovní transakce nebo to, jestli a kdy přišla platba, a je připojený konektor Notia Business Server.
---

# Pohledávky, závazky a platby v NBS

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
| Vystavené faktury (pohledávky) | `receivables_query`, detail `receivable_detail`, řádky `receivable_items_query` |
| Přijaté faktury (závazky) | `payables_query`, detail `payable_detail`, řádky `payable_items_query` |
| Doklady jednoho partnera | `companies_query` → pole `shortcut` → `receivables_query` / `payables_query` s `partner` = `shortcut` |
| Řádky napříč všemi doklady | `receivables_all_items_query`, `payables_all_items_query` |
| Součet faktur za období (částka v Kč, počet položek) | `receivables_summary`, `payables_summary` |
| Faktury za období podle partnera, produktu, obchodníka, útvaru, výkonu, zakázky nebo měny | `receivables_breakdown`, `payables_breakdown` |
| Vývoj po letech, čtvrtletích a měsících, žebříček největších partnerů nebo produktů | `receivables_turnover`, `payables_turnover` |
| Položky faktur za období s filtry | `receivables_transactions`, `payables_transactions` |
| Závazky čekající na mé schválení | `dashboard_payables_approval` |
| Platby na bankovních účtech | `banking_transactions_query`, detail `banking_transaction_detail` |

## Hledání a období

- Pohledávky a závazky zúžíš parametry `partner` (zkratka partnera), `vystaveni_od` a `vystaveni_do` nebo `plneni_od` a `plneni_do` (DUZP). Data piš ve tvaru `YYYY-MM-DD`, obě hranice platí včetně. `total` je pak počet dokladů po zúžení.
- Zkratku partnera najdeš v poli `shortcut` z `companies_query` se `search` (hledá v názvu, zkratce, ulici, městě a e-mailu, ne v IČO). Když dohledání vrátí víc firem, zeptej se uživatele, kterou myslí.
- `partner` se porovnává přesně včetně velikosti písmen. Prázdný seznam u firmy, která doklady má, znamená špatnou zkratku, ne chybu.
- `company_receivables_query` a `company_payables_query` vrací totéž pro jednu firmu (zkratka v `partner`) a mají stejné parametry období.
- Seznamy jsou seřazené od naposledy zapsaných dokladů a řazení nejde změnit.
- Bankovní transakce zúžíš parametry `datum_od`/`datum_do`, `var_symbol` (přesná shoda) a `protistrana` (část názvu protistrany).

## Souhrny, rozpady a obraty za období

- Na součty za období používej `*_summary`, `*_breakdown` a `*_turnover` místo procházení seznamů dokladů. Sečtou všechny faktury v NBS najednou.
- Všechny mají povinné `from` a `to` (YYYY-MM-DD, obě hranice včetně). Zúžit jdou parametry `partner` (zkratka `shortcut` z `companies_query`), `partner_group`, `product`, `product_group`, `department`, `operation`, `contract` a `merchant`.
- `*_summary` vrací `sale` (částka v Kč), `amount` (množství) a `count` (počet položek, ne dokladů).
- `*_breakdown` seskupí podle `group_by`: jeden nebo víc sloupců oddělených čárkou z `partner`, `produkt`, `mena`, `obchodnik`, `utvar`, `vykon`, `zakazka`. Řádek má `sale_czk`, `quantity`, `count` a hodnoty sloupců s klíči velkými písmeny (`PARTNER`, `PRODUKT`). Časové sloupce rozpad nemá.
- `*_turnover` umí navíc `rok`, `ctvrtleti` a `mesic` (např. `group_by` `rok,mesic` pro vývoj po měsících). Řádek má `metric` a sloupce velkými písmeny (`ROK`, `MESIC`). `metric` je ve výchozím stavu částka v Kč, `mnozstvi` nebo `pocet` ji změní. `date_type` určuje, podle kterého data se faktura zařadí do období: `obdobi` (účetní období, výchozí), `vystaveni` nebo `plneni` (DUZP). Pro žebříček „top N“ pošli `top` s řazením podle metriky (výchozí sestupně).
- `*_transactions` vrací jednotlivé položky faktur (doklad `document_code` a `document_number`, partner, produkt, `date`, `amount_czk`, `vat_czk`, `quantity`). Projdi je jen tehdy, když uživatel chce konkrétní položky. Na součty je nepoužívej.
- Rozpad a položky mají stránkování (`limit` výchozí 50, `offset`). `total` je počet všech skupin nebo položek.
- Součty počítá NBS z položek faktur, takže se mohou lišit od součtu `castka_kc` hlaviček z `receivables_query` a `payables_query`, například o zaokrouhlení. Uveď, z kterého přehledu číslo pochází.
- Když konektor tyto nástroje nenabízí (starší NBS Hub), spočítej součty ze seznamů dokladů jako dřív a řekni, kolik dokladů jsi sečetl.

## Pole pohledávek a závazků

- Číslo dokladu: `dokl_cis` (řada `dokl_kod`, rok `dokl_rok`). Číslo faktury od dodavatele (`ev_cislo_dd`) je jen v `payable_detail`.
- Partner: `partner` (zkratka), `partner_nazev`.
- Data: `vystaveni`, `plneni` (DUZP), `splatnost`, `placeni` (datum úhrady, vyplněné až po zaplacení). `splatnost_dny` je lhůta splatnosti ve dnech, ne počet dní po splatnosti.
- Částky v měně dokladu: `castka` bez DPH, `dan`, `celkem` s DPH, `zustatek` zbývá uhradit. V Kč: `castka_kc`, `dan_kc`, `zustatek_kc`. Měna `mena`, kurz `kurs`.
- Stav pohledávky `stav`: 0 Nová, 1 Vystavená, 2 Částečně uhrazená, 3 Uhrazená, -1 Stornovaná, -2 Neřeší se. U závazku stejně, jen 1 je Přijatý.
- Typ pohledávky `dokl_typ`: 10 faktura (daňový doklad), 11 dobropis, 12 a 13 zálohová faktura. Dobropisy mají `castka_kc` záporné, takže se při sečtení s fakturami samy odečtou. Kladný dobropis je chyba v datech, uživatele na něj upozorni.
- Schvalování závazku `schvalovani_prijeti_stav`: 0 bez schvalování, 1 ve schvalování, 2 schválený, 3 zamítnutý.
- Položky dokladu: `nazev`, `produkt`, `mnozstvi`, `mj`, `cena`, `castka` bez DPH, `dan`. V `receivable_items_query` je `celkem` součet řádku a `celkem_hlav` součet celého dokladu.

## Typické dotazy

- **Po splatnosti.** Pole pro to NBS nemá. Doklad je po splatnosti, když `splatnost` je před dneškem, `zustatek` je větší než 0 a `stav` je 1 nebo 2. Počet dní po splatnosti spočítej od `splatnost`.
- **Saldo partnera.** Sečti `zustatek_kc` otevřených pohledávek a zvlášť otevřených závazků partnera (`receivables_query` a `payables_query` s `partner`). Když má doklady ve více měnách, uveď i součty v původních měnách.
- **Zaplatil zákazník fakturu?** Rozhoduje `stav`, `zustatek` a `placeni` pohledávky. Bankovní transakci najdeš přes `banking_transactions_query` s `var_symbol` rovným `var_sym` dokladu.
- **Závazky ke schválení.** `dashboard_payables_approval` vrací `{ success, data: { payables: [...] } }` jen s doklady, které čekají na přihlášeného uživatele. Pole jsou anglicky: `document`, `document_supplier` (číslo od dodavatele), `partner_name`, `due_date`, `total`, `balance`, `currency` a hotový příznak `overdue`.

## Bankovní transakce

- `castka` má znaménko: kladná je příchozí platba, záporná odchozí. Dále `datum`, `mena`, protistrana `protiucet_nazev` a `protiucet`, symboly `var`, `konst`, `spec` a zprávy `zprava_odesilatele`, `zprava_pro_prijemce`.
- Uživatel může mít oprávnění jen k příchozím, nebo jen k odchozím platbám. Pak dostane jen ty. Když chybí jeden směr, upozorni na to a nevyvozuj, že platby neexistují.
- Čísla účtů protistran uváděj, jen když se na ně uživatel ptá.

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
