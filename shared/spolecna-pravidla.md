## Společná pravidla

- Konektor čte data z NBS jen pro čtení a s oprávněními přihlášeného uživatele.
- Když konektor některý nástroj nenabízí, firma ho nemá zpřístupněný. Řekni to a data neodhaduj.
- Každý seznam (`*_query`, ale i reporty a podseznamy) vrací `{ rows, total, truncated }`: `rows` jsou vrácené řádky, `total` počet všech záznamů a `truncated: true` znamená, že se všechny nevešly a výsledek je neúplný. Seznamy se stránkováním vrací ve výchozím stavu 50 řádků, další stránku dostaneš přes `offset`.
- Široké seznamy (doklady, produkty, firmy, sklady) nech na výchozím `limit` 50 a nejvýš 100, jinak výsledek přeroste limit velikosti. `limit` 200 posílej jen u krátkých číselníků, u kterých to skill výslovně uvádí.
- Když čekáš hodně záznamů, nejdřív zjisti `total` (stačí `limit` 1). Do konverzace nenačítej víc než pár stránek. Když by odpověď potřebovala víc, zuž dotaz, nebo uživateli řekni, kolik záznamů z `total` jsi prošel.
- Data chodí jako čas v UTC: `2026-03-31T22:00:00.000Z` je 1. 4. 2026 v Česku. Před porovnáním s obdobím je převeď na český čas.
- Relativní období („minulý měsíc“, „letos“, „Q1“) převeď na konkrétní data podle dnešního dne a v odpovědi je uveď.
