import * as pakoNamespace from 'pako/index.js';

const pako: Record<string, unknown> =
  (pakoNamespace as { default?: Record<string, unknown> }).default ??
  (pakoNamespace as unknown as Record<string, unknown>);

export const deflate = pako.deflate as never;
export const deflateRaw = pako.deflateRaw as never;
export const gzip = pako.gzip as never;
export const inflate = pako.inflate as never;
export const inflateRaw = pako.inflateRaw as never;
export const ungzip = pako.ungzip as never;
export const Deflate = pako.Deflate as never;
export const Inflate = pako.Inflate as never;
export const constants = pako.constants as never;

export default pako;
