const dimensions = [320, 480, 640, 1400];

export const recipes = Object.freeze({
  v1: Object.freeze({
    maxInputBytes: 10 * 1024 * 1024,
    maxPixels: 25_000_000,
    formats: Object.freeze([
      ...dimensions.flatMap(size => [
        Object.freeze({ size, extension: 'jpg', mime: 'image/jpeg', quality: 85 }),
        Object.freeze({ size, extension: 'webp', mime: 'image/webp', quality: 82 }),
      ]),
      Object.freeze({ size: 1280, extension: 'jpg', mime: 'image/jpeg', quality: 85 }),
    ]),
  }),
});
