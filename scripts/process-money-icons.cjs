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
  const channels = info.channels; // 4 (RGBA)

  // Step 1: Sample the blue background color from the corner pixel (top-left)
  const bgR = data[0];
  const bgG = data[1];
  const bgB = data[2];
  console.log(`  ${name}: bg color = rgb(${bgR}, ${bgG}, ${bgB})`);

  // Step 2: Find the bounding box of non-background content
  // First pass: identify which pixels are "background-like" (blue) or "white edge"
  const isBackground = new Uint8Array(width * height);
  const BLUE_TOLERANCE = 90;
  const WHITE_THRESHOLD = 230; // pixels where R,G,B are all above this = white

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      const distToBg = colorDistance(r, g, b, bgR, bgG, bgB);
      if (distToBg < BLUE_TOLERANCE) {
        isBackground[y * width + x] = 1;
      }
    }
  }

  // Step 3: Trim white edges - scan inward from each edge and mark white/near-white pixels
  // that are adjacent to background as also background
  // Scan from all 4 edges inward
  const isWhiteEdge = new Uint8Array(width * height);

  function markWhiteEdges() {
    let changed = true;
    while (changed) {
      changed = false;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const pos = y * width + x;
          if (isBackground[pos] || isWhiteEdge[pos]) continue;

          const idx = pos * channels;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];

          // Check if this is a white/near-white pixel
          if (r >= WHITE_THRESHOLD && g >= WHITE_THRESHOLD && b >= WHITE_THRESHOLD) {
            // Check if any neighbor is background or white edge
            const neighbors = [
              pos - 1, pos + 1,
              pos - width, pos + width,
              pos - width - 1, pos - width + 1,
              pos + width - 1, pos + width + 1
            ];
            for (const n of neighbors) {
              if (n >= 0 && n < width * height && (isBackground[n] || isWhiteEdge[n])) {
                isWhiteEdge[pos] = 1;
                changed = true;
                break;
              }
            }
          }
        }
      }
    }
  }

  markWhiteEdges();

  // Step 4: Also handle light-blue transitional pixels near the background
  // These are anti-aliasing pixels between the object and the blue background
  const TRANSITION_TOLERANCE = 50;
  function markTransitionPixels() {
    let changed = true;
    while (changed) {
      changed = false;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const pos = y * width + x;
          if (isBackground[pos] || isWhiteEdge[pos]) continue;

          const idx = pos * channels;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];

          // Check if this pixel is blue-ish (b > r && b > g) and close to background
          const distToBg = colorDistance(r, g, b, bgR, bgG, bgB);
          if (distToBg < TRANSITION_TOLERANCE && b > r * 0.8) {
            // Check if surrounded mostly by background/edge pixels
            let bgNeighborCount = 0;
            const neighbors = [pos - 1, pos + 1, pos - width, pos + width];
            for (const n of neighbors) {
              if (n >= 0 && n < width * height && (isBackground[n] || isWhiteEdge[n])) {
                bgNeighborCount++;
              }
            }
            if (bgNeighborCount >= 2) {
              isBackground[pos] = 1;
              changed = true;
            }
          }
        }
      }
    }
  }

  markTransitionPixels();

  // Step 5: Create output buffer with transparency
  const output = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const srcIdx = i * channels;
    const dstIdx = i * 4;
    if (isBackground[i] || isWhiteEdge[i]) {
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

  // Step 6: Find bounding box of remaining content
  let minX = width, minY = height, maxX = 0, maxY = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pos = y * width + x;
      if (!isBackground[pos] && !isWhiteEdge[pos]) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  // Add a small padding
  const pad = 2;
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(width - 1, maxX + pad);
  maxY = Math.min(height - 1, maxY + pad);

  const cropW = maxX - minX + 1;
  const cropH = maxY - minY + 1;

  console.log(`  ${name}: content box = (${minX},${minY}) to (${maxX},${maxY}), size ${cropW}x${cropH}`);

  // Step 7: Extract cropped region and save
  const outputPath = path.join(SPRITES_DIR, `${name}.png`);
  await sharp(output, { raw: { width, height, channels: 4 } })
    .extract({ left: minX, top: minY, width: cropW, height: cropH })
    .png()
    .toFile(outputPath + '.tmp');

  // Replace original
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
