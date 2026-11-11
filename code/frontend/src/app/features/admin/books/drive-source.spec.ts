import { describe, expect, it } from 'vitest';
import { driveFileId, driveFileIds } from './drive-source';

describe('Drive source input', () => {
  it('extracts file IDs in the order copied from Drive', () => {
    expect(driveFileIds('https://drive.google.com/file/d/cover-1/view?usp=sharing\nback_2 https://drive.google.com/open?id=inside3'))
      .toEqual(['cover-1', 'back_2', 'inside3']);
  });

  it('identifies a folder among pasted links and rejects other hosts', () => {
    expect(() => driveFileIds('cover\nhttps://drive.google.com/drive/u/0/folders/folder-id')).toThrow('Mục 2');
    expect(() => driveFileId('https://drive.google.com.example.test/file/d/cover/view')).toThrow();
  });

  it('limits the batch to eight entries', () => {
    expect(() => driveFileIds(Array.from({length: 9}, (_, i) => String(i)).join('\n'))).toThrow('Tối đa 8');
  });
});

it('accepts comma-separated copied links and rejects repeated file IDs', () => {
  expect(driveFileIds('file_a, file_b\nfile_c')).toEqual(['file_a','file_b','file_c']);
  expect(()=>driveFileIds('file_a\nhttps://drive.google.com/file/d/file_a/view')).toThrow('trùng');
});
