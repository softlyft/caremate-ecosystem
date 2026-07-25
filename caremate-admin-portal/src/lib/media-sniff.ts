/** Sniff common image/video magic bytes; returns MIME or null. */
export async function sniffAllowedMediaMime(
  file: Blob,
  allowed: Set<string>,
): Promise<string | null> {
  const header = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const declared = 'type' in file && typeof (file as File).type === 'string' ? (file as File).type : '';

  let sniffed: string | null = null;
  if (header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) sniffed = 'image/jpeg';
  else if (
    header[0] === 0x89 &&
    header[1] === 0x50 &&
    header[2] === 0x4e &&
    header[3] === 0x47
  ) {
    sniffed = 'image/png';
  } else if (
    header[0] === 0x47 &&
    header[1] === 0x49 &&
    header[2] === 0x46 &&
    header[3] === 0x38
  ) {
    sniffed = 'image/gif';
  } else if (
    header.length >= 12 &&
    header[0] === 0x52 &&
    header[1] === 0x49 &&
    header[2] === 0x46 &&
    header[3] === 0x46 &&
    header[8] === 0x57 &&
    header[9] === 0x45 &&
    header[10] === 0x42 &&
    header[11] === 0x50
  ) {
    sniffed = 'image/webp';
  } else if (
    header.length >= 12 &&
    header[4] === 0x66 &&
    header[5] === 0x74 &&
    header[6] === 0x79 &&
    header[7] === 0x70
  ) {
    sniffed = 'video/mp4';
  } else if (
    header[0] === 0x1a &&
    header[1] === 0x45 &&
    header[2] === 0xdf &&
    header[3] === 0xa3
  ) {
    sniffed = 'video/webm';
  }

  if (sniffed && allowed.has(sniffed)) return sniffed;
  if (declared && allowed.has(declared) && sniffed === null) {
    // Unknown magic but declared type allowed — reject to avoid spoofing.
    return null;
  }
  return sniffed && allowed.has(sniffed) ? sniffed : null;
}
