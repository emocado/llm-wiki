#!/usr/bin/env node

/**
 * Wiki Linter & Health Check Script
 * Validates link integrity, catalog coverage in index.md, and detects orphan pages.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const wikiDir = path.join(rootDir, 'wiki');
const indexPath = path.join(wikiDir, 'index.md');

let errors = 0;
let warnings = 0;

function getAllMarkdownFiles(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllMarkdownFiles(filePath));
    } else if (file.endsWith('.md')) {
      results.push(filePath);
    }
  }
  return results;
}

console.log('🔍 Running LLM Wiki Integrity & Health Check...\n');

if (!fs.existsSync(indexPath)) {
  console.error('❌ Error: wiki/index.md does not exist.');
  process.exit(1);
}

const indexContent = fs.readFileSync(indexPath, 'utf-8');
const allWikiFiles = getAllMarkdownFiles(wikiDir);

const contentFiles = allWikiFiles.filter(
  (f) => !f.endsWith('index.md') && !f.endsWith('log.md')
);

// 1. Check Index Coverage
console.log('📋 Checking Catalog Coverage in index.md:');
for (const file of contentFiles) {
  const relPath = path.relative(wikiDir, file).replace(/\\/g, '/');
  if (!indexContent.includes(relPath)) {
    console.warn(`  ⚠️ Warning: Page not linked in wiki/index.md: ${relPath}`);
    warnings++;
  }
}

// 2. Validate Link Integrity & Map Inbound Links
console.log('\n🔗 Checking Internal Link Integrity:');
const inboundLinks = new Map();
for (const file of contentFiles) {
  inboundLinks.set(file, 0);
}

const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;

for (const file of allWikiFiles) {
  const content = fs.readFileSync(file, 'utf-8');
  const fileDir = path.dirname(file);
  let match;

  while ((match = linkRegex.exec(content)) !== null) {
    const rawLink = match[2].trim();
    // Skip external URLs and anchors
    if (rawLink.startsWith('http://') || rawLink.startsWith('https://') || rawLink.startsWith('#')) {
      continue;
    }

    const cleanLink = rawLink.split('#')[0];
    if (!cleanLink) continue;

    const resolvedPath = path.resolve(fileDir, cleanLink);
    if (!fs.existsSync(resolvedPath)) {
      const relSource = path.relative(rootDir, file).replace(/\\/g, '/');
      console.error(`  ❌ Broken Link in ${relSource} -> ${cleanLink}`);
      errors++;
    } else {
      if (inboundLinks.has(resolvedPath) && !file.endsWith('index.md')) {
        inboundLinks.set(resolvedPath, inboundLinks.get(resolvedPath) + 1);
      }
    }
  }
}

// 3. Orphan Detection
console.log('\n🏝️ Checking for Orphan Pages (pages with 0 cross-references):');
for (const [file, count] of inboundLinks.entries()) {
  if (count === 0) {
    const relPath = path.relative(wikiDir, file).replace(/\\/g, '/');
    console.warn(`  ⚠️ Notice: Page has no cross-references from other wiki pages: ${relPath}`);
  }
}

console.log(`\n--- Lint Summary ---`);
console.log(`Total Pages Scanned: ${allWikiFiles.length}`);
console.log(`Errors: ${errors}`);
console.log(`Warnings: ${warnings}`);

if (errors > 0) {
  console.log('\n❌ Lint check failed.');
  process.exit(1);
} else {
  console.log('\n✅ All internal links verified.');
  process.exit(0);
}
