#!/usr/bin/env node

/**
 * Builds the wiki into a static site with Quartz.
 *
 *   node scripts/site.mjs build   # outputs to .site/quartz/public
 *   node scripts/site.mjs serve   # live preview on http://localhost:8080
 *
 * Quartz is not vendored: a pinned release is cloned into .site/quartz (gitignored),
 * our config from quartz/ is copied over it, and wiki/ + raw/ are staged as content.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const QUARTZ_VERSION = 'v5.0.0';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const quartzDir = path.join(rootDir, '.site', 'quartz');
const contentDir = path.join(quartzDir, 'content');
const mode = process.argv[2] ?? 'build';

function run(cmd, cwd = quartzDir) {
  console.log(`$ ${cmd}`);
  execSync(cmd, { cwd, stdio: 'inherit' });
}

// 1. Fetch pinned Quartz and install its dependencies + plugins (cached after first run).
if (!fs.existsSync(path.join(quartzDir, 'package.json'))) {
  fs.mkdirSync(path.dirname(quartzDir), { recursive: true });
  run(`git clone --depth 1 --branch ${QUARTZ_VERSION} https://github.com/jackyzha0/quartz.git "${quartzDir}"`, rootDir);
}
if (!fs.existsSync(path.join(quartzDir, 'node_modules'))) run('npm ci');
fs.copyFileSync(path.join(rootDir, 'quartz', 'quartz.config.yaml'), path.join(quartzDir, 'quartz.config.yaml'));
run('npx quartz plugin restore');

// 2. Stage content. wiki/ and raw/ keep their repo-relative layout so links between them resolve.
fs.rmSync(contentDir, { recursive: true, force: true });
fs.mkdirSync(contentDir, { recursive: true });
fs.copyFileSync(path.join(rootDir, 'quartz', 'home.md'), path.join(contentDir, 'index.md'));
for (const dir of ['wiki', 'raw']) {
  fs.cpSync(path.join(rootDir, dir), path.join(contentDir, dir), { recursive: true });
}

// Quartz reads `modified`/`title` from frontmatter. Map our `last_updated`, and give raw notes
// (which have no frontmatter) a title from their first heading and a date from their filename.
function stage(file) {
  let text = fs.readFileSync(file, 'utf-8');
  const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (fm) {
    const updated = fm[1].match(/^last_updated:\s*"?(\d{4}-\d{2}-\d{2})"?/m);
    if (updated && !/^modified:/m.test(fm[1])) {
      text = text.replace(fm[0], `---\n${fm[1]}\nmodified: ${updated[1]}\n---`);
    }
  } else {
    const fields = [];
    const heading = text.match(/^#\s+(.+)$/m);
    if (heading) fields.push(`title: ${JSON.stringify(heading[1].trim())}`);
    const date = path.basename(file).match(/^(\d{4}-\d{2}-\d{2})/);
    if (date) fields.push(`created: ${date[1]}`, `modified: ${date[1]}`);
    if (fields.length) text = `---\n${fields.join('\n')}\n---\n\n${text}`;
  }
  fs.writeFileSync(file, text);
}

(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else if (entry.name.endsWith('.md')) stage(p);
  }
})(contentDir);

// 3. Build or serve.
run(mode === 'serve' ? 'npx quartz build --serve' : 'npx quartz build');

// 4. The search, graph and explorer plugins fetch "/static/contentIndex.json" from the domain root,
// which 404s when the site is served from a subpath (emocado.github.io/llm-wiki/). postscript.js is
// an ES module at the site root, so resolve the index relative to it instead.
if (mode !== 'serve') {
  const postscript = path.join(quartzDir, 'public', 'postscript.js');
  const js = fs.readFileSync(postscript, 'utf-8');
  const absoluteFetch = 'fetch("/static/contentIndex.json")';
  if (!js.includes(absoluteFetch)) {
    throw new Error(`site.mjs: expected ${absoluteFetch} in postscript.js; Quartz output changed, revisit this patch`);
  }
  fs.writeFileSync(postscript, js.replaceAll(absoluteFetch, 'fetch(new URL("./static/contentIndex.json", import.meta.url))'));
}
