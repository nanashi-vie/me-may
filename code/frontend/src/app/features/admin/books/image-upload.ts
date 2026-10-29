/** Check source bytes/pixels before allocating a decoded bitmap. */
export async function sourceImageInfo(file: File) {
  if (!file.size || file.size > 10 * 1024 * 1024) throw Error('Ảnh nguồn tối đa 10 MB.');
  const buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(Error('Không đọc được ảnh.'));
    reader.readAsArrayBuffer(file);
  });
  const bytes = new Uint8Array(buffer), view = new DataView(buffer);
  let width = 0, height = 0;
  if (bytes.length >= 24 && [137,80,78,71,13,10,26,10].every((v,i) => bytes[i] === v)) {
    width = view.getUint32(16); height = view.getUint32(20);
  } else if (bytes[0] === 255 && bytes[1] === 216) {
    let offset = 2;
    while (offset + 4 <= bytes.length) {
      if (bytes[offset++] !== 255) break;
      while (bytes[offset] === 255) offset++;
      const marker = bytes[offset++];
      if (marker === 218 || marker === 217) break;
      if (marker === 1 || (marker >= 208 && marker <= 215)) continue;
      if (offset + 2 > bytes.length) break;
      const length = view.getUint16(offset);
      if (length < 2 || offset + length > bytes.length) break;
      if ([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker) && length >= 7) {
        height = view.getUint16(offset + 3); width = view.getUint16(offset + 5); break;
      }
      offset += length;
    }
  }
  if (!width || !height) throw Error('Chọn ảnh JPEG hoặc PNG hợp lệ.');
  if (width * height > 25_000_000) throw Error('Ảnh nguồn tối đa 25 megapixel.');
  return {width, height, large: file.size > 5 * 1024 * 1024};
}
export function imageOutputSize(width: number, height: number) {
  const scale = Math.min(1, 2560 / Math.max(width, height));
  return {width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale))};
}
export async function prepareImage(file: File): Promise<Blob> {
  await sourceImageInfo(file);
  let bitmap: ImageBitmap;
  try { bitmap = await createImageBitmap(file, {imageOrientation:'from-image'}); }
  catch { throw Error('Không giải mã được ảnh. Hãy chọn ảnh JPEG hoặc PNG khác.'); }
  try {
    const {width,height} = imageOutputSize(bitmap.width, bitmap.height);
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw Error('Trình duyệt chưa xử lý được ảnh.');
    context.fillStyle = '#ffffff'; context.fillRect(0,0,width,height);
    context.drawImage(bitmap,0,0,width,height);
    return await new Promise<Blob>((resolve,reject) => canvas.toBlob(b => b ? resolve(b) : reject(Error('Chưa chuẩn hóa được ảnh.')), 'image/jpeg', 0.85));
  } finally { bitmap.close(); }
}
