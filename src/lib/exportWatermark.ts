const BRAND_LABEL = 'Wise Resume';
const BRAND_URL = 'https://wiseresume.app';

export function appendImageWatermark(source: HTMLCanvasElement): HTMLCanvasElement {
  const footerHeight = Math.max(72, Math.round(source.width * 0.035));
  const canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height + footerHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) return source;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(source, 0, 0);

  ctx.fillStyle = '#f8f8f8';
  ctx.fillRect(0, source.height, canvas.width, footerHeight);
  ctx.strokeStyle = '#e5e5e5';
  ctx.beginPath();
  ctx.moveTo(0, source.height + 0.5);
  ctx.lineTo(canvas.width, source.height + 0.5);
  ctx.stroke();

  const labelSize = Math.max(22, Math.round(source.width * 0.018));
  const urlSize = Math.max(18, Math.round(source.width * 0.014));
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#171717';
  ctx.font = `600 ${labelSize}px Arial, sans-serif`;
  ctx.fillText(BRAND_LABEL, canvas.width / 2, source.height + footerHeight * 0.38);
  ctx.fillStyle = '#525252';
  ctx.font = `${urlSize}px Arial, sans-serif`;
  ctx.fillText(BRAND_URL, canvas.width / 2, source.height + footerHeight * 0.70);

  return canvas;
}

export { BRAND_LABEL, BRAND_URL };
