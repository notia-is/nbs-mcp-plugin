# Notia Business Server

Plugin propojí Claude s vaším Notia Business Serverem (NBS). V konverzaci se můžete ptát na tržby a prodeje, pohledávky a závazky, objednávky a zásilky, sklady, účetní výkazy, majetek, smlouvy nebo helpdesk a Claude odpověď sestaví z aktuálních dat vašeho NBS.

## Předpoklady

Konektor funguje jen pro firmy, které mají integraci NBS s Claude nastavenou:

- firma je v adresáři Notia a má NBS Hub připojený k Notia Business Serveru (zařizuje Notia),
- u NBS Hubu firmy běží komponenta bridge, přes kterou konektor data čte (zařizuje Notia nebo správce NBS),
- správce NBS ve firmě integraci s Claude zapnul,
- váš uživatel v NBS má oprávnění `mcp.use`,
- přehledy a výkazy (`report_*`) vyžadují NBS Hub 2.4.82 nebo novější.

Když si nejste jistí, zeptejte se správce NBS ve své firmě nebo podpory Notia.

## Použití

1. Nainstalujte plugin a na jeho záložce **Konektory** připojte konektor **Notia Business Server**.
2. V okně, které se otevře, zadejte doménu své firmy (například `firma.cz`). Budete přesměrováni na přihlašovací stránku svého NBS Hubu, kde se přihlásíte jako obvykle.
3. Ptejte se běžnou řečí, například: „Jak si letos vedou tržby proti loňsku?“, „Které faktury jsou po splatnosti?“ nebo „Kolik kusů produktu X je volných na skladě?“

Plugin obsahuje skills, které Claude vedou při výběru nástrojů, dohledání partnerů a produktů a přehledné prezentaci výsledků:

| Skill | Oblast |
|---|---|
| `nbs-overview` | přehled, s čím plugin pomůže a na co se můžete ptát |
| `sales-analysis` | tržby, meziroční srovnání, prodeje podle obchodníků, zákazníků a produktů |
| `receivables-payables` | pohledávky, závazky, doklady po splatnosti, saldo partnera, bankovní platby |
| `orders-shipments` | prodejní objednávky, zásilky, e-shopy a prodejny |
| `inventory-purchasing` | sklady, zásoby, skladové doklady, produkty a nákupní objednávky |
| `accounting` | výsledovka, náklady a výnosy, aktiva a pasiva, účetní číselníky |
| `fixed-assets` | dlouhodobý majetek a odpisy |
| `companies-pricing` | firmy, skupiny, cenové kategorie, ceníky a odeslaná pošta |
| `contracts` | smlouvy, sazby, fakturační podklady a pracovníci |
| `helpdesk` | tikety, reakce, výkazy práce a zákaznický portál |

## Data a oprávnění

- Přístup je jen pro čtení. Plugin ani konektor v NBS nic nezakládají ani nemění.
- Vidíte jen data, ke kterým máte oprávnění ve svém uživatelském účtu NBS. Oprávnění ověřuje NBS při každém dotazu.
- Heslo zadáváte jen na přihlašovací stránce NBS Hubu své firmy. Služba `mcp.notia.cz` ani Claude ho nevidí. Claude dostane jen časově omezený přístupový token ke konektoru, ne heslo ani přihlášení do NBS.
- Dotazy, které Claude sestaví (název nástroje, období a filtry), jdou přes `mcp.notia.cz` do NBS Hubu vaší firmy. Výsledky se stejnou cestou vracejí do konverzace. `mcp.notia.cz` je jen předává a neukládá. Jako součást konverzace je pak zpracovává Anthropic podle svých podmínek.
- Doménu firmy `mcp.notia.cz` použije jen k vyhledání adresy vašeho NBS Hubu v adresáři Notia.
- Samotný plugin neobsahuje přihlašovací údaje ani klíče. `mcp.notia.cz` ukládá jen záznam o propojení (nejdéle 30 dní) a auditní záznam bez obsahu dotazů. Podrobnosti jsou v zásadách níže.
- Propojení zrušíte v NBS v profilu, sekce „Aktivní propojení“. Odpojením konektoru v Claude ho Claude přestane používat. Neodvolané propojení vyprší nejpozději 30 dní po přihlášení.
- Jak Notia zpracovává osobní údaje, popisují [zásady ochrany osobních údajů](https://notia.com/ochrana-soukromi/).

## Když něco nejde

| Hláška | Co dělat |
|---|---|
| „Pro tuto doménu nebyl nalezen NBS Hub s povoleným přihlášením přes Claude“ | Zkontrolujte doménu. Když je správná, firma integraci zatím nemá, obraťte se na správce NBS nebo podporu Notia. |
| „NBS Hub … zatím není k Notia Business Serveru připojen“ | Integraci pro vaši firmu dokončuje Notia, kontaktujte podporu. |
| „NBS Hub vaší firmy je momentálně nedostupný“ | Nedostupný je NBS Hub nebo bridge vaší firmy. Zkuste to později, při delším výpadku kontaktujte správce NBS. |
| „Správce vaší firmy integraci NBS s Claude nepovolil“ nebo „vypnul“ | Integraci musí zapnout správce NBS ve vaší firmě. Potom konektor připojte znovu. |
| „Nemáte v NBS oprávnění používat Claude (mcp.use)“ | Požádejte správce NBS o oprávnění `mcp.use` a konektor připojte znovu. |
| „Platnost přihlášení do NBS vypršela“ | Připojte konektor znovu v nastavení konektorů v Claude. |
| „K těmto datům nemáte v NBS oprávnění“ | Data vidí jen uživatelé s příslušným oprávněním v NBS. |
| „Výsledek je příliš velký“ nebo „NBS neodpověděl v časovém limitu“ | Zeptejte se na kratší období nebo užší výběr. |
| Claude některou oblast nebo přehled nenabízí | Firma ji nemá zpřístupněnou, nebo má starší NBS Hub (přehledy `report_*` od verze 2.4.82). |

Chybové hlášky obsahují „ID požadavku“. Při hlášení problému ho pošlete podpoře, podle něj se dotaz dohledá.

## English

Connects Claude to Notia Business Server (NBS), an ERP used by Czech companies. Ask about revenue and sales, receivables and payables, orders and shipments, inventory, financial statements, fixed assets, contracts or helpdesk tickets and Claude answers from your live NBS data. Access is read-only and always limited to the permissions of your own NBS account. You sign in on your company's own NBS Hub login page; your password is never sent to `mcp.notia.cz` or to Claude. Queries (tool name, date range and filters) are sent through `mcp.notia.cz` to your company's NBS Hub, and the results are returned to your Claude conversation; `mcp.notia.cz` passes them through without storing them. It keeps only the authorization record (at most 30 days) and an audit log without query contents. The plugin itself contains no credentials. Requirements: your company has the NBS integration with Claude set up and enabled, and your NBS user has the `mcp.use` permission.

Support: [helpdesk@notia.com](mailto:helpdesk@notia.com). Privacy policy: <https://notia.com/ochrana-soukromi/>.

## Podpora

- Podpora: [helpdesk@notia.com](mailto:helpdesk@notia.com)
- Zásady ochrany osobních údajů: <https://notia.com/ochrana-soukromi/>
- Web: <https://notia.com>
