#!/usr/bin/env node
/**
 * Kontrola pluginu před `claude plugin validate` a odesláním do developer portálu:
 * manifest, .mcp.json bez secrets, skills (frontmatter, shoda společných sekcí se shared/,
 * rozcestník), README (seznam skills), CHANGELOG (záznam pro aktuální verzi), licence a to, že v plugin/
 * (instaluje se uživatelům, v portálu Plugin path = plugin) nejsou vývojové soubory.
 * Pouští ji CI (.github/workflows/validate.yml) a dá se pustit odkudkoli:
 *
 *   npm run validate   (nebo node scripts/validate.mjs)
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
/** Složka, kterou portál instaluje uživatelům — jen samotný plugin. */
const PLUGIN = 'plugin';
const PLUGIN_ENTRIES = ['.claude-plugin', '.mcp.json', 'skills', 'README.md', 'LICENSE', 'NOTICE'];
/** Pole manifestu, která čte adresář pluginů (Claude Code je ignoruje) — musí to být https URL. */
const DIRECTORY_URL_FIELDS = ['homepage', 'documentationUrl', 'supportUrl', 'privacyPolicyUrl', 'termsOfServiceUrl'];
/** Ikona pro adresář pluginů: formáty podle pre-submission checklistu, poznají se podle prvních bajtů. */
const ICON_MAX_BYTES = 256 * 1024;
const ICON_FORMATS = [
  { name: 'PNG', test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { name: 'JPEG', test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { name: 'GIF', test: (b) => ['GIF87a', 'GIF89a'].includes(b.subarray(0, 6).toString('latin1')) },
  { name: 'WebP', test: (b) => b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP' },
];

const errors = [];
const ok = (message) => console.log(`✔ ${message}`);
const fail = (message) => errors.push(message);
const readText = (file) => (existsSync(join(root, file)) ? readFileSync(join(root, file), 'utf8') : '');
const readJson = (file) => {
  try {
    return JSON.parse(readFileSync(join(root, file), 'utf8'));
  } catch (err) {
    fail(`${file}: ${err.message}`);
    return undefined;
  }
};
// Sekce markdownu podle nadpisu `## `; `### ` je podsekce.
const sections = (text) =>
  Object.fromEntries(
    text
      .split(/^(?=## )/m)
      .filter((part) => part.startsWith('## '))
      .map((part) => [part.slice(3, part.indexOf('\n')).trim(), part.trimEnd()]),
  );
// Názvy skills ze sloupce tabulky markdownu (`column` = pořadí sloupce od 0).
const tableSkills = (text, column) =>
  new Set(
    text
      .split('\n')
      .map((line) => line.split('|').slice(1, -1)[column]?.trim())
      .map((cell) => /^`([a-z0-9-]+)`$/.exec(cell ?? '')?.[1])
      .filter(Boolean),
  );
const sameSet = (label, listed, actual) => {
  for (const name of actual) if (!listed.has(name)) fail(`${label} neuvádí skill ${name}`);
  for (const name of listed) if (!actual.includes(name)) fail(`${label} uvádí neexistující skill ${name}`);
};

// manifest
const manifest = readJson(join(PLUGIN, '.claude-plugin', 'plugin.json'));
if (manifest) {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(manifest.name ?? '')) fail('plugin.json: name musí být kebab-case');
  if (!/^\d+\.\d+\.\d+/.test(manifest.version ?? '')) fail('plugin.json: version musí být semver');
  if (!manifest.description?.trim()) fail('plugin.json: chybí description');
  if (!manifest.author?.name) fail('plugin.json: chybí author.name');
  for (const field of DIRECTORY_URL_FIELDS) {
    if (manifest[field] === undefined) continue;
    let url;
    try {
      url = new URL(manifest[field]);
    } catch {
      // neplatná URL — ohlásí podmínka níž
    }
    if (url?.protocol !== 'https:') fail(`plugin.json: ${field} musí být https:// URL (mailto: adresář nepřijme)`);
  }
  ok(`manifest ${manifest.name}@${manifest.version}`);
}

// ikona: soubor uvnitř plugin/, cesta relativně ke kořeni pluginu (ne k .claude-plugin/)
let iconEntry;
if (manifest?.icon !== undefined) {
  const icon = String(manifest.icon);
  const relative = icon.replace(/^\.\//, '');
  const iconPath = join(root, PLUGIN, relative);
  if (!icon.startsWith('./') || relative.split('/').includes('..')) {
    fail(`plugin.json: icon musí být cesta uvnitř pluginu ve tvaru ./soubor (je „${icon}“)`);
  } else if (!existsSync(iconPath)) {
    fail(`plugin.json: ikona ${icon} neexistuje (hledá se v plugin/${relative})`);
  } else {
    iconEntry = relative.split('/')[0];
    const bytes = readFileSync(iconPath);
    const format = ICON_FORMATS.find((f) => f.test(bytes));
    if (!format) fail(`plugin/${relative}: ikona musí být PNG, JPEG, GIF nebo WebP`);
    else if (bytes.length >= ICON_MAX_BYTES) fail(`plugin/${relative}: ikona má ${Math.round(bytes.length / 1024)} KiB, limit je 256 KiB`);
    else ok(`ikona plugin/${relative} (${format.name}, ${Math.round(bytes.length / 1024)} KiB)`);
  }
}
const extra = readdirSync(join(root, PLUGIN, '.claude-plugin')).filter((f) => f !== 'plugin.json');
if (extra.length) fail(`.claude-plugin/ smí obsahovat jen plugin.json (navíc: ${extra.join(', ')})`);
if (existsSync(join(root, PLUGIN, 'bin'))) fail('plugin/bin/ zablokuje instalaci na claude.ai a v Cowork');
const allowedEntries = iconEntry ? [...PLUGIN_ENTRIES, iconEntry] : PLUGIN_ENTRIES;
const unexpected = readdirSync(join(root, PLUGIN)).filter((entry) => !allowedEntries.includes(entry));
if (unexpected.length) fail(`plugin/ smí obsahovat jen ${allowedEntries.join(', ')} (navíc: ${unexpected.join(', ')})`);
else ok('plugin/ obsahuje jen soubory pluginu');

// MCP konektor
const SECRET_KEYS = /^(headers|env|token|api[-_]?key|secret|password|authorization)$/i;
const mcp = existsSync(join(root, PLUGIN, '.mcp.json')) ? readJson(join(PLUGIN, '.mcp.json')) : undefined;
for (const [name, server] of Object.entries(mcp?.mcpServers ?? {})) {
  if (server.type !== 'http') fail(`.mcp.json ${name}: očekává se vzdálený server "type": "http"`);
  let url;
  try {
    url = new URL(server.url);
  } catch {
    fail(`.mcp.json ${name}: neplatná url`);
    continue;
  }
  if (url.protocol !== 'https:') fail(`.mcp.json ${name}: url musí být HTTPS`);
  if (url.search || url.username || url.password) fail(`.mcp.json ${name}: url nesmí obsahovat query ani credentials`);
  const secrets = Object.keys(server).filter((key) => SECRET_KEYS.test(key));
  if (secrets.length) fail(`.mcp.json ${name}: nesmí obsahovat secrets (${secrets.join(', ')})`);
  ok(`konektor ${name} → ${url.href}`);
}

// skills
// Společné sekce se píšou jen do shared/*.md (jeden soubor = jedna sekce včetně nadpisu)
// a do skills je kopíruje scripts/sync-shared.mjs.
const shared = [];
for (const file of existsSync(join(root, 'shared')) ? readdirSync(join(root, 'shared')) : []) {
  if (!file.endsWith('.md')) continue;
  const body = readText(join('shared', file)).trimEnd();
  if (!body.startsWith('## ')) fail(`shared/${file}: musí začínat nadpisem „## …“`);
  else shared.push({ file, body, heading: body.split('\n', 1)[0].slice(3).trim() });
}
const skillsDir = join(root, PLUGIN, 'skills');
const skills = (existsSync(skillsDir) ? readdirSync(skillsDir, { withFileTypes: true }) : [])
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);
for (const dir of skills) {
  const file = join(PLUGIN, 'skills', dir, 'SKILL.md');
  const content = readText(file);
  if (!content) {
    fail(`plugin/skills/${dir}: chybí SKILL.md`);
    continue;
  }
  const parts = sections(content);
  for (const { file: source, heading, body } of shared) {
    if (!parts[heading]) fail(`plugin/skills/${dir}: chybí sekce „${heading}“ ze shared/${source}`);
    else if (parts[heading] !== body) {
      fail(`plugin/skills/${dir}: sekce „${heading}“ neodpovídá shared/${source} (spusťte npm run sync)`);
    }
  }
  const frontmatter = /^---\n([\s\S]*?)\n---\n/.exec(content)?.[1] ?? '';
  const field = (key) => new RegExp(`^${key}:\\s*(.+)$`, 'm').exec(frontmatter)?.[1].trim();
  if (field('name') !== dir) fail(`plugin/skills/${dir}: name ve frontmatter musí být "${dir}"`);
  const description = field('description') ?? '';
  if (!description) fail(`plugin/skills/${dir}: chybí description`);
  if (description.length > 1024) fail(`plugin/skills/${dir}: description je delší než 1024 znaků`);
  ok(`skill ${dir}`);
}

// Rozcestník musí v tabulce „Oblasti“ (sloupec Skill) uvádět přesně všechny ostatní skills.
const OVERVIEW = 'nbs-overview';
if (skills.includes(OVERVIEW)) {
  const listed = tableSkills(sections(readText(join(PLUGIN, 'skills', OVERVIEW, 'SKILL.md')))['Oblasti'] ?? '', 1);
  sameSet(`plugin/skills/${OVERVIEW}: tabulka „Oblasti“`, listed, skills.filter((dir) => dir !== OVERVIEW));
  ok(`rozcestník ${OVERVIEW}: ${listed.size} oblastí`);
}

// README: text pro adresář pluginů a tabulka všech skills (první sloupec).
const readme = readText(join(PLUGIN, 'README.md'));
const words = readme.replace(/```[\s\S]*?```/g, '').split(/\s+/).filter(Boolean).length;
if (words < 40) fail(`plugin/README.md musí mít alespoň 40 slov mimo bloky kódu (má ${words})`);
else ok(`plugin/README.md (${words} slov)`);
const readmeSkills = tableSkills(readme, 0);
sameSet('plugin/README.md: tabulka skills', readmeSkills, skills);
ok(`plugin/README.md uvádí ${readmeSkills.size} skills`);

// CHANGELOG: každá verze z plugin.json musí mít záznam.
const changelog = readText('CHANGELOG.md');
if (!changelog) fail('chybí CHANGELOG.md');
else if (manifest?.version && !changelog.includes(`## [${manifest.version}]`)) {
  fail(`CHANGELOG.md: chybí záznam „## [${manifest.version}]“ pro verzi z plugin.json`);
} else {
  // publish:directory podle tohohle řádku pozná, jaký bridge musí mít zákazníci, než verze půjde do adresáře
  const start = changelog.indexOf(`## [${manifest.version}]`);
  const end = changelog.indexOf('\n## ', start + 1);
  const section = changelog.slice(start, end === -1 ? undefined : end);
  if (!/^\*\*Vyžaduje:\*\* nbs-mcp-bridge ≥ \d+\.\d+\.\d+/m.test(section)) {
    fail(`CHANGELOG.md: verze ${manifest.version} nemá řádek „**Vyžaduje:** nbs-mcp-bridge ≥ X.Y.Z“`);
  } else ok(`CHANGELOG.md má záznam pro ${manifest?.version} i s požadovanou verzí bridge`);
}

// licence se instaluje s pluginem; kopie v kořeni je pro GitHub a musí být stejná
const pluginLicense = readText(join(PLUGIN, 'LICENSE'));
if (!pluginLicense && !manifest?.license) fail('chybí plugin/LICENSE nebo license v plugin.json');
else if (pluginLicense && readText('LICENSE') && readText('LICENSE') !== pluginLicense) fail('LICENSE a plugin/LICENSE se liší');
else ok('licence');

if (errors.length) {
  for (const error of errors) console.error(`✖ ${error}`);
  process.exit(1);
}
console.log('✔ Validace prošla — před odesláním spusťte ještě `claude plugin validate`.');
