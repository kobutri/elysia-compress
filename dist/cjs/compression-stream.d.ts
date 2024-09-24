import type { CompressionEncoding, CompressionOptions } from './types';
export declare const CompressionStream: (encoding: CompressionEncoding, options?: CompressionOptions) => {
    readable: ReadableStream<Uint8Array>;
    writable: WritableStream<Uint8Array>;
};
