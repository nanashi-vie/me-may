import { calculatedBookPrices, roundPriceUp } from './book-pricing';
describe('weight pricing',()=>{
  it('rounds both ends up using the unrounded base',()=>{
    expect(calculatedBookPrices(80000,450)).toEqual({priceMinVnd:36000,priceMaxVnd:42000});
    expect(calculatedBookPrices(81000,450)).toEqual({priceMinVnd:37000,priceMaxVnd:42000});
    expect(calculatedBookPrices(1000,1000)).toEqual({priceMinVnd:1000,priceMaxVnd:2000});
    expect(roundPriceUp(36000)).toBe(36000);expect(roundPriceUp(36450)).toBe(37000);
  });
  it('does not return unsafe or invalid prices',()=>{
    for(const input of [0,-1,1.5,NaN,Infinity]) expect(calculatedBookPrices(input,450)).toBeNull();
    expect(calculatedBookPrices(999999999999,Number.MAX_SAFE_INTEGER)).toBeNull();
    expect(roundPriceUp(999999999999)).toBeNull();expect(roundPriceUp(0)).toBeNull();
  });
});
