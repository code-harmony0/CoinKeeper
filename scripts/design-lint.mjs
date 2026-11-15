#!/usr/bin/env node
/**
 * Reports design-system violations in the lite app (DESIGN.md §11):
 *   - raw hex colours (use specTheme tokens)
 *   - fontSize outside the type scale
 *   - borderRadius outside the radius scale (values <= 6 are allowed for bars)
 *   - fontFamily other than Satoshi
 * Usage: node scripts/design-lint.mjs [--strict] [paths...]
 * --strict exits 1 on any violation, for CI once the migration is done.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const strict = args.includes('--strict');
const roots = args.filter(a => !a.startsWith('--'));
const targets = roots.length
  ? roots
  : ['src/screens/user', 'src/components', 'src/features'];

const FONT_SIZES = new Set([44, 28, 20, 16, 14, 12]);
const RADII = new Set([8, 12, 16, 24, 999]);
const SKIP = /(__tests__|\/anim\/|\/theme\/|chitfund|\.test\.)/;

const walk = dir => {
  let out = [];
  let entries = [];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out = out.concat(walk(full));
    else if (/\.tsx?$/.test(name) && !SKIP.test(full)) out.push(full);
  }
  return out;
};

const rules = [
  ['hex', /['"]#[0-9A-Fa-f]{3,8}['"]/g, () => true],
  ['fontSize', /fontSize:\s*(\d+)/g, m => !FONT_SIZES.has(+m[1])],
  [
    'radius',
    /borderRadius:\s*(\d+)/g,
    m => +m[1] > 6 && !RADII.has(+m[1]),
  ],
  ['font', /fontFamily:\s*'(?!Satoshi)([A-Za-z-]+)/g, () => true],
];

const totals = {};
const perFile = [];
for (const file of targets.flatMap(walk)) {
  const text = readFileSync(file, 'utf8');
  const found = {};
  for (const [name, re, bad] of rules) {
    for (const m of text.matchAll(re)) {
      if (bad(m)) found[name] = (found[name] ?? 0) + 1;
    }
  }
  const sum = Object.values(found).reduce((a, b) => a + b, 0);
  if (sum) perFile.push({ file, found, sum });
  for (const [k, v] of Object.entries(found)) totals[k] = (totals[k] ?? 0) + v;
}

perFile.sort((a, b) => b.sum - a.sum);
console.log(`design-lint: ${perFile.length} files with violations`);
console.log('totals:', totals);
for (const { file, found, sum } of perFile.slice(0, 15)) {
  console.log(`${String(sum).padStart(4)}  ${file}  ${JSON.stringify(found)}`);
}
process.exit(strict && perFile.length ? 1 : 0);
