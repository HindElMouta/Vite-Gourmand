// Usage :
//   node copy-assets.js                     -> lit depuis ./source_images
//   node copy-assets.js /chemin/vers/dossier
//   SRC_DIR=/chemin/vers/dossier node copy-assets.js
//
// Le script accepte soit les noms "longs" (avec timestamp) soit
// directement les noms finaux, ce qui le rend portable Windows / macOS / Linux.

const fs = require('fs');
const path = require('path');

// 1) Dossier source : argument CLI > variable d'env > dossier local "source_images"
const srcDir =
  process.argv[2] ||
  process.env.SRC_DIR ||
  path.join(__dirname, 'source_images');

// 2) Dossier destination : ./assets (à côté de index.html)
const destDir = path.join(__dirname, 'assets');

if (!fs.existsSync(srcDir)) {
  console.error(`❌ Dossier source introuvable : ${srcDir}`);
  console.error(`   Créez-le et placez-y vos images, ou passez le chemin en argument :`);
  console.error(`   node copy-assets.js "/chemin/vers/vos/images"`);
  process.exit(1);
}

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

// Nom final attendu -> liste de noms possibles dans le dossier source
const mappings = {

  'hero_background.png':  ['Julie_Jose.png',       'hero_background_1782313552348.png'],
  'festin_aquitain.png':  ['festin_aquitain.png',  'festin_aquitain_1782313566489.png'],
  'duo_canard.png':       ['duo_canard.png',       'duo_canard_1782313578526.png'],
  'ocean_bordelais.png':  ['ocean_bordelais.png',  'ocean_bordelais_1782313591603.png'],
  'jardin_eden.png':      ['jardin_eden.png',      'jardin_eden_1782313601662.png'],
  'caneles.png':          ['caneles.png',          'caneles_1782313616420.png'],
};

let ok = 0;
let missing = 0;

for (const [destFile, candidates] of Object.entries(mappings)) {
  const found = candidates
    .map((name) => path.join(srcDir, name))
    .find((p) => fs.existsSync(p));

  if (found) {
    fs.copyFileSync(found, path.join(destDir, destFile));
    console.log(`✅ ${path.basename(found)} -> assets/${destFile}`);
    ok++;
  } else {
    console.error(`⚠️  Introuvable dans ${srcDir} : ${destFile} (essayé : ${candidates.join(', ')})`);
    missing++;
  }
}

console.log(`\nTerminé — ${ok} copiée(s), ${missing} manquante(s).`);
process.exit(missing === 0 ? 0 : 1);
