# Vývoj pluginu

Návod pro úpravy skills, kontroly a vydání nové verze. Co plugin dělá pro uživatele, popisuje [plugin/README.md](plugin/README.md).

## Struktura repa

| Cesta | Obsah |
|---|---|
| `plugin/` | samotný plugin, jen ten se instaluje uživatelům (v portálu Plugin path = `plugin`) |
| `plugin/.claude-plugin/plugin.json` | manifest pluginu, včetně `version` |
| `plugin/.mcp.json` | odkaz na konektor `https://mcp.notia.cz/mcp` |
| `plugin/skills/*/SKILL.md` | skills pro jednotlivé oblasti NBS, `nbs-overview` je rozcestník |
| `plugin/README.md` | popis pluginu pro uživatele a adresář pluginů |
| `plugin/icon.png` | ikona pro adresář pluginů (`icon` v `plugin.json`), PNG/JPEG/GIF/WebP pod 256 KiB |
| `shared/*.md` | společné sekce všech skills (Společná pravidla, Prezentace, Chyby) |
| `scripts/` | generátor společných sekcí, validace a vydání verze |
| `CHANGELOG.md` | změny po verzích, včetně požadované verze bridge |
| `package.json` | jen `npm run` skripty (`sync`, `validate`, `release:*`, `publish:directory`), bez závislostí a bez verze |

Skripty nemají závislosti, `npm install` není potřeba. Fungují i přes `pnpm run`.

Do složky `plugin/` patří jen manifest, `.mcp.json`, skills, README, LICENSE a NOTICE. Vývojové soubory (`shared/`, `scripts/`, `package.json`, CI) jsou mimo ni, takže se uživatelům neinstalují. Validace hlídá obojí. `LICENSE` je i v kořeni kvůli GitHubu a musí být stejná jako `plugin/LICENSE`.

## Úpravy skills

- Názvy nástrojů a jejich parametry musí odpovídat katalogu bridge v monorepu `notia` (`apps/nbs-mcp-bridge/api/src/tools/mappings/`). Když bridge nástroj přidá, přejmenuje nebo změní parametry, upravte i skill.
- Společné sekce se ve skills needitují. Upravte soubor v `shared/` a spusťte `npm run sync`, který je zapíše do všech skills. Ruční úpravu společné sekce ve skillu generátor přepíše.
- Nový skill přidejte i do tabulky „Oblasti“ v `plugin/skills/nbs-overview/SKILL.md` a do tabulky skills v `plugin/README.md`.
- Každou změnu zapište do sekce `## [Nevydáno]` v `CHANGELOG.md`. Když skill nově používá parametr, který starší bridge nemá, uveďte to tam.

## Kontroly

```bash
npm run validate                    # totéž pouští CI u každého pushe a pull requestu
claude plugin validate plugin
claude --plugin-dir plugin          # test v Claude Code
```

Validace kontroluje manifest (včetně toho, že URL pro adresář jsou `https://` a ikona má povolený formát a velikost), `.mcp.json`, frontmatter skills, shodu společných sekcí se `shared/`, rozcestník, tabulku skills v `plugin/README.md`, obsah složky `plugin/`, licenci a záznam v CHANGELOG pro aktuální verzi.

## Vydání verze

1. Sekce `## [Nevydáno]` v `CHANGELOG.md` musí popisovat změny verze a mít řádek s minimální verzí bridge (a případně Hubu), jinak ji skript odmítne:
   ```markdown
   **Vyžaduje:** nbs-mcp-bridge ≥ 1.0.4, NBS Hub ≥ 2.4.84
   ```
2. Vydává se z aktuálního `main` s čistým pracovním stromem:
   ```bash
   git checkout main && git pull
   npm run release:patch               # nebo release:minor / release:major
   ```
   Skript pustí validaci, zvedne `version` v `plugin.json`, přejmenuje „Nevydáno“ na novou verzi s dnešním datem, vytvoří commit `release: vX.Y.Z` a anotovaný tag. Nic nepushuje.
3. Commit i tag pushněte jedním příkazem, obyčejný `git push` tagy neposílá:
   ```bash
   git push origin main vX.Y.Z
   ```
4. Portál bere plugin z repa ze složky `plugin` (Plugin path). Když je potřeba zip, vytvořte ho ze složky `plugin` v tagu:
   ```bash
   git archive --format=zip --prefix=notia-business-server/ vX.Y.Z:plugin > notia-business-server-X.Y.Z.zip
   ```

Kterou část verze zvednout:

- **patch**: opravy a zpřesnění textů skills,
- **minor**: nové schopnosti, například nový skill nebo využití nových nástrojů a parametrů, které už nasazený bridge má,
- **major**: plugin potřebuje novější bridge a se starším nefunguje.

## Publikace do adresáře pluginů

Adresář Claude sleduje větev `directory` (v portálu **Branch or tag** = `directory`, **Plugin path** = `plugin`), ne `main`. Vydaná verze se tak k uživatelům dostane, až když na ni `directory` posunete:

```bash
NBS_ADMIN_TOKEN=$(cat …/admin-token) npm run publish:directory -- vX.Y.Z
```

- Skript přečte z CHANGELOG řádek „**Vyžaduje:**“ a přes `GET https://mcp.notia.cz/admin/versions` ověří, že všechny bridge instalace jsou připojené a mají aspoň požadovanou verzi bridge a Hubu. Když ne, vypíše, kdo zaostává, a nic neudělá.
- `NBS_ADMIN_TOKEN` je token z `ADMIN_TOKEN_FILE` gatewaye (README mcp-notia, „Verze běžících aplikací“). Jinou gateway nastaví `NBS_GATEWAY_URL`.
- `--force` publikuje i bez ověření, například když zákazník s nepřipojeným bridge o změně ví.
- `directory` se posouvá jen dopředu na tagy z `main`. Do adresáře jde nový commit podle nastavení portálu: ke kontrole recenzentem Anthropicu, nebo rovnou.

`main` tak může být napřed: novou verzi pluginu vydáte hned s bridge, do adresáře ji pošlete, až ho mají všichni zákazníci.
