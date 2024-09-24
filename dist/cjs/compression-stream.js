"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompressionStream = void 0;
const node_zlib_1 = __importDefault(require("node:zlib"));
const stream_1 = require("stream");
const CompressionStream = (encoding, options) => {
    let handler;
    const zlibOptions = {
        ...{
            level: 6,
        },
        ...options?.zlibOptions,
    };
    const brotliOptions = {
        ...{
            params: {
                [node_zlib_1.default.constants.BROTLI_PARAM_MODE]: node_zlib_1.default.constants.BROTLI_MODE_TEXT,
                [node_zlib_1.default.constants.BROTLI_PARAM_QUALITY]: node_zlib_1.default.constants.BROTLI_DEFAULT_QUALITY,
            },
        },
        ...options?.brotliOptions,
    };
    if (encoding === 'br') {
        handler = node_zlib_1.default.createBrotliCompress(brotliOptions);
    }
    else if (encoding === 'gzip') {
        handler = node_zlib_1.default.createGzip(zlibOptions);
    }
    else if (encoding === 'deflate') {
        handler = node_zlib_1.default.createDeflate(zlibOptions);
    }
    else {
        handler = new stream_1.Transform({
            transform(chunk, _, callback) {
                callback(null, chunk);
            },
        });
    }
    const readable = new ReadableStream({
        start(controller) {
            handler.on('data', (chunk) => controller.enqueue(chunk));
            handler.once('end', () => controller.close());
        },
    });
    const writable = new WritableStream({
        write: (chunk) => handler.write(chunk),
        close: () => handler.end(),
    });
    return {
        readable,
        writable,
    };
};
exports.CompressionStream = CompressionStream;
