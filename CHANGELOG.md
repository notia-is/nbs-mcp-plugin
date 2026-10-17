# Changelog

Podstatné změny pluginu Notia Business Server. Nové změny se zapisují do sekce „Nevydáno“, při vydání ji `npm run release:patch|minor|major` přejmenuje na novou verzi (postup v CONTRIBUTING.md). Verze odpovídá `version` v `.claude-plugin/plugin.json`. U každé verze je uvedeno, jaký bridge NBS potřebuje.

## [Nevydáno]

**Vyžaduje:** nbs-mcp-bridge ≥ 1.0.4, NBS Hub ≥ 2.4.84

### Změněno
- Odkaz na zásady ochrany osobních údajů vede na stránku pro plugin: <https://notia.com/nbs-claude-privacy/> (`privacyPolicyUrl`, README).

## [1.0.7] – 2026-10-13

**Vyžaduje:** nbs-mcp-bridge ≥ 1.0.4, NBS Hub ≥ 2.4.84

###
- Aktualizovaný plugin.json s odkazem na dokumentaci a na samotný repozitář.
- aktualizovaný soubor s ujednáním o ochraně osobních údajů, kde je přidaná kapitola pro využití Claude.

## [1.0.6] – 2026-10-13

**Vyžaduje:** nbs-mcp-bridge ≥ 1.0.4

### Přidáno
- Ikona a odkazy na podporu a zásady ochrany osobních údajů pro adresář pluginů (`icon`, `supportUrl`, `privacyPolicyUrl`).

## [1.0.5] – 2026-10-13

**Vyžaduje:** nbs-mcp-bridge ≥ 1.0.4, NBS Hub ≥ 2.4.84

**Bridge:** seznamy vrací vždy `{ rows, total, truncated }`, prázdný detail jako „Požadovaná data v NBS neexistují“, filtry skladových karet, inventur (sklad) a položek nákupních objednávek (`id_objednavky`), nástroje `balance_sheet_years` a `balance_sheet_books`, `limit` u `report_order_evaluation`. **NBS Hub:** `limit` u vyhodnocení objednávek.

### Přidáno
- README: předpoklady (zapnutá integrace, oprávnění `mcp.use`, bridge) a sekce „Když něco nejde“ s hláškami a postupem.
- Chyby: „Příliš mnoho požadavků“ a prázdný detail.
- Účetnictví: spočítané roky hlavní knihy (`balance_sheet_years`) a pracovní knihy (`balance_sheet_books`).
- Sklady a nákup: skladové karty podle skladu a produktu, inventury podle skladu, položky jedné nákupní objednávky.

### Změněno
- README: opravené věty o tom, kdo vidí heslo a data, a jak propojení zrušit.
- Společná pravidla: tvar seznamů `{ rows, total, truncated }`; u širokých seznamů `limit` nejvýš 100.
- `report_order_evaluation`: vyhodnotí nejvýš `limit` objednávek, při `truncated` zkrátit období; `rentability` je přirážka.
- `balance_sheet_totals`: hlavní kniha jen s `roks`, období `RRRRMM`; nuly za nespočítaný rok nejsou nulové účetnictví.
- Upozornění, že dashboard, firmy a produkty jsou z předpočítaných součtů a jak se liší `marze` v seznamu a v detailu produktu.

## [1.0.4] – 2026-10-13

**Vyžaduje:** nbs-mcp-bridge ≥ 1.0.3, NBS Hub ≥ 2.4.82

**Bridge:** vyžaduje bridge s filtry seznamů (bankovní transakce, zásilky, nákupní objednávky, skladové doklady, inventury, vyhodnocení produktů) a bez `search` u seznamů, kde ho NBS ignoruje. Reporty (`report_*`) bridge nabízí jen s NBS Hubem 2.4.82 a novějším, který u nich vynucuje oprávnění.

### Změněno
- Plugin je ve složce `plugin/`, v portálu je Plugin path = `plugin`. Vývojové soubory (`scripts/`, `shared/`, `package.json`) se uživatelům neinstalují.
- Skills popisují nové filtry seznamů místo `search`, který NBS u těchto seznamů ignoroval.
- Rozcestník: hlavní nástroj prodejů je `dashboard_revenue_monthly`, účetnictví `balance_sheet_totals` (reporty se starším Hubem chybí).

### Odstraněno
- Zmínka o `helpdesk_dashboard_tickets_query` (bridge ho vyřadil, pro moje tikety slouží `dashboard_tickets_query`).
- Poznámka o poli `avatar` u pracovníků (bridge ho vynechává).

