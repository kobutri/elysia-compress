import { Elysia } from 'elysia';
import type { CompressionOptions, LifeCycleOptions } from './types';
export declare const compression: (options?: CompressionOptions & LifeCycleOptions) => Elysia<"", false, {
    decorator: {};
    store: {};
    derive: {};
    resolve: {};
}, {
    type: {};
    error: {};
}, {
    schema: {};
    macro: {};
    macroFn: {};
}, {}, {
    derive: {};
    resolve: {};
    schema: {};
}, {
    derive: {};
    resolve: {};
    schema: {};
}>;
