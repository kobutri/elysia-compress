"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compression = void 0;
const elysia_1 = require("elysia");
const node_zlib_1 = require("node:zlib");
const compression_stream_1 = require("./compression-stream");
const compression = (options) => {
    const zlibOptions = {
        ...{
            level: 6,
        },
        ...options?.zlibOptions,
    };
    const brotliOptions = {
        ...{
            params: {
                [node_zlib_1.constants.BROTLI_PARAM_MODE]: node_zlib_1.constants.BROTLI_MODE_GENERIC,
                [node_zlib_1.constants.BROTLI_PARAM_QUALITY]: node_zlib_1.constants.BROTLI_DEFAULT_QUALITY,
            },
        },
        ...options?.brotliOptions,
    };
    const defaultEncodings = options?.encodings ?? ['br', 'gzip', 'deflate'];
    const defaultCompressibleTypes = /^text\/(?!event-stream)|(?:\+|\/)json(?:;|$)|(?:\+|\/)text(?:;|$)|(?:\+|\/)xml(?:;|$)|octet-stream(?:;|$)/u;
    const lifeCycleType = options?.as ?? 'global';
    const threshold = options?.threshold ?? 1024;
    const disableByHeader = options?.disableByHeader ?? true;
    const compressStream = options?.compressStream ?? true;
    const app = new elysia_1.Elysia({
        name: 'elysia-compress',
        seed: options,
    });
    const compressors = {
        br: (buffer) => (0, node_zlib_1.brotliCompressSync)(buffer, brotliOptions),
        gzip: (buffer) => (0, node_zlib_1.gzipSync)(buffer, zlibOptions),
        deflate: (buffer) => (0, node_zlib_1.deflateSync)(buffer, zlibOptions),
    };
    const textDecoder = new TextDecoder();
    const compress = (algorithm, buffer) => {
        const compressedOutput = compressors[algorithm](buffer);
        return compressedOutput;
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
            compressed = stream.pipeThrough((0, compression_stream_1.CompressionStream)(encoding, options));
        }
        else {
            const res = (0, elysia_1.mapResponse)(response, {
                headers: {},
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
            compressed = compress(encoding, buffer);
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
        return new Response(compressed, {
            headers: {
                'Content-Type': contentType,
            },
        });
    });
    return app;
};
exports.compression = compression;
