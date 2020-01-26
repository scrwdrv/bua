"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bua = require("./index");
const PATH = require("path");
const fs = require("fs");
const pack = new bua.Pack(), extract = new bua.Extract();
LetsPack('node_modules', (err) => {
    if (err)
        return console.log(err);
    pack.finalize();
});
pack.output.pipe(fs.createWriteStream('node_modules.bua')).on('finish', () => {
    console.log('packed', PATH.resolve('node_modules.bua'));
    LetsExtract();
    fs.createReadStream('node_modules.bua').pipe(extract.input).on('finish', () => {
        console.log('extracted', PATH.resolve('node_modules_bua'));
    });
});
function LetsExtract() {
    extract.entry((header, stream, next) => {
        const time = new Date(header.mtime);
        header.name = header.name.replace(/^node_modules/, 'node_modules_bua');
        if (header.type === 'file')
            stream.pipe(fs.createWriteStream(header.name, { mode: header.mode || 0o644 })).on('finish', () => fs.utimes(header.name, 0, time, (err) => {
                if (err)
                    return next(err);
                next();
            }));
        else
            (function dirHandler() {
                let dirMked = false, streamDrained = false;
                stream.skip(() => {
                    if (dirMked)
                        return next();
                    streamDrained = true;
                });
                fs.mkdir(header.name, { recursive: true, mode: header.mode || 0o755 }, (err) => {
                    if (err)
                        return next(err);
                    fs.utimes(header.name, 0, time, (err) => {
                        if (err)
                            return next(err);
                        if (streamDrained)
                            return next();
                        dirMked = true;
                    });
                });
            })();
    });
}
function LetsPack(path, cb) {
    fs.stat(path, (err, stats) => {
        if (err)
            return cb(err);
        if (stats.isDirectory()) {
            pack.writeHeader({
                name: path,
                size: 0,
                mtime: Math.floor(stats.mtimeMs),
                mode: stats.mode,
                type: 'directory'
            });
            fs.readdir(path, (err, files) => {
                if (err)
                    return cb(err);
                const l = files.length;
                (function next(i = 0) {
                    if (i === l)
                        return cb(null);
                    LetsPack(PATH.join(path, files[i]), (err) => {
                        if (err)
                            return cb(err);
                        next(i + 1);
                    });
                })();
            });
        }
        else if (stats.isFile())
            fs.createReadStream(path)
                .pipe(pack.entry({
                name: path,
                size: stats.size,
                mtime: Math.floor(stats.mtimeMs),
                mode: stats.mode,
                type: 'file'
            }, cb));
        else
            cb(null);
    });
}
//# sourceMappingURL=test.js.map