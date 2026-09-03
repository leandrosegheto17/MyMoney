// Gera ícones PNG placeholder (quadrado sólido com "M" central) para o manifest PWA.
// Script utilitário de build, não faz parte do bundle de produção.
import { writeFileSync, mkdirSync } from "node:fs";
import { deflateSync } from "node:zlib";

const PRIMARY = [0x25, 0x63, 0xeb]; // #2563EB, color.primary (UX-SPEC 3.1)
const WHITE = [0xff, 0xff, 0xff];

function crc32(buf) {
  let c;
  const table = crc32.table ?? (crc32.table = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })());
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

// Desenha um quadrado com fundo primary e um "M" branco simples desenhado por blocos,
// suficiente como placeholder de identidade visual até o UX/UI fornecer arte final.
function drawM(size, x, y) {
  // Grade 5x7 representando a letra "M", escalada para o tamanho do ícone.
  const glyph = [
    "1...1",
    "11.11",
    "1.1.1",
    "1...1",
    "1...1",
    "1...1",
    "1...1",
  ];
  const scale = Math.floor((size * 0.5) / 5);
  const offsetX = x + Math.floor((size * 0.5 - scale * 5) / 2) + Math.floor(size * 0.25);
  const offsetY = y + Math.floor((size * 0.5 - scale * 7) / 2) + Math.floor(size * 0.25);
  const pixels = [];
  for (let row = 0; row < glyph.length; row++) {
    for (let col = 0; col < glyph[row].length; col++) {
      if (glyph[row][col] === "1") {
        for (let sy = 0; sy < scale; sy++) {
          for (let sx = 0; sx < scale; sx++) {
            pixels.push([offsetX + col * scale + sx, offsetY + row * scale + sy]);
          }
        }
      }
    }
  }
  return pixels;
}

function generatePng(size, { maskable = false } = {}) {
  const raw = Buffer.alloc((size * (1 + size * 4)));
  const litPixels = new Set(drawM(size, 0, 0).map(([px, py]) => `${px},${py}`));
  // Ícone maskable: mantém "safe zone" (respiro de ~10%) preenchida só com a cor primária.
  const safeMargin = maskable ? Math.floor(size * 0.1) : 0;

  for (let yy = 0; yy < size; yy++) {
    let offset = yy * (1 + size * 4);
    raw[offset] = 0; // filtro "None"
    offset += 1;
    for (let xx = 0; xx < size; xx++) {
      const inSafe = xx >= safeMargin && xx < size - safeMargin && yy >= safeMargin && yy < size - safeMargin;
      const isGlyph = inSafe && litPixels.has(`${xx},${yy}`);
      const rgb = isGlyph ? WHITE : PRIMARY;
      raw[offset++] = rgb[0];
      raw[offset++] = rgb[1];
      raw[offset++] = rgb[2];
      raw[offset++] = 255;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const idat = deflateSync(raw);

  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

mkdirSync(new URL("../public/icons", import.meta.url), { recursive: true });

const targets = [
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
  { name: "icon-maskable-512.png", size: 512, maskable: true },
  { name: "apple-touch-icon.png", size: 180 },
];

for (const t of targets) {
  const png = generatePng(t.size, { maskable: t.maskable });
  writeFileSync(new URL(`../public/icons/${t.name}`, import.meta.url), png);
  console.log(`generated public/icons/${t.name} (${t.size}x${t.size})`);
}
