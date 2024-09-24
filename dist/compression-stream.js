import zlib from 'node:zlib';
import { Transform } from 'stream';
export const CompressionStream = (encoding, options) => {
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
                [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT,
                [zlib.constants.BROTLI_PARAM_QUALITY]: zlib.constants.BROTLI_DEFAULT_QUALITY,
            },
        },
        ...options?.brotliOptions,
    };
    if (encoding === 'br') {
        handler = zlib.createBrotliCompress(brotliOptions);
    }
    else if (encoding === 'gzip') {
        handler = zlib.createGzip(zlibOptions);
    }
    else if (encoding === 'deflate') {
        handler = zlib.createDeflate(zlibOptions);
    }
    else {
        handler = new Transform({
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
