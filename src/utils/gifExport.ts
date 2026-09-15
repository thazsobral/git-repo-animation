import { GIFEncoder, quantize, applyPalette } from 'gifenc';

export async function renderCanvasToGif(
  canvas: HTMLCanvasElement,
  totalFrames: number,
  renderFrame: (frameIndex: number) => Promise<void> | void,
  fps = 20,
  onProgress?: (progress: number, current: number, total: number) => void
): Promise<Blob> {
  const gif = GIFEncoder();
  const width = canvas.width;
  const height = canvas.height;
  const delay = Math.round(1000 / fps);

  for (let i = 0; i < totalFrames; i++) {
    await renderFrame(i);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2d context');

    const data = ctx.getImageData(0, 0, width, height).data;
    // Quantize into 256 color palette
    const palette = quantize(data, 256);
    const index = applyPalette(data, palette);

    gif.writeFrame(index, width, height, { palette, delay });
    if (onProgress) {
      onProgress(Math.round(((i + 1) / totalFrames) * 100), i + 1, totalFrames);
    }
  }

  gif.finish();
  const bytes = gif.bytes();
  return new Blob([bytes], { type: 'image/gif' });
}
