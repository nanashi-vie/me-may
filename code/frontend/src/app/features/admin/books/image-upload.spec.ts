import { sourceImageInfo, imageOutputSize } from './image-upload';
describe('upload source guards', () => {
  const png = (w: number, h: number, size = 32) => {
    const bytes = new Uint8Array(size); bytes.set([137,80,78,71,13,10,26,10]);
    const view = new DataView(bytes.buffer); view.setUint32(16,w); view.setUint32(20,h);
    return new File([bytes], 'photo.png', {type:'image/png'});
  };
  it('rejects huge source pixels before decoding or resizing', async () => {
    await expect(sourceImageInfo(png(5001,5000))).rejects.toThrow('25');
    await expect(sourceImageInfo(png(50,50,10*1024*1024+1))).rejects.toThrow('10');
  });
  it('warns on large valid sources and uses bytes rather than extension', async () => {
    expect(await sourceImageInfo(png(4000,3000,5*1024*1024+1))).toMatchObject({width:4000,height:3000,large:true});
    await expect(sourceImageInfo(new File(['not an image'], 'photo.jpg', {type:'image/jpeg'}))).rejects.toThrow();
  });
  it('fits portrait and landscape into 2560 without enlarging small images', () => {
    expect(imageOutputSize(4000,3000)).toEqual({width:2560,height:1920});
    expect(imageOutputSize(3000,4000)).toEqual({width:1920,height:2560});
    expect(imageOutputSize(600,800)).toEqual({width:600,height:800});
  });
});
