#!/usr/bin/env node
/**
 * Posune větev `directory` na vydaný tag. Tu sleduje adresář pluginů Claude (v portálu „Branch or tag“ =
 * directory), takže teprve tím se verze dostane k uživatelům. `main` může být napřed: vydaná verze
 * pluginu potřebuje nový bridge a do adresáře smí, až ho mají všichni zákazníci.
 *
 * - tag musí existovat a být v origin/main, `directory` se posouvá jen dopředu (fast-forward);
 * - minimální verze bridge a NBS Hubu se čtou z řádku „**Vyžaduje:**“ v CHANGELOG.md vydané verze;
 * - s NBS_ADMIN_TOKEN (token z ADMIN_TOKEN_FILE gatewaye) se verze ověří proti GET /admin/versions
 *   (NBS_GATEWAY_URL, výchozí https://mcp.notia.cz). Starší nebo nepřipojený bridge publikaci zastaví;
 * - bez tokenu, nebo když zákazník ještě nepřešel, projde jen s --force.
 *
 *   NBS_ADMIN_TOKEN=… npm run publish:directory -- v1.0.5 [--force]
 */
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const BRANCH = 'directory';

const die = (message) => {
  console.error(`publish:directory: ${message}`);
  process.exit(1);
};
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const tryGit = (...args) => {
  try {
    return git(...args);
  } catch {
    return undefined;
  }
};

const args = process.argv.slice(2);
const force = args.includes('--force');
const tag = args.find((arg) => !arg.startsWith('--'));
if (!tag || !/^v\d+\.\d+\.\d+$/.test(tag)) die('použití: npm run publish:directory -- vX.Y.Z [--force]');
const version = tag.slice(1);

git('fetch', '--quiet', '--tags', 'origin');
const commit = tryGit('rev-parse', '--verify', '--quiet', `${tag}^{commit}`);
if (!commit) die(`tag ${tag} neexistuje — nejdřív npm run release:* a git push origin main ${tag}.`);
if (tryGit('merge-base', '--is-ancestor', commit, 'origin/main') === undefined) die(`${tag} není v origin/main.`);

const requirements = parseRequirements(git('show', `${tag}:CHANGELOG.md`), version);
console.log(
  `${tag} vyžaduje nbs-mcp-bridge ≥ ${requirements.bridge}` + (requirements.hub ? `, NBS Hub ≥ ${requirements.hub}` : ''),
);

const problems = await checkInstallations(requirements);
if (problems.length) {
  for (const problem of problems) console.error(`  ✖ ${problem}`);
  if (!force) die('verze zatím nesmí do adresáře (přeskočit jde s --force, např. po dohodě se zákazníkem).');
  console.warn('--force: pokračuji i přes výše uvedené.');
}

const current = tryGit('rev-parse', '--verify', '--quiet', `origin/${BRANCH}`);
if (current && tryGit('merge-base', '--is-ancestor', current, commit) === undefined) {
  die(`origin/${BRANCH} není předkem ${tag} — větev se posouvá jen dopředu.`);
}
git('push', 'origin', `${commit}:refs/heads/${BRANCH}`);
console.log(`✔ origin/${BRANCH} → ${tag} (${commit.slice(0, 7)}). Adresář verzi převezme při další kontrole větve.`);

/** „**Vyžaduje:** nbs-mcp-bridge ≥ 1.1.0, NBS Hub ≥ 2.4.84“ ze sekce `## [verze]`. */
function parseRequirements(changelog, version) {
  const start = changelog.indexOf(`## [${version}]`);
  if (start === -1) die(`CHANGELOG.md v ${tag} nemá sekci „## [${version}]“.`);
  const end = changelog.indexOf('\n## ', start + 1);
  const section = changelog.slice(start, end === -1 ? undefined : end);
  const line = section.split('\n').find((l) => l.startsWith('**Vyžaduje:**'));
  const bridge = line?.match(/nbs-mcp-bridge\s*≥\s*(\d+\.\d+\.\d+)/)?.[1];
  if (!bridge) die(`sekce ${version} v CHANGELOG.md nemá řádek „**Vyžaduje:** nbs-mcp-bridge ≥ X.Y.Z“.`);
  return { bridge, hub: line.match(/NBS Hub\s*≥\s*(\d+\.\d+\.\d+)/)?.[1] };
}

async function checkInstallations({ bridge, hub }) {
  const token = process.env.NBS_ADMIN_TOKEN;
  if (!token) return ['NBS_ADMIN_TOKEN není nastavený, verze bridge u zákazníků nejde ověřit'];
  const url = `${(process.env.NBS_GATEWAY_URL ?? 'https://mcp.notia.cz').replace(/\/$/, '')}/admin/versions`;
  let body;
  try {
    const res = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
    if (!res.ok) return [`${url} vrátil HTTP ${res.status}`];
    body = await res.json();
  } catch (err) {
    return [`${url} nedostupné: ${err.message}`];
  }
  const problems = [];
  for (const i of body.installations ?? []) {
    const who = `${i.tenantName ?? i.tenantId} (${i.installationId})`;
    if (!i.connected) problems.push(`${who}: bridge není připojený, verzi nejde ověřit`);
    else if (!atLeast(i.bridgeVersion, bridge)) problems.push(`${who}: bridge ${i.bridgeVersion ?? '?'} < ${bridge}`);
    else if (hub && !atLeast(i.hubVersion, hub)) problems.push(`${who}: NBS Hub ${i.hubVersion ?? '?'} < ${hub}`);
  }
  console.log(`Zkontrolováno ${body.installations?.length ?? 0} instalací (gateway ${body.gateway?.version ?? '?'}).`);
  return problems;
}

function atLeast(actual, minimum) {
  const parse = (v) => /^(\d+)\.(\d+)\.(\d+)/.exec(String(v ?? ''))?.slice(1).map(Number);
  const a = parse(actual);
  const m = parse(minimum);
  if (!a || !m) return false;
  for (let i = 0; i < 3; i++) if (a[i] !== m[i]) return a[i] > m[i];
  return true;
}
