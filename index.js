"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const stream = require("stream");
class ExtractStream extends stream.Readable {
    constructor() {
        super();
    }
    skip(cb) {
        this.on('end', cb);
        this.resume();
    }
}
class Extract {
    constructor() {
        this.input = new stream.Writable();
        this.input._write = (chunk, encoding, next) => parseChunk(chunk, next);
        this.input._final = () => {
            exec = () => this.input.emit('finish');
            currentStream.push(null);
        };
        let bytesLeft = 0, indexHeader = null, previousBuffer, currentStream = null, exec;
        const parseChunk = (c, next) => {
            if (indexHeader) {
                appendBuffer(c);
                if (previousBuffer.length >= indexHeader.nameLength) {
                    const header = {
                        name: previousBuffer.slice(0, indexHeader.nameLength).toString(),
                        size: indexHeader.size,
                        mtime: indexHeader.mtime,
                        mode: indexHeader.mode,
                        type: indexHeader.type
                    }, nextChunk = previousBuffer.slice(indexHeader.nameLength);
                    indexHeader = null;
                    exec = () => {
                        currentStream = new ExtractStream();
                        currentStream._read = () => { };
                        this.entryHandler(header, currentStream, (err) => {
                            currentStream = null;
                            if (err)
                                return this.input.destroy(err);
                            exec();
                        });
                        bytesLeft = header.size;
                        previousBuffer = null;
                        if (nextChunk.length)
                            parseChunk(nextChunk, next);
                        else
                            next();
                    };
                    if (currentStream)
                        currentStream.push(null);
                    else
                        exec();
                }
                else
                    next();
            }
            else {
                const cL = (previousBuffer ? previousBuffer.length : 0) + c.length, diff = bytesLeft - cL;
                if (diff < 0) {
                    appendBuffer(c);
                    const indexOfLastComma = findComma();
                    if (indexOfLastComma !== false) {
                        indexHeader = parseIndex(previousBuffer.slice(bytesLeft, indexOfLastComma));
                        if (currentStream && bytesLeft)
                            currentStream.push(previousBuffer.slice(0, bytesLeft));
                        const nextChunk = previousBuffer.slice(indexOfLastComma + 1);
                        previousBuffer = null;
                        if (nextChunk.length)
                            parseChunk(nextChunk, next);
                        else
                            next();
                    }
                    else
                        next();
                }
                else {
                    bytesLeft = diff;
                    if (currentStream)
                        currentStream.push(c);
                    next();
                }
            }
        };
        function findComma(offset = bytesLeft, found = 0) {
            const index = previousBuffer.indexOf(',', offset + 1);
            if (index > -1) {
                found++;
                if (found === 5)
                    return index;
                return findComma(index, found);
            }
            else
                return false;
        }
        function appendBuffer(c) {
            if (previousBuffer)
                previousBuffer = Buffer.concat([previousBuffer, c]);
            else
                previousBuffer = c;
        }
        function parseIndex(c) {
            const arr = c.toString().split(','), indexHeader = {
                size: parseInt(arr[4]),
                mtime: parseInt(arr[1]),
                mode: parseInt(arr[2]),
                type: restoreType(arr[0]),
                nameLength: parseInt(arr[3]),
            };
            if (indexHeader.nameLength === NaN)
                throw new Error(`Invalid nameLength`);
            if (indexHeader.size === NaN)
                throw new Error(`Invalid size`);
            if (indexHeader.mtime === NaN)
                throw new Error(`Invalid mtime`);
            if (indexHeader.mode === NaN)
                throw new Error(`Invalid mode`);
            return indexHeader;
        }
    }
    entry(cb) {
        this.entryHandler = cb;
    }
}
exports.Extract = Extract;
class Pack {
    constructor() {
        this.output = new stream.Readable();
        this.output._read = () => { };
    }
    finalize() {
        this.output.push(null);
    }
    entry(header, next) {
        this.writeHeader(header);
        const ws = new stream.Writable().on('finish', next);
        ws._write = (chunk, encoding, next) => {
            this.output.push(chunk);
            next();
        };
        return ws;
    }
    writeHeader(header) {
        this.output.push(flattenHeader(header));
    }
}
exports.Pack = Pack;
function flattenHeader(header) {
    return Buffer.from(convertType(header.type) + ',' + (header.mtime || 0) + ',' + (header.mode || 0) + ',' + Buffer.byteLength(header.name) + ',' + header.size + ',' + header.name);
}
function restoreType(str) {
    switch (str) {
        case '0':
            return 'file';
        case '1':
            return 'directory';
        default:
            throw new Error(`Unknown Type: ${str}`);
    }
}
function convertType(str) {
    switch (str) {
        case 'file':
            return '0';
        case 'directory':
            return '1';
        default:
            throw new Error(`Unknown Type: ${str}`);
    }
}
//# sourceMappingURL=index.js.map