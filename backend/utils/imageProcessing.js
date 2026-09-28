const sharp = require('sharp');

const MAX_INPUT_PIXELS = 25_000_000;

const isRemovableBackgroundPixel = (data, offset) => {
  const red = data[offset];
  const green = data[offset + 1];
  const blue = data[offset + 2];
  const alpha = data[offset + 3];
  const darkest = Math.min(red, green, blue);
  const lightest = Math.max(red, green, blue);

  return alpha > 0 && darkest >= 210 && lightest - darkest <= 36;
};

const removeLightEdgeBackground = async (input) => {
  const { data, info } = await sharp(input, {
    animated: false,
    limitInputPixels: MAX_INPUT_PIXELS,
  })
    .rotate()
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  if (channels !== 4) throw new Error('Không thể xử lý kênh màu của ảnh.');

  const pixelCount = width * height;
  const visited = new Uint8Array(pixelCount);
  const queue = new Int32Array(pixelCount);
  let head = 0;
  let tail = 0;

  const enqueue = (pixelIndex) => {
    if (visited[pixelIndex]) return;
    const offset = pixelIndex * channels;
    if (!isRemovableBackgroundPixel(data, offset)) return;
    visited[pixelIndex] = 1;
    queue[tail] = pixelIndex;
    tail += 1;
  };

  for (let x = 0; x < width; x += 1) {
    enqueue(x);
    enqueue((height - 1) * width + x);
  }
  for (let y = 1; y < height - 1; y += 1) {
    enqueue(y * width);
    enqueue(y * width + width - 1);
  }

  while (head < tail) {
    const pixelIndex = queue[head];
    head += 1;
    const x = pixelIndex % width;
    const y = Math.floor(pixelIndex / width);
    const offset = pixelIndex * channels;
    const darkest = Math.min(data[offset], data[offset + 1], data[offset + 2]);
    const featheredAlpha = Math.round(data[offset + 3] * ((255 - darkest) / 45));
    data[offset + 3] = Math.max(0, Math.min(data[offset + 3], featheredAlpha));

    if (x > 0) enqueue(pixelIndex - 1);
    if (x + 1 < width) enqueue(pixelIndex + 1);
    if (y > 0) enqueue(pixelIndex - width);
    if (y + 1 < height) enqueue(pixelIndex + width);
  }

  return sharp(data, { raw: info })
    .png({ compressionLevel: 9 })
    .toBuffer();
};

module.exports = { removeLightEdgeBackground };
