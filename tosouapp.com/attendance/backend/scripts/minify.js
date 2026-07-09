/**
 * Minify static JS/CSS files using esbuild
 * 
 * Usage: node scripts/minify.js
 * 
 * Minifies all .js and .css files in src/static/ IN-PLACE.
 * Run as part of build step before deploy.
 * 
 * Does NOT bundle — preserves dynamic imports and ES module structure.
 */

const { transform } = require('esbuild');
const fs = require('fs');
const path = require('path');

const STATIC_DIR = path.join(__dirname, '../src/static');
const EXTENSIONS = ['.js', '.css'];
const SKIP_DIRS = ['vendor']; // Don't minify vendor libs (already minified)

let totalBefore = 0;
let totalAfter = 0;
let fileCount = 0;

async function processFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (!EXTENSIONS.includes(ext)) return;

  const content = fs.readFileSync(filePath, 'utf8');
  if (content.length < 100) return; // Skip tiny files

  const loader = ext === '.css' ? 'css' : 'js';

  try {
    const result = await transform(content, {
      loader,
      minify: true,
      target: 'es2020',
      // Keep module syntax for dynamic imports
      format: ext === '.js' ? 'esm' : undefined,
    });

    const before = Buffer.byteLength(content);
    const after = Buffer.byteLength(result.code);

    if (after < before) {
      fs.writeFileSync(filePath, result.code);
      totalBefore += before;
      totalAfter += after;
      fileCount++;
    }
  } catch (e) {
    // Some files may have syntax esbuild doesn't understand — skip
    console.warn(`  ⚠️ Skip: ${path.relative(STATIC_DIR, filePath)} (${e.message.slice(0, 60)})`);
  }
}

function walkDir(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.includes(entry.name)) continue;
      files.push(...walkDir(full));
    } else {
      files.push(full);
    }
  }
  return files;
}

async function main() {
  console.log('🔧 Minifying static assets...');
  const files = walkDir(STATIC_DIR);
  console.log(`   Found ${files.length} files`);

  for (const f of files) {
    await processFile(f);
  }

  const savedKB = Math.round((totalBefore - totalAfter) / 1024);
  const pct = totalBefore > 0 ? Math.round((1 - totalAfter / totalBefore) * 100) : 0;
  console.log(`✅ Minified ${fileCount} files`);
  console.log(`   Saved: ${savedKB} KB (${pct}% reduction)`);
}

main().catch(e => { console.error('❌', e); process.exit(1); });
