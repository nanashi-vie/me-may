const MAX_PRICE = 999999999999n;
function roundedRatio(numerator: bigint, denominator: bigint): number | null {
  const result = ((numerator + denominator - 1n) / denominator) * 1000n;
  return result > 0n && result <= MAX_PRICE ? Number(result) : null;
}
export function roundPriceUp(value: number): number | null {
  return Number.isSafeInteger(value) && value > 0 ? roundedRatio(BigInt(value), 1000n) : null;
}
export function calculatedBookPrices(unitPrice: number, weightG: number): {priceMinVnd:number;priceMaxVnd:number}|null {
  if (!Number.isSafeInteger(unitPrice) || unitPrice < 1 || unitPrice > Number(MAX_PRICE) ||
      !Number.isSafeInteger(weightG) || weightG < 1) return null;
  const product = BigInt(unitPrice) * BigInt(weightG);
  const priceMinVnd = roundedRatio(product, 1000000n);
  const priceMaxVnd = roundedRatio(product * 115n, 100000000n);
  return priceMinVnd !== null && priceMaxVnd !== null ? {priceMinVnd,priceMaxVnd} : null;
}
