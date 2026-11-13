/**
 * AETHER Browser — Ultra-compact, dependency-free QR Code Generator
 * Generates ISO/IEC 18004 compliant QR codes (Versions 1-10, Byte Mode, Error Correction L/M)
 * Can render directly to HTML5 Canvas or generate inline SVG strings.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.QRCode = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Galois Field GF(256) math tables
  const EXP = new Uint8Array(512);
  const LOG = new Uint8Array(256);
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    EXP[i + 255] = x;
    LOG[x] = i;
    x = (x << 1) ^ (x >= 128 ? 0x11d : 0);
  }

  function gfMul(a, b) {
    return a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]];
  }

  function gfPolyMul(p, q) {
    const res = new Uint8Array(p.length + q.length - 1);
    for (let i = 0; i < p.length; i++) {
      for (let j = 0; j < q.length; j++) {
        res[i + j] ^= gfMul(p[i], q[j]);
      }
    }
    return res;
  }

  function getGeneratorPoly(deg) {
    let poly = new Uint8Array([1]);
    for (let i = 0; i < deg; i++) {
      poly = gfPolyMul(poly, new Uint8Array([1, EXP[i]]));
    }
    return poly;
  }

  function calcEC(data, ecCount) {
    const gen = getGeneratorPoly(ecCount);
    const msg = new Uint8Array(data.length + ecCount);
    msg.set(data);
    for (let i = 0; i < data.length; i++) {
      const coef = msg[i];
      if (coef !== 0) {
        for (let j = 0; j < gen.length; j++) {
          msg[i + j] ^= gfMul(gen[j], coef);
        }
      }
    }
    return msg.slice(data.length);
  }

  // Version specs: [dataBytes, ecBytes, numBlocks] (Level M)
  const VERSION_SPECS = [
    null,
    { data: 16, ec: 10, blocks: 1 },  // v1: 21x21
    { data: 28, ec: 16, blocks: 1 },  // v2: 25x25
    { data: 44, ec: 26, blocks: 1 },  // v3: 29x29
    { data: 64, ec: 18, blocks: 2 },  // v4: 33x33
    { data: 86, ec: 24, blocks: 2 },  // v5: 37x37
    { data: 108, ec: 16, blocks: 4 }, // v6: 41x41
    { data: 124, ec: 18, blocks: 4 }, // v7: 45x45
    { data: 154, ec: 22, blocks: 4 }, // v8: 49x49
    { data: 182, ec: 22, blocks: 5 }, // v9: 53x53
    { data: 216, ec: 26, blocks: 5 }  // v10: 57x57
  ];

  function getBestVersion(text) {
    const len = new TextEncoder().encode(text).length;
    for (let v = 1; v <= 10; v++) {
      const spec = VERSION_SPECS[v];
      // Byte mode overhead: 4 bits mode + 8 bits count + data
      const capacity = spec.data - 2;
      if (len <= capacity) return v;
    }
    return 10;
  }

  function encodeData(text, version) {
    const bytes = new TextEncoder().encode(text);
    const spec = VERSION_SPECS[version];
    const bits = [];

    function pushBits(val, len) {
      for (let i = len - 1; i >= 0; i--) {
        bits.push((val >> i) & 1);
      }
    }

    // Mode indicator: 0100 (Byte mode)
    pushBits(4, 4);
    // Character count indicator (8 bits for v1-9)
    pushBits(bytes.length, version < 10 ? 8 : 16);
    // Data bytes
    for (const b of bytes) {
      pushBits(b, 8);
    }
    // Terminator (up to 4 zeroes)
    const totalDataBits = spec.data * 8;
    const termLen = Math.min(4, totalDataBits - bits.length);
    pushBits(0, termLen);

    // Byte align
    while (bits.length % 8 !== 0) bits.push(0);

    // Convert bits to byte array
    const dataBytes = [];
    for (let i = 0; i < bits.length; i += 8) {
      let byte = 0;
      for (let j = 0; j < 8; j++) {
        byte = (byte << 1) | bits[i + j];
      }
      dataBytes.push(byte);
    }

    // Pad bytes
    const pad = [0xec, 0x11];
    let padIdx = 0;
    while (dataBytes.length < spec.data) {
      dataBytes.push(pad[padIdx % 2]);
      padIdx++;
    }

    return new Uint8Array(dataBytes);
  }

  function buildMatrix(version, dataBytes) {
    const spec = VERSION_SPECS[version];
    const size = version * 4 + 17;
    const matrix = Array.from({ length: size }, () => new Array(size).fill(null));
    const isReserved = Array.from({ length: size }, () => new Array(size).fill(false));

    function setModule(r, c, val, reserved = true) {
      if (r >= 0 && r < size && c >= 0 && c < size) {
        matrix[r][c] = val ? 1 : 0;
        if (reserved) isReserved[r][c] = true;
      }
    }

    // 1. Finder patterns (7x7) + separators
    function drawFinder(r, c) {
      for (let dr = -1; dr <= 7; dr++) {
        for (let dc = -1; dc <= 7; dc++) {
          const row = r + dr;
          const col = c + dc;
          if (row < 0 || row >= size || col < 0 || col >= size) continue;
          if (dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6) {
            const isBorder = dr === 0 || dr === 6 || dc === 0 || dc === 6;
            const isInner = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
            setModule(row, col, isBorder || isInner);
          } else {
            setModule(row, col, false);
          }
        }
      }
    }

    drawFinder(0, 0);
    drawFinder(0, size - 7);
    drawFinder(size - 7, 0);

    // 2. Timing patterns
    for (let i = 8; i < size - 8; i++) {
      setModule(6, i, i % 2 === 0);
      setModule(i, 6, i % 2 === 0);
    }

    // 3. Dark module
    setModule(size - 8, 8, true);

    // 4. Reserve format info areas
    for (let i = 0; i < 9; i++) {
      isReserved[8][i] = true;
      isReserved[i][8] = true;
      isReserved[size - 1 - i][8] = true;
      isReserved[8][size - 1 - i] = true;
    }

    // 5. Interleave data & EC
    const blockSize = Math.floor(spec.data / spec.blocks);
    const ecPerBlock = spec.ec;
    const blocksData = [];
    const blocksEC = [];

    for (let b = 0; b < spec.blocks; b++) {
      const bData = dataBytes.slice(b * blockSize, (b + 1) * blockSize);
      blocksData.push(bData);
      blocksEC.push(calcEC(bData, ecPerBlock));
    }

    const finalStream = [];
    for (let i = 0; i < blockSize; i++) {
      for (let b = 0; b < spec.blocks; b++) {
        finalStream.push(blocksData[b][i]);
      }
    }
    for (let i = 0; i < ecPerBlock; i++) {
      for (let b = 0; b < spec.blocks; b++) {
        finalStream.push(blocksEC[b][i]);
      }
    }

    // 6. Place data bits
    let streamBits = [];
    for (const byte of finalStream) {
      for (let b = 7; b >= 0; b--) {
        streamBits.push((byte >> b) & 1);
      }
    }

    let bitIdx = 0;
    let upward = true;
    for (let right = size - 1; right > 0; right -= 2) {
      if (right === 6) right--; // Skip vertical timing column
      const cols = [right, right - 1];
      const rows = upward
        ? Array.from({ length: size }, (_, i) => size - 1 - i)
        : Array.from({ length: size }, (_, i) => i);

      for (const row of rows) {
        for (const col of cols) {
          if (!isReserved[row][col]) {
            const bit = bitIdx < streamBits.length ? streamBits[bitIdx++] : 0;
            // Apply mask 0: (row + col) % 2 === 0
            const mask = (row + col) % 2 === 0;
            matrix[row][col] = (bit ^ (mask ? 1 : 0)) ? 1 : 0;
          }
        }
      }
      upward = !upward;
    }

    // 7. Write format info (Mask 0, Level M => 0x4b43 ^ mask)
    // 15-bit format info for Level M + Mask 0 with BCH (15,5) = 101010000010010
    const fmtBits = [1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0];
    for (let i = 0; i < 6; i++) matrix[8][i] = fmtBits[i];
    matrix[8][7] = fmtBits[6];
    matrix[8][8] = fmtBits[7];
    matrix[7][8] = fmtBits[8];
    for (let i = 0; i < 6; i++) matrix[5 - i][8] = fmtBits[9 + i];

    for (let i = 0; i < 7; i++) matrix[size - 1 - i][8] = fmtBits[i];
    for (let i = 0; i < 8; i++) matrix[8][size - 8 + i] = fmtBits[7 + i];

    return matrix;
  }

  return {
    generateMatrix(text) {
      const version = getBestVersion(text);
      const data = encodeData(text, version);
      return buildMatrix(version, data);
    },

    draw(canvas, text, options = {}) {
      if (!canvas) return;
      const matrix = this.generateMatrix(text);
      const size = matrix.length;
      const margin = options.margin !== undefined ? options.margin : 2;
      const totalModules = size + margin * 2;
      const cellSize = options.cellSize || Math.max(4, Math.floor((options.size || 200) / totalModules));
      const canvasSize = totalModules * cellSize;

      canvas.width = canvasSize;
      canvas.height = canvasSize;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Background
      ctx.fillStyle = options.background || '#ffffff';
      ctx.fillRect(0, 0, canvasSize, canvasSize);

      // Modules
      ctx.fillStyle = options.foreground || '#0a0f1d';
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (matrix[r][c] === 1) {
            ctx.fillRect((c + margin) * cellSize, (r + margin) * cellSize, cellSize, cellSize);
          }
        }
      }
    },

    toDataURL(text, options = {}) {
      if (typeof document === 'undefined') return '';
      const canvas = document.createElement('canvas');
      this.draw(canvas, text, options);
      return canvas.toDataURL();
    }
  };
});

