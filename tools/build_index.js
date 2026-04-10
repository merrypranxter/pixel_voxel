#!/usr/bin/env node
/**
 * tools/build_index.js
 *
 * Scans db/entries/**\/*.yaml, validates each entry against the schema,
 * and emits db/indices/entries.json (full index) + db/indices/tags.json
 * (inverted tag index).
 *
 * Usage:
 *   node tools/build_index.js
 *   node tools/build_index.js --validate-only
 *   node tools/build_index.js --out db/indices/entries.json
 *
 * TODO: install dependencies with:  npm install js-yaml glob
 */

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------
const fs   = require('fs');
const path = require('path');

// TODO: replace stubs below with real implementations once dependencies are
//       installed.  Run:  npm install js-yaml glob

// Stub: yaml parser (replace with `require('js-yaml')`)
const yaml = {
  load: (str) => {
    // TODO: return js-yaml.load(str);
    throw new Error('js-yaml not installed. Run: npm install js-yaml');
  }
};

// Stub: glob (replace with `require('glob').globSync`)
const globSync = (pattern) => {
  // TODO: return require('glob').globSync(pattern);
  throw new Error('glob not installed. Run: npm install glob');
};

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const ROOT      = path.resolve(__dirname, '..');
const ENTRIES_GLOB = path.join(ROOT, 'db', 'entries', '**', '*.yaml');
const OUT_ENTRIES  = path.join(ROOT, 'db', 'indices', 'entries.json');
const OUT_TAGS     = path.join(ROOT, 'db', 'indices', 'tags.json');
const SCHEMA_PATH  = path.join(ROOT, 'db', '_schema', 'entry.schema.yaml');

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

/**
 * Minimal validation: check required fields exist.
 * @param {object} entry - Parsed YAML object
 * @param {string} filePath - Source file path (for error messages)
 * @returns {string[]} Array of error messages (empty = valid)
 */
function validateEntry(entry, filePath) {
  const errors = [];
  const required = ['id', 'type', 'name', 'summary', 'tags', 'version', 'created_at'];

  for (const field of required) {
    if (entry[field] === undefined || entry[field] === null) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // id format check: pxv.<type>.<slug>.v<int>
  if (entry.id && !/^pxv\.[a-z_]+\.[a-z_0-9]+\.v\d+$/.test(entry.id)) {
    errors.push(`id format invalid: "${entry.id}" — expected pxv.<type>.<slug>.v<int>`);
  }

  // type check
  const validTypes = [
    'style', 'technique', 'palette', 'pipeline', 'motif',
    'composition', 'animation', 'shader', 'voxel', 'reference'
  ];
  if (entry.type && !validTypes.includes(entry.type)) {
    errors.push(`Unknown type: "${entry.type}" — valid types: ${validTypes.join(', ')}`);
  }

  // created_at format
  if (entry.created_at && !/^\d{4}-\d{2}-\d{2}$/.test(String(entry.created_at))) {
    errors.push(`created_at format invalid: "${entry.created_at}" — expected YYYY-MM-DD`);
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Tag index builder
// ---------------------------------------------------------------------------

/**
 * Build an inverted tag index: { axis: { value: [entry_id, ...] } }
 * @param {object[]} entries
 * @returns {object}
 */
function buildTagIndex(entries) {
  const index = {};

  for (const entry of entries) {
    if (!entry.tags || typeof entry.tags !== 'object') continue;

    for (const [axis, values] of Object.entries(entry.tags)) {
      if (!index[axis]) index[axis] = {};
      const list = Array.isArray(values) ? values : [values];
      for (const value of list) {
        if (!index[axis][value]) index[axis][value] = [];
        index[axis][value].push(entry.id);
      }
    }
  }

  return index;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const args = process.argv.slice(2);
  const validateOnly = args.includes('--validate-only');

  console.log('pixel_voxel database index builder');
  console.log('====================================');

  // TODO: Once js-yaml and glob are installed, remove the try/catch and
  //       uncomment the real implementation below.

  let files;
  try {
    files = globSync(ENTRIES_GLOB);
  } catch (err) {
    console.error('\n[ERROR]', err.message);
    console.error('Hint: run  npm install js-yaml glob  from the repo root first.\n');
    process.exit(1);
  }

  console.log(`Found ${files.length} entry file(s).\n`);

  const entries = [];
  let errorCount = 0;

  for (const file of files.sort()) {
    const relPath = path.relative(ROOT, file);
    let entry;

    try {
      const raw = fs.readFileSync(file, 'utf8');
      entry = yaml.load(raw);
    } catch (err) {
      console.error(`[PARSE ERROR] ${relPath}: ${err.message}`);
      errorCount++;
      continue;
    }

    const errors = validateEntry(entry, file);
    if (errors.length > 0) {
      console.error(`[INVALID] ${relPath}:`);
      for (const e of errors) console.error(`  - ${e}`);
      errorCount++;
    } else {
      console.log(`[OK] ${relPath}  (${entry.id})`);
      entries.push(entry);
    }
  }

  console.log(`\n${entries.length} valid entries, ${errorCount} errors.`);

  if (validateOnly) {
    console.log('(--validate-only: skipping index write)');
    process.exit(errorCount > 0 ? 1 : 0);
  }

  if (errorCount > 0) {
    console.error('\nAborting index write due to validation errors.');
    process.exit(1);
  }

  // Write entries index
  fs.mkdirSync(path.dirname(OUT_ENTRIES), { recursive: true });
  fs.writeFileSync(
    OUT_ENTRIES,
    JSON.stringify({ generated_at: new Date().toISOString(), entries }, null, 2),
    'utf8'
  );
  console.log(`\nWrote entries index: ${OUT_ENTRIES}`);

  // Write tag index
  const tagIndex = buildTagIndex(entries);
  fs.writeFileSync(
    OUT_TAGS,
    JSON.stringify({ generated_at: new Date().toISOString(), tags: tagIndex }, null, 2),
    'utf8'
  );
  console.log(`Wrote tag index:     ${OUT_TAGS}`);

  console.log('\nDone.');
}

main();
