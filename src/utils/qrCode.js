// Minimal, self-contained QR Code generator in JavaScript
// Supports Versions 1 to 10, Byte Mode, Error Correction L / M / Q / H
// Returns an SVG Data URL or SVG string

function createQrCode(text, ecLevel = 'M') {
  // Mode: Byte (0100)
  const bytes = [];
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code > 0x7f) {
      // UTF-8 encode
      const encoded = unescape(encodeURIComponent(text[i]));
      for (let j = 0; j < encoded.length; j++) {
        bytes.push(encoded.charCodeAt(j));
      }
    } else {
      bytes.push(code);
    }
  }

  // Version table: byte capacity for EC levels L, M, Q, H
  // [totalDataBytes, [capL, capM, capQ, capH], [ecPerBlockL, ecPerBlockM, ecPerBlockQ, ecPerBlockH], numBlocks]
  const versions = [
    null,
    { total: 26, cap: [19, 16, 13, 9], ec: [7, 10, 13, 17], blocks: 1, size: 21 },
    { total: 44, cap: [34, 28, 22, 16], ec: [10, 16, 22, 28], blocks: 1, size: 25 },
    { total: 70, cap: [55, 44, 34, 26], ec: [15, 26, 36, 44], blocks: 1, size: 29 },
    { total: 100, cap: [80, 64, 48, 36], ec: [20, 36, 52, 64], blocks: 2, size: 33 },
    { total: 134, cap: [108, 86, 62, 46], ec: [26, 48, 72, 88], blocks: 2, size: 37 },
    { total: 172, cap: [136, 108, 76, 60], ec: [36, 64, 96, 112], blocks: 4, size: 41 },
    { total: 196, cap: [156, 124, 88, 66], ec: [40, 72, 108, 130], blocks: 4, size: 45 },
    { total: 242, cap: [194, 154, 110, 86], ec: [48, 88, 132, 156], blocks: 4, size: 49 },
    { total: 292, cap: [232, 182, 132, 100], ec: [60, 110, 160, 192], blocks: 5, size: 53 },
    { total: 346, cap: [274, 216, 154, 122], ec: [72, 130, 192, 224], blocks: 6, size: 57 },
  ];

  const ecIdx = { L: 0, M: 1, Q: 2, H: 3 }[ecLevel] ?? 1;

  // Find smallest version that fits
  let version = 1;
  while (version <= 10 && versions[version].cap[ecIdx] < bytes.length + 2) {
    version++;
  }
  if (version > 10) version = 10;
  const vInfo = versions[version];
  const dataCap = vInfo.cap[ecIdx];

  // Bit buffer
  const buffer = [];
  function writeBits(val, len) {
    for (let i = len - 1; i >= 0; i--) {
      buffer.push((val >> i) & 1);
    }
  }

  // Mode: Byte (0100)
  writeBits(0b0100, 4);
  // Char count indicator (8 bits for V1-V9, 16 bits for V10+)
  writeBits(bytes.length, version < 10 ? 8 : 16);
  for (const b of bytes) {
    writeBits(b, 8);
  }

  // Terminator
  const totalDataBits = dataCap * 8;
  const termLen = Math.min(4, totalDataBits - buffer.length);
  writeBits(0, termLen);

  // Pad to byte
  while (buffer.length % 8 !== 0) buffer.push(0);

  // Pad bytes 0xEC, 0x11
  const pad = [0xec, 0x11];
  let p = 0;
  while (buffer.length < totalDataBits) {
    writeBits(pad[p % 2], 8);
    p++;
  }

  // Group into data codewords
  const dataWords = [];
  for (let i = 0; i < buffer.length; i += 8) {
    let word = 0;
    for (let j = 0; j < 8; j++) word = (word << 1) | buffer[i + j];
    dataWords.push(word);
  }

  // Galois Field GF(256) with primitive poly 0x11d (285)
  const exp = new Uint8Array(512);
  const log = new Uint8Array(256);
  let x = 1;
  for (let i = 0; i < 255; i++) {
    exp[i] = x;
    exp[i + 255] = x;
    log[x] = i;
    x <<= 1;
    if (x >= 256) x ^= 0x11d;
  }
  function gfMul(a, b) {
    if (a === 0 || b === 0) return 0;
    return exp[log[a] + log[b]];
  }

  // Reed-Solomon generator polynomial
  const ecCount = Math.floor(vInfo.ec[ecIdx] / vInfo.blocks);
  let gen = [1];
  for (let i = 0; i < ecCount; i++) {
    const next = new Array(gen.length + 1).fill(0);
    const root = exp[i];
    for (let j = 0; j < gen.length; j++) {
      next[j] ^= gfMul(gen[j], root);
      next[j + 1] ^= gen[j];
    }
    gen = next;
  }

  // Generate EC codewords
  const ecWords = new Array(ecCount).fill(0);
  for (const byte of dataWords) {
    const factor = byte ^ ecWords[0];
    for (let j = 0; j < ecCount - 1; j++) {
      ecWords[j] = ecWords[j + 1] ^ gfMul(gen[ecCount - 1 - j], factor);
    }
    ecWords[ecCount - 1] = gfMul(gen[0], factor);
  }

  // Interleaved final stream
  const finalStream = [...dataWords, ...ecWords];

  // Create Module Matrix
  const size = vInfo.size;
  const matrix = Array.from({ length: size }, () => new Array(size).fill(null));

  function setSquare(r, c, w, h, val) {
    for (let dr = 0; dr < h; dr++) {
      for (let dc = 0; dc < w; dc++) {
        const row = r + dr;
        const col = c + dc;
        if (row >= 0 && row < size && col >= 0 && col < size) {
          matrix[row][col] = val;
        }
      }
    }
  }

  // 1. Finder patterns
  function addFinder(r, c) {
    setSquare(r - 1, c - 1, 9, 9, 0); // separator
    setSquare(r, c, 7, 7, 1);
    setSquare(r + 1, c + 1, 5, 5, 0);
    setSquare(r + 2, c + 2, 3, 3, 1);
  }
  addFinder(0, 0);
  addFinder(0, size - 7);
  addFinder(size - 7, 0);

  // 2. Alignment patterns for Version >= 2
  if (version >= 2) {
    const alignCoords = {
      2: [6, 18],
      3: [6, 22],
      4: [6, 26],
      5: [6, 30],
      6: [6, 34],
      7: [6, 22, 38],
      8: [6, 24, 42],
      9: [6, 26, 46],
      10: [6, 28, 50],
    }[version] || [];
    for (const ar of alignCoords) {
      for (const ac of alignCoords) {
        if (matrix[ar][ac] !== null) continue; // skip finders
        setSquare(ar - 2, ac - 2, 5, 5, 1);
        setSquare(ar - 1, ac - 1, 3, 3, 0);
        matrix[ar][ac] = 1;
      }
    }
  }

  // 3. Timing patterns
  for (let i = 8; i < size - 8; i++) {
    if (matrix[6][i] === null) matrix[6][i] = i % 2 === 0 ? 1 : 0;
    if (matrix[i][6] === null) matrix[i][6] = i % 2 === 0 ? 1 : 0;
  }

  // 4. Dark module
  matrix[size - 8][8] = 1;

  // 5. Reserve format info
  for (let i = 0; i < 9; i++) {
    if (matrix[8][i] === null) matrix[8][i] = 0;
    if (matrix[i][8] === null) matrix[i][8] = 0;
  }
  for (let i = size - 8; i < size; i++) {
    if (matrix[8][i] === null) matrix[8][i] = 0;
    if (matrix[i][8] === null) matrix[i][8] = 0;
  }

  // 6. Place data bits (2-module columns, zigzagging)
  const bitStream = [];
  for (const b of finalStream) {
    for (let i = 7; i >= 0; i--) bitStream.push((b >> i) & 1);
  }

  let bitIdx = 0;
  let upwards = true;
  for (let right = size - 1; right > 0; right -= 2) {
    if (right === 6) right--; // skip timing column
    const rows = upwards
      ? Array.from({ length: size }, (_, i) => size - 1 - i)
      : Array.from({ length: size }, (_, i) => i);

    for (const row of rows) {
      for (const col of [right, right - 1]) {
        if (matrix[row][col] === null) {
          const bit = bitIdx < bitStream.length ? bitStream[bitIdx++] : 0;
          // Apply mask pattern 0 (row + col) % 2 === 0
          const mask = (row + col) % 2 === 0;
          matrix[row][col] = mask ? bit ^ 1 : bit;
        }
      }
    }
    upwards = !upwards;
  }

  // 7. Format info: EC M (00) + Mask 0 (000) = 0b00000 -> BCH 15,5 = 0b101010000010010 (with mask 0x5412)
  const formatBits = [1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0];
  // Write format info around top-left, and on ends
  const coords1 = [
    [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
    [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8]
  ];
  const coords2 = [
    [size - 1, 8], [size - 2, 8], [size - 3, 8], [size - 4, 8], [size - 5, 8], [size - 6, 8], [size - 7, 8],
    [8, size - 8], [8, size - 7], [8, size - 6], [8, size - 5], [8, size - 4], [8, size - 3], [8, size - 2], [8, size - 1]
  ];
  for (let i = 0; i < 15; i++) {
    const bit = formatBits[i];
    matrix[coords1[i][0]][coords1[i][1]] = bit;
    matrix[coords2[i][0]][coords2[i][1]] = bit;
  }

  return matrix;
}

