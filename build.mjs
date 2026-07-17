import { readdir, readFile, writeFile, stat, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

function loadEsbuild() {
  const candidates = [import.meta.url, 'C:/Users/Jonathan Paredes/Documents/ControlDB/package.json'];
  for (const base of candidates) {
    try {
      return createRequire(base)('esbuild');
    } catch {}
  }
  return null;
}

const root = dirname(fileURLToPath(import.meta.url));
const coreOrder = [
  'core/dixel.js',
  'core/Utils.js',
  'core/Ticker.js',
  'core/Viewport.js',
  'core/Pointer.js',
  'core/Motion.js',
  'core/SmoothScroll.js',
  'core/ScrollWatch.js',
  'core/Overlays.js',
  'core/Component.js'
];
const scanDirs = ['icons', 'components', 'effects', 'scrollbars', 'shaders'];

async function collect(dir, ext) {
  const found = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return found;
  }
  entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await collect(full, ext)));
    else if (entry.name.endsWith(ext)) found.push(full);
  }
  return found;
}

async function buildCatalog() {
  const catalog = {};
  for (const dir of scanDirs) {
    for (const file of await collect(join(root, dir), '.json')) {
      if (!file.endsWith('manifest.json')) continue;
      const relative = file.slice(root.length + 1).replace(/\\/g, '/');
      const category = relative.replace('/manifest.json', '');
      try {
        catalog[category] = JSON.parse(await readFile(file, 'utf8'));
      } catch (error) {
        throw new Error('Manifest inválido: ' + relative + ' → ' + error.message);
      }
    }
  }
  return 'window.DixelCatalog = ' + JSON.stringify(catalog, null, 2) + ';\n';
}

async function build() {
  const jsParts = [];
  for (const rel of coreOrder) {
    jsParts.push(await readFile(join(root, rel), 'utf8'));
  }
  const cssParts = [await readFile(join(root, 'tokens/tokens.css'), 'utf8')];
  for (const dir of scanDirs) {
    const base = join(root, dir);
    for (const file of await collect(base, '.js')) jsParts.push(await readFile(file, 'utf8'));
    for (const file of await collect(base, '.css')) cssParts.push(await readFile(file, 'utf8'));
  }
  await mkdir(join(root, 'dist'), { recursive: true });
  await writeFile(join(root, 'dist/dixel.js'), jsParts.join('\n;\n'));
  await writeFile(join(root, 'dist/dixel.css'), cssParts.join('\n'));
  await writeFile(join(root, 'dist/catalog.js'), await buildCatalog());
  const jsSize = (await stat(join(root, 'dist/dixel.js'))).size;
  const cssSize = (await stat(join(root, 'dist/dixel.css'))).size;
  console.log('dist/dixel.js ' + (jsSize / 1024).toFixed(1) + ' kB · dist/dixel.css ' + (cssSize / 1024).toFixed(1) + ' kB');
  const esbuild = loadEsbuild();
  if (!esbuild) return;
  const js = await readFile(join(root, 'dist/dixel.js'), 'utf8');
  const css = await readFile(join(root, 'dist/dixel.css'), 'utf8');
  const minJs = await esbuild.transform(js, { minify: true, target: 'es2020' });
  const minCss = await esbuild.transform(css, { minify: true, loader: 'css' });
  await writeFile(join(root, 'dist/dixel.min.js'), minJs.code);
  await writeFile(join(root, 'dist/dixel.min.css'), minCss.code);
  console.log('dist/dixel.min.js ' + (minJs.code.length / 1024).toFixed(1) + ' kB · dist/dixel.min.css ' + (minCss.code.length / 1024).toFixed(1) + ' kB');
}

build();
