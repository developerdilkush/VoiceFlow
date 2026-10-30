/** Minimal audio inspection: verifies the real file signature (not just the extension) and reads/estimates duration. */
const MP3_V1 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];
const MP3_V2 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160];

export function inspectAudio(buf) {
  if (buf.length > 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WAVE') {
    let off = 12, byteRate = 0, dataSize = 0;
    while (off + 8 <= buf.length) {
      const id = buf.toString('ascii', off, off + 4);
      const size = buf.readUInt32LE(off + 4);
      if (id === 'fmt ' && off + 20 <= buf.length) byteRate = buf.readUInt32LE(off + 16);
      if (id === 'data') { dataSize = Math.min(size, buf.length - off - 8); break; }
      off += 8 + size + (size % 2);
    }
    if (!byteRate || !dataSize) return null;
    return { type: 'wav', mime: 'audio/wav', duration: dataSize / byteRate, estimated: false };
  }
  let start = 0;
  if (buf.length > 10 && buf.toString('ascii', 0, 3) === 'ID3') {
    start = 10 + (((buf[6] & 0x7f) << 21) | ((buf[7] & 0x7f) << 14) | ((buf[8] & 0x7f) << 7) | (buf[9] & 0x7f));
  }
  for (let i = start; i < Math.min(buf.length - 4, start + 4096); i++) {
    if (buf[i] === 0xff && (buf[i + 1] & 0xe0) === 0xe0) {
      const version = (buf[i + 1] >> 3) & 3;
      const layer = (buf[i + 1] >> 1) & 3;
      const idx = buf[i + 2] >> 4;
      if (layer !== 1 || version === 1 || idx === 0 || idx === 15) continue;
      const kbps = (version === 3 ? MP3_V1 : MP3_V2)[idx];
      return { type: 'mp3', mime: 'audio/mpeg', duration: ((buf.length - i) * 8) / (kbps * 1000), estimated: true };
    }
  }
  return null;
}