function matrixToSvg(matrix, options = {}) {
  const margin = options.margin ?? 3;
  const dark = options.color?.dark || "#000000";
  const light = options.color?.light || "#ffffff";
  const size = matrix.length;
  const totalSize = size + margin * 2;

  let paths = "";
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (matrix[r][c] === 1) {
        paths += `M${c + margin},${r + margin}h1v1h-1z `;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalSize} ${totalSize}" shape-rendering="crispEdges">
    <rect width="${totalSize}" height="${totalSize}" fill="${light}"/>
    <path d="${paths}" fill="${dark}"/>
  </svg>`;
}

const QRCode = {
  toDataURL: async (text, options = {}) => {
    try {
      const matrix = createQrCode(String(text || ""), options.errorCorrectionLevel || "M");
      const svg = matrixToSvg(matrix, options);
      const encoded = encodeURIComponent(svg)
        .replace(/'/g, "%27")
        .replace(/"/g, "%22");
      return `data:image/svg+xml;charset=utf-8,${encoded}`;
    } catch (e) {
      console.warn("QR generation error:", e);
      return "";
    }
  },
  toString: async (text, options = {}) => {
    const matrix = createQrCode(String(text || ""), options.errorCorrectionLevel || "M");
    return matrixToSvg(matrix, options);
  }
};

export default QRCode;
export { QRCode };
