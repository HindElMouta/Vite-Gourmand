const fs = require('fs');
const path = require('path');

const srcDir = 'C:\\Users\\hinde\\.gemini\\antigravity\\brain\\e9d162cb-7c31-4c5a-bfcb-81dbd6a0acfa';
const destDir = path.join(__dirname, 'assets');

if (!fs.existsSync(destDir)){
    fs.mkdirSync(destDir, { recursive: true });
}

const mappings = {
    'hero_background_1782313552348.png': 'hero_background.png',
    'festin_aquitain_1782313566489.png': 'festin_aquitain.png',
    'duo_canard_1782313578526.png': 'duo_canard.png',
    'ocean_bordelais_1782313591603.png': 'ocean_bordelais.png',
    'jardin_eden_1782313601662.png': 'jardin_eden.png',
    'caneles_1782313616420.png': 'caneles.png'
};

for (const [srcFile, destFile] of Object.entries(mappings)) {
    const srcPath = path.join(srcDir, srcFile);
    const destPath = path.join(destDir, destFile);
    if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, destPath);
        console.log(`Copied: ${srcFile} -> ${destFile}`);
    } else {
        console.error(`Source file not found: ${srcPath}`);
    }
}
console.log('Asset copy complete.');
