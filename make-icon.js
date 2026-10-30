const sharp = require('sharp');
const path = require('path');

const input = path.join(__dirname, 'public', 'icons', 'app-icon.jpg');

sharp(input)
  .resize(192, 192)
  .png()
  .toFile(path.join(__dirname, 'public', 'icons', 'app-icon-192.png'))
  .then(() => console.log('192x192 done'))
  .then(() =>
    sharp(input)
      .resize(512, 512)
      .png()
      .toFile(path.join(__dirname, 'public', 'icons', 'app-icon-512.png'))
  )
  .then(() => console.log('512x512 done'))
  .catch(e => console.error(e));