## [1.0.3] – 2026-10-12

**Bridge:** vyžaduje bridge a NBS Hub s opravami z testu konektoru (2026-10-09): parametry `roky` a `obchodnik` u meziročních reportů, `od`/`do` u `report_order_evaluation`, nástroje `accounting_documents_query` a `accounting_document_detail`, pole `kod` u `sales_products_search` a detail tiketu bez fotek.

### Přidáno
- Ziskovost objednávek za období (`report_order_evaluation`) v sales-analysis.
- Účetní doklady a jejich položky (`accounting_documents_query`, `accounting_document_detail`) v accounting.

### Změněno
- Meziroční reporty vrací jen vyžádaný počet let (`roky`, u obchodníků nejvýš 5) a procenta zaokrouhlená na dvě desetinná místa. Report podle obchodníků obsahuje jen obchodníky s tržbami a jde zúžit na jednoho (`obchodnik`).
- Detail tiketu a řešení: dlouhé texty jsou zkrácené (`<pole>_truncated`), fotky a vložené obrázky vynechané.
- `sales_products_search` vrací kód produktu v poli `kod`.
- Výsledovka: firma bez nastavené výsledovky dostane „Požadovaná data v NBS neexistují“.

## [1.0.2] – 2026-10-09

### Změněno
- Web v manifestu a README: <https://notia.com>.
- Autor v manifestu je zapsán jako „NOTIA“.

## [1.0.1] – 2026-10-08

### Přidáno
- `.gitignore` pro soubory macOS a editorů a pro zipy pluginu.
- `package.json` se skripty `npm run sync`, `npm run validate` a `npm run release:patch|minor|major`.

### Změněno
- README: kontakt na podporu helpdesk@notia.com a odkaz na zásady ochrany osobních údajů.

## [1.0.0] – 2026-10-08

První stabilní verze pro adresář pluginů Claude. Obsahově shodná s 0.2.0.

**Bridge:** stejný požadavek jako 0.2.0.

## [0.2.0] – 2026-10-07

**Bridge:** vyžaduje bridge s novými parametry nástrojů: filtry `partner`, `vystaveni_od/do` a `plneni_od/do` u pohledávek a závazků, `kod` a `nazev` u `sales_products_query`, `dokl_cis`, `ex_id` a `dokl_cis_odb` u `sales_orders_query`, číselné `sklad` a `interval`. S dřívějším bridge skončí tato volání chybou „Neplatné argumenty“. Plugin vydávejte až po nasazení bridge.

### Přidáno
- Skill `nbs-overview`: přehled oblastí, se kterými konektor pomůže, jen podle nástrojů, které firma zpřístupnila.
- Hledání produktu podle kódu nebo názvu rovnou s číselným `id`, objednávky podle čísla, čísla z e-shopu nebo čísla zákazníka.
- Zúžení pohledávek a závazků podle partnera a období vystavení nebo plnění.
- Srovnání tří tvarů meziroční změny (`report_sales_yoy`, `companies_query`, `report_pl_how`) a jejich přesnosti.
- Společný číselník stavu zásilky pro zásilky i objednávky.

### Změněno
- Sekce Společná pravidla, Prezentace a Chyby jsou ve všech skills stejné a generují se ze `shared/` (`node scripts/sync-shared.mjs`).
- Chyby pokrývají všechny hlášky gateway včetně neplatných argumentů, časového limitu a vypnuté integrace.
- Tržby z faktur se počítají stejně jako přehledy prodejů NBS: faktury a dobropisy ve stavu 1 až 3, dobropisy mají záporné částky.
- Do konverzace se načítají nejvýš dvě stránky seznamu. Celkové tržby za celé měsíce se berou z `report_sales_yoy`.
- Procenta se zaokrouhlují na jedno desetinné místo, pokud uživatel nechce jinak, a nikdy přesněji, než vrací zdroj.
- Licence změněna z MIT na Apache-2.0.

### Odstraněno
- Záložní postup pro selhání `company_receivables_query` (příčina je v bridge opravená).
- Pravidlo „limit 20 u skladů“: `warehouses_query` vrací jen základní pole skladu.
- Pokyn posílat některá čísla jako text.

## [0.1.0] – 2026-10-06

První verze: konektor `https://mcp.notia.cz/mcp` a devět skills pro oblasti NBS.
