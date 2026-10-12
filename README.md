# Notia Business Server: plugin pro Claude (vývoj)

Repo pluginu, který propojí Claude s Notia Business Serverem (NBS). Samotný plugin je ve složce [`plugin/`](plugin/), jen ten se instaluje uživatelům. V portálu adresáře pluginů je Plugin path = `plugin`. Co plugin umí a jak se připojí, popisuje [plugin/README.md](plugin/README.md).

Zbytek repa slouží vývoji:

| Cesta | Obsah |
|---|---|
| `shared/` | společné sekce všech skills, do `plugin/skills` je zapíše `npm run sync` |
| `scripts/` | generátor společných sekcí, validace a vydání verze |
| `.github/` | CI, pouští validaci u každého pushe a pull requestu |
| [CHANGELOG.md](CHANGELOG.md) | změny po verzích, včetně požadované verze bridge |
| [CONTRIBUTING.md](CONTRIBUTING.md) | postup úprav, kontrol a vydání verze |

```bash
npm run sync            # společné sekce ze shared/ do plugin/skills
npm run validate        # kontroly, totéž pouští CI
npm run release:patch   # nebo release:minor / release:major
```

Licence: Apache-2.0, viz [LICENSE](LICENSE).
