/// <reference types="node" />
import * as stream from 'stream';
declare global {
    namespace Bua {
        interface Header {
            name: string;
            size: number;
            mtime?: number;
            mode?: number;
            type: 'file' | 'directory';
        }
        interface IndexHeader {
            size: number;
            mtime: number;
            mode: number;
            type: 'file' | 'directory';
            nameLength: number;
        }
    }
}
declare class ExtractStream extends stream.Readable {
    constructor();
    skip(cb: () => void): void;
}
export declare class Extract {
    input: stream.Writable;
    private entryHandler;
    constructor();
    entry(cb: (header: Bua.Header, stream: ExtractStream, next: (err?: any) => void) => void): void;
}
export declare class Pack {
    output: stream.Readable;
    constructor();
    finalize(): void;
    entry(header: Bua.Header, next: (err?: Error) => void): stream.Writable;
    writeHeader(header: Bua.Header): void;
}
export {};
