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
  ok(`manifest ${manifest.name}@${manifest.version}`);
}
const extra = readdirSync(join(root, PLUGIN, '.claude-plugin')).filter((f) => f !== 'plugin.json');
if (extra.length) fail(`.claude-plugin/ smí obsahovat jen plugin.json (navíc: ${extra.join(', ')})`);
if (existsSync(join(root, PLUGIN, 'bin'))) fail('plugin/bin/ zablokuje instalaci na claude.ai a v Cowork');
const unexpected = readdirSync(join(root, PLUGIN)).filter((entry) => !PLUGIN_ENTRIES.includes(entry));
if (unexpected.length) fail(`plugin/ smí obsahovat jen ${PLUGIN_ENTRIES.join(', ')} (navíc: ${unexpected.join(', ')})`);
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
} else ok(`CHANGELOG.md má záznam pro ${manifest?.version}`);

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
