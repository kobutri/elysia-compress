import type { LifeCycleType } from 'elysia';
import type { BrotliOptions, ZlibOptions } from 'node:zlib';
export type CompressionEncoding = 'zstd' | 'br' | 'deflate' | 'gzip';
export type CompressionOptions = {
    brotliOptions?: BrotliOptions;
    zlibOptions?: ZlibOptions;
    zstdCompressionLevel?: number;
    encodings?: CompressionEncoding[];
    disableByHeader?: boolean;
    threshold?: number;
    compressStream?: boolean;
};
export type LifeCycleOptions = {
    as?: LifeCycleType;
};
export type ElysiaCompressionOptions = CompressionOptions & LifeCycleOptions;
