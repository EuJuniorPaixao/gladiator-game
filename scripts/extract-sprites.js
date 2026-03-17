const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function extractFrames(inputPath, outputDir, frameWidth, frameHeight, frames) {
  fs.mkdirSync(outputDir, { recursive: true });
  const img = sharp(inputPath);
  const meta = await img.metadata();
  const cols = Math.floor(meta.width / frameWidth);

  for (const { name, col, row } of frames) {
    const left = col * frameWidth;
    const top = row * frameHeight;
    await sharp(inputPath)
      .extract({ left, top, width: frameWidth, height: frameHeight })
      .png()
      .toFile(path.join(outputDir, name + '.png'));
    console.log('Extracted: ' + name);
  }
}

async function main() {
  // Gladiator: 8 cols x 3 rows, frameWidth=352, frameHeight=512
  await extractFrames(
    'public/assets/sprites/player/gladiator-sprite.png',
    'public/assets/sprites/player/frames',
    352, 512,
    [
      { name: 'gladiator-idle-0', col: 0, row: 0 },
      { name: 'gladiator-idle-1', col: 1, row: 0 },
      { name: 'gladiator-idle-2', col: 2, row: 0 },
      { name: 'gladiator-idle-3', col: 3, row: 0 },
      { name: 'gladiator-run-0', col: 0, row: 1 },
      { name: 'gladiator-run-1', col: 1, row: 1 },
      { name: 'gladiator-run-2', col: 2, row: 1 },
      { name: 'gladiator-run-3', col: 3, row: 1 },
      { name: 'gladiator-run-4', col: 4, row: 1 },
      { name: 'gladiator-run-5', col: 5, row: 1 },
      { name: 'gladiator-run-6', col: 6, row: 1 },
      { name: 'gladiator-run-7', col: 7, row: 1 },
      { name: 'gladiator-jump-0', col: 0, row: 2 },
      { name: 'gladiator-jump-1', col: 1, row: 2 },
      { name: 'gladiator-jump-2', col: 2, row: 2 },
    ]
  );

  // Bear: 8 cols x 3 rows, frameWidth=352, frameHeight=512
  await extractFrames(
    'public/assets/sprites/enemies/bear-enemy-sprite.png',
    'public/assets/sprites/enemies/bear-frames',
    352, 512,
    [
      { name: 'bear-idle-0', col: 0, row: 0 },
      { name: 'bear-idle-1', col: 1, row: 0 },
      { name: 'bear-idle-2', col: 2, row: 0 },
      { name: 'bear-walk-0', col: 0, row: 1 },
      { name: 'bear-walk-1', col: 1, row: 1 },
      { name: 'bear-walk-2', col: 2, row: 1 },
      { name: 'bear-walk-3', col: 3, row: 1 },
      { name: 'bear-walk-4', col: 4, row: 1 },
      { name: 'bear-walk-5', col: 5, row: 1 },
    ]
  );

  // Ghost: 6 cols x 4 rows, frameWidth=469, frameHeight=384
  await extractFrames(
    'public/assets/sprites/enemies/fomo-ghost-sprite.png',
    'public/assets/sprites/enemies/ghost-frames',
    469, 384,
    [
      { name: 'ghost-float-0', col: 0, row: 0 },
      { name: 'ghost-float-1', col: 1, row: 0 },
      { name: 'ghost-float-2', col: 2, row: 0 },
      { name: 'ghost-float-3', col: 3, row: 0 },
      { name: 'ghost-float-4', col: 4, row: 0 },
      { name: 'ghost-float-5', col: 5, row: 0 },
    ]
  );

  // Collectibles: 4 cols x 2 rows, frameWidth=704, frameHeight=768
  await extractFrames(
    'public/assets/sprites/collectibles/collectibles-items.png',
    'public/assets/sprites/collectibles/frames',
    704, 768,
    [
      { name: 'coin-dollar', col: 0, row: 0 },
      { name: 'coin-gold', col: 1, row: 0 },
      { name: 'coin-btc', col: 2, row: 0 },
      { name: 'coin-wings', col: 3, row: 0 },
    ]
  );

  console.log('All frames extracted!');
}

main().catch(console.error);
