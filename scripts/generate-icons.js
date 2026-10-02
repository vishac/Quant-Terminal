import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createCRC32Table() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c;
  }
  return table;
}

const crcTable = createCRC32Table();
function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  }
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function makeChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(12 + len);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const typeAndData = chunk.subarray(4, 8 + len);
  chunk.writeUInt32BE(crc32(typeAndData), 8 + len);
  return chunk;
}

function generatePNG(width, height, isMaskable = false) {
  const bytesPerPixel = 4; // RGBA
  const rawData = Buffer.alloc(height * (1 + width * bytesPerPixel));
  
  const cx = width / 2;
  const cy = height / 2;
  const radius = width * (isMaskable ? 0.38 : 0.44);

  let offset = 0;
  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0; // Filter type: None
    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Deep obsidian space background
      let r = 6, g = 10, b = 22, a = 255;

      // Outer glowing ring
      if (Math.abs(dist - radius) < 3) {
        r = 0; g = 240; b = 255; a = 240;
      } else if (dist < radius) {
        // Inner gradient
        const t = dist / radius;
        r = Math.floor(6 + t * 4);
        g = Math.floor(14 + t * 6);
        b = Math.floor(32 + t * 10);

        // Core radar circle
        if (Math.abs(dist - radius * 0.6) < 2) {
          r = 0; g = 200; b = 255; a = 180;
        } else if (Math.abs(dist - radius * 0.3) < 2) {
          r = 16; g = 185; b = 129; a = 220;
        } else if (dist < radius * 0.18) {
          // Central core pulse
          r = 0; g = 240; b = 255; a = 255;
        }

        // Crosshair reticle lines
        if ((Math.abs(dx) < 1.5 && dist < radius * 0.85) || 
            (Math.abs(dy) < 1.5 && dist < radius * 0.85)) {
          r = 0; g = 220; b = 255; a = 120;
        }
      }

      rawData[offset++] = r;
      rawData[offset++] = g;
      rawData[offset++] = b;
      rawData[offset++] = a;
    }
  }

  // Header chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // Bit depth
  ihdr.writeUInt8(6, 9); // Color type: RGBA
  ihdr.writeUInt8(0, 10); // Compression method
  ihdr.writeUInt8(0, 11); // Filter method
  ihdr.writeUInt8(0, 12); // Interlace method

  const compressedData = zlib.deflateSync(rawData);
  const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  
  return Buffer.concat([
    sig,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressedData),
    makeChunk('IEND', Buffer.alloc(0))
  ]);
}

const outDir = path.resolve('public');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Generate PWA icons
fs.writeFileSync(path.join(outDir, 'pwa-192x192.png'), generatePNG(192, 192, false));
fs.writeFileSync(path.join(outDir, 'pwa-512x512.png'), generatePNG(512, 512, false));
fs.writeFileSync(path.join(outDir, 'pwa-maskable-512x512.png'), generatePNG(512, 512, true));
fs.writeFileSync(path.join(outDir, 'apple-touch-icon.png'), generatePNG(180, 180, false));
fs.writeFileSync(path.join(outDir, 'favicon.ico'), generatePNG(32, 32, false));

console.log('All PWA icon assets generated successfully in public/');
