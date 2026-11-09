const fileId = /^[A-Za-z0-9_-]{1,200}$/;

export function driveFileId(input: string): string {
  const value = input.trim();
  if (fileId.test(value)) return value;

  let link: URL;
  try {
    link = new URL(value);
  } catch {
    throw new Error('Nhập link file Google Drive hoặc File ID.');
  }
  if (link.protocol !== 'https:' || link.host !== 'drive.google.com' || link.username || link.password)
    throw new Error('Nhập link file Google Drive.');
  if (link.pathname.split('/').includes('folders'))
    throw new Error('Đây là link thư mục. Hãy sao chép link của ảnh.');
  const id = /^\/file\/(?:u\/\d+\/)?d\/([^/]+)(?:\/.*)?$/.exec(link.pathname)?.[1]
    ?? (['/open', '/uc'].includes(link.pathname) ? link.searchParams.get('id') : null);
  if (!id || !fileId.test(id)) throw new Error('Không tìm thấy File ID trong link.');
  return id;
}

export function driveFileIds(text: string): string[] {
  const entries = text.trim().split(/\s+/u).filter(Boolean);
  if (entries.length === 0) throw new Error('Dán ít nhất một link hoặc File ID.');
  if (entries.length > 8) throw new Error('Tối đa 8 nguồn ảnh mỗi lần.');
  return entries.map((entry, index) => {
    try {
      return driveFileId(entry);
    } catch (error) {
      throw new Error(`Mục ${index + 1}: ${(error as Error).message}`);
    }
  });
}
