/** CRC32 表 — PNG tEXt chunk 使用 */
const crcTable: number[] = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  crcTable[n] = c;
}

function crc32(arr: Uint8Array): number {
  let crc = 0 ^ (-1);
  for (let i = 0; i < arr.length; i++) crc = (crc >>> 8) ^ crcTable[(crc ^ arr[i]) & 0xFF];
  return (crc ^ (-1)) >>> 0;
}

/** 创建 PNG tEXt chunk */
export function createTextChunk(kw: string, text: string): Uint8Array {
  const b64 = btoa(unescape(encodeURIComponent(text)));
  const kb = new TextEncoder().encode(kw);
  const tb = new TextEncoder().encode(b64);
  const d = new Uint8Array(kb.length + 1 + tb.length);
  d.set(kb, 0);
  d[kb.length] = 0;
  d.set(tb, kb.length + 1);
  const ty = new TextEncoder().encode('tEXt');
  const td = new Uint8Array(4 + d.length);
  td.set(ty, 0);
  td.set(d, 4);
  const cs = crc32(td);
  const ch = new Uint8Array(4 + 4 + d.length + 4);
  ch[0] = (d.length >>> 24) & 0xFF;
  ch[1] = (d.length >>> 16) & 0xFF;
  ch[2] = (d.length >>> 8) & 0xFF;
  ch[3] = d.length & 0xFF;
  ch.set(td, 4);
  ch[ch.length - 4] = (cs >>> 24) & 0xFF;
  ch[ch.length - 3] = (cs >>> 16) & 0xFF;
  ch[ch.length - 2] = (cs >>> 8) & 0xFF;
  ch[ch.length - 1] = cs & 0xFF;
  return ch;
}

/** 从 PNG 字节数据中提取 tEXt chara chunk */
export function extractPNGCharaChunk(bytes: Uint8Array): string | null {
  // 跳过 PNG 签名 (8 bytes)
  let offset = 8;
  while (offset < bytes.length) {
    const len = (bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3];
    const type = String.fromCharCode(bytes[offset + 4], bytes[offset + 5], bytes[offset + 6], bytes[offset + 7]);
    if (type === 'tEXt') {
      const kwEnd = bytes.indexOf(0, offset + 8);
      const kw = new TextDecoder().decode(bytes.slice(offset + 8, kwEnd));
      if (kw === 'chara') {
        const txt = new TextDecoder().decode(bytes.slice(kwEnd + 1, offset + 8 + len));
        try {
          return decodeURIComponent(escape(atob(txt)));
        } catch {
          return atob(txt);
        }
      }
    }
    offset += 12 + len; // 4(len) + 4(type) + len(data) + 4(crc)
    if (type === 'IEND') break;
  }
  return null;
}
