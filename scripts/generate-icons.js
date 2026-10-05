const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const src = path.join(__dirname, '..', 'public', 'icon-512.png');
const outDir = path.join(__dirname, '..', 'extension', 'icons');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

[16, 32, 48, 128].forEach(size => {
  sharp(src)
    .resize(size, size)
    .toFile(path.join(outDir, 'icon' + size + '.png'))
    .then(() => console.log('Created icon' + size + '.png'))
    .catch(err => console.error(err));
});
