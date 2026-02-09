const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const SPRITES_DIR = path.join(__dirname, '..', 'client', 'public', 'sprites');

const MONEY_ICONS = [
  'money-shell', 'money-beads', 'money-goldbar', 'money-coin', 'money-raistone',
  'money-cattle', 'money-salt', 'money-teabrick', 'money-feather', 'money-cocoa',
  'money-banknote', 'money-creditcard', 'money-moderncoins', 'money-bitcoin',
  'money-yen', 'money-yuan', 'money-euro',
  'money-chicken', 'money-fish', 'money-silvercoins', 'money-wheat'
];

function colorDistance(r1, g1, b1, r2, g2, b2) {
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

async function processIcon(name) {
  const filePath = path.join(SPRITES_DIR, `${name}.png`);
  if (!fs.existsSync(filePath)) {
    console.log(`  SKIP: ${name}.png not found`);
    return;
  }

  const image = sharp(filePath);
  const metadata = await image.metadata();
  const { width, height } = metadata;
  const { data, info } = await image.raw().ensureAlpha().toBuffer({ resolveWithObject: true });
  const channels = info.channels;

  const bgR = data[0];
  const bgG = data[1];
  const bgB = data[2];
  console.log(`  ${name}: bg color = rgb(${bgR}, ${bgG}, ${bgB})`);

  const isRemoved = new Uint8Array(width * height);
  const BLUE_TOLERANCE = 90;
  const WHITE_THRESHOLD = 200;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const distToBg = colorDistance(r, g, b, bgR, bgG, bgB);
      if (distToBg < BLUE_TOLERANCE) {
        isRemoved[y * width + x] = 1;
      }
    }
  }

  const EDGE_BAND = Math.floor(Math.min(width, height) * 0.15);

  function isInEdgeBand(x, y) {
    return x < EDGE_BAND || x >= width - EDGE_BAND || y < EDGE_BAND || y >= height - EDGE_BAND;
  }

  function isLightPixel(r, g, b) {
    return r >= WHITE_THRESHOLD && g >= WHITE_THRESHOLD && b >= WHITE_THRESHOLD;
  }

  function isLightishPixel(r, g, b) {
    const brightness = (r + g + b) / 3;
    return brightness > 170 && Math.abs(r - g) < 40 && Math.abs(g - b) < 40;
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const pos = y * width + x;
        if (isRemoved[pos]) continue;
        const idx = pos * channels;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        if (isLightPixel(r, g, b) || (isInEdgeBand(x, y) && isLightishPixel(r, g, b))) {
          const neighbors = [
            pos - 1, pos + 1,
            pos - width, pos + width,
            pos - width - 1, pos - width + 1,
            pos + width - 1, pos + width + 1
          ];
          for (const n of neighbors) {
            if (n >= 0 && n < width * height && isRemoved[n]) {
              isRemoved[pos] = 1;
              changed = true;
              break;
            }
          }
        }
      }
    }
  }

  const BOTTOM_BAND = Math.floor(height * 0.12);
  for (let y = height - BOTTOM_BAND; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pos = y * width + x;
      if (isRemoved[pos]) continue;
      const idx = pos * channels;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const brightness = (r + g + b) / 3;
      if (brightness > 150 && Math.abs(r - g) < 50 && Math.abs(g - b) < 50) {
        let bgNeighbors = 0;
        const neighbors = [pos - 1, pos + 1, pos - width, pos + width];
        for (const n of neighbors) {
          if (n >= 0 && n < width * height && isRemoved[n]) bgNeighbors++;
        }
        if (bgNeighbors >= 1) {
          isRemoved[pos] = 1;
        }
      }
    }
  }

  const TRANSITION_TOLERANCE = 50;
  changed = true;
  while (changed) {
    changed = false;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const pos = y * width + x;
        if (isRemoved[pos]) continue;
        const idx = pos * channels;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const distToBg = colorDistance(r, g, b, bgR, bgG, bgB);
        if (distToBg < TRANSITION_TOLERANCE && b > r * 0.8) {
          let bgNeighborCount = 0;
          const neighbors = [pos - 1, pos + 1, pos - width, pos + width];
          for (const n of neighbors) {
            if (n >= 0 && n < width * height && isRemoved[n]) bgNeighborCount++;
          }
          if (bgNeighborCount >= 2) {
            isRemoved[pos] = 1;
            changed = true;
          }
        }
      }
    }
  }

  const output = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const srcIdx = i * channels;
    const dstIdx = i * 4;
    if (isRemoved[i]) {
      output[dstIdx] = 0;
      output[dstIdx + 1] = 0;
      output[dstIdx + 2] = 0;
      output[dstIdx + 3] = 0;
    } else {
      output[dstIdx] = data[srcIdx];
      output[dstIdx + 1] = data[srcIdx + 1];
      output[dstIdx + 2] = data[srcIdx + 2];
      output[dstIdx + 3] = 255;
    }
  }

  let minX = width, minY = height, maxX = 0, maxY = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!isRemoved[y * width + x]) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  const pad = 2;
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(width - 1, maxX + pad);
  maxY = Math.min(height - 1, maxY + pad);

  const cropW = maxX - minX + 1;
  const cropH = maxY - minY + 1;

  console.log(`  ${name}: content box = (${minX},${minY}) to (${maxX},${maxY}), size ${cropW}x${cropH}`);

  const outputPath = path.join(SPRITES_DIR, `${name}.png`);
  await sharp(output, { raw: { width, height, channels: 4 } })
    .extract({ left: minX, top: minY, width: cropW, height: cropH })
    .png()
    .toFile(outputPath + '.tmp');

  fs.renameSync(outputPath + '.tmp', outputPath);
  console.log(`  ${name}: saved ${cropW}x${cropH} transparent PNG`);
}

async function main() {
  console.log('Processing money icons...');
  for (const name of MONEY_ICONS) {
    try {
      await processIcon(name);
    } catch (err) {
      console.error(`  ERROR processing ${name}:`, err.message);
    }
  }
  console.log('Done!');
}

main();
