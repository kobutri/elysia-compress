import { Elysia, mapResponse } from 'elysia';
import { constants, brotliCompressSync, gzipSync, deflateSync, } from 'node:zlib';
import { CompressionStream } from './compression-stream';
import { compress as zstdCompress } from '@mongodb-js/zstd';
export const compression = (options) => {
    const zlibOptions = {
        ...{
            level: 6,
        },
        ...options?.zlibOptions,
    };
    const brotliOptions = {
        ...{
            params: {
                [constants.BROTLI_PARAM_MODE]: constants.BROTLI_MODE_GENERIC,
                [constants.BROTLI_PARAM_QUALITY]: constants.BROTLI_DEFAULT_QUALITY,
            },
        },
        ...options?.brotliOptions,
    };
    const zstdCompressionLevel = options?.zstdCompressionLevel ?? 3;
    const defaultEncodings = options?.encodings ?? [
        'zstd',
        'br',
        'gzip',
        'deflate',
    ];
    const defaultCompressibleTypes = /^text\/(?!event-stream)|(?:\+|\/)json(?:;|$)|(?:\+|\/)text(?:;|$)|(?:\+|\/)xml(?:;|$)|octet-stream(?:;|$)/u;
    const lifeCycleType = options?.as ?? 'global';
    const threshold = options?.threshold ?? 1024;
    const disableByHeader = options?.disableByHeader ?? true;
    const compressStream = options?.compressStream ?? true;
    const app = new Elysia({
        name: 'elysia-compress',
        seed: options,
    });
    const compressors = {
        br: (buffer) => brotliCompressSync(buffer, brotliOptions),
        gzip: (buffer) => gzipSync(buffer, zlibOptions),
        deflate: (buffer) => deflateSync(buffer, zlibOptions),
        zstd: (buffer) => zstdCompress(Buffer.from(buffer), zstdCompressionLevel),
    };
    const textDecoder = new TextDecoder();
    const compress = async (algorithm, buffer) => {
        const compressedOutput = compressors[algorithm](buffer);
        return await compressedOutput;
    };
    app.mapResponse({ as: lifeCycleType }, async (ctx) => {
        if (disableByHeader && ctx.headers['x-no-compression']) {
            return;
        }
        const { set } = ctx;
        const response = ctx.response;
        const acceptEncodings = ctx.headers['accept-encoding']?.split(', ') ?? [];
        const encodings = defaultEncodings.filter((encoding) => acceptEncodings.includes(encoding));
        if (encodings.length < 1 && !encodings[0]) {
            return;
        }
        const encoding = encodings[0];
        let compressed;
        let contentType = set.headers['Content-Type'] ?? set.headers['content-type'] ?? '';
        if (compressStream && response?.stream instanceof ReadableStream) {
            const stream = response.stream;
            compressed = stream.pipeThrough(CompressionStream(encoding, options));
        }
        else {
            const res = mapResponse(response, {
                headers: set.headers,
            });
            const resContentType = res.headers.get('Content-Type');
            contentType = resContentType ? resContentType : 'text/plain';
            const buffer = await res.arrayBuffer();
            if (buffer.byteLength < threshold) {
                return;
            }
            const isCompressible = defaultCompressibleTypes.test(contentType);
            if (!isCompressible) {
                return;
            }
            compressed = await compress(encoding, buffer);
        }
        const vary = set.headers.Vary ?? set.headers.vary;
        if (vary) {
            const rawHeaderValue = vary
                ?.split(',')
                .map((v) => v.trim().toLowerCase());
            const headerValueArray = Array.isArray(rawHeaderValue)
                ? rawHeaderValue
                : [rawHeaderValue];
            if (!headerValueArray.includes('*')) {
                set.headers.Vary = headerValueArray
                    .concat('accept-encoding')
                    .filter((value, index, array) => array.indexOf(value) === index)
                    .join(', ');
            }
        }
        else {
            set.headers.Vary = 'accept-encoding';
        }
        set.headers['Content-Encoding'] = encoding;
        if (!set.headers['Content-Type']) {
            set.headers['Content-Type'] = contentType;
        }
        return new Response(compressed);
    });
    return app;
};
