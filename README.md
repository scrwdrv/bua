# bua
 Backup archive, as a tar alternative.

## Installation
```sh
npm i bua
```

## Header
bua's format is relatively simple, header contains the following:
 
| Header        |Optional | Value                | Description                                        |
|:--------------|:-------:|:--------------------:|:--------------------------------------------------:|
|name           | `false` |`string`              | Basically relative path of this directory or file  |
|size           | `false` |`number`              | Size in bytes of this file, directory is `0`       |
|mtime          | `true`  |`number`              | Last modified time in ms                           |
|mode           | `true`  |`number`              | File mode, usually permission                      |
|type           | `false` |file \| directory     | Type is either file or directory                   |

## Usage
bua uses stream on both packing and extracting, it is the most efficient way to transform and transmit data. Also allow you to pipe bua stream to `fs`, `cipher`, `socket`, etc. easily.
### Pack
Here is a simple example of packing `node_modules` to a single `.bua` file.
```js
import * as bua from 'bua';
import * as fs from 'fs';

const pack = new bua.Pack();

LetsPack('node_modules', (err) => {
    if (err) return console.log(err);
    pack.finalize(); // emit eof to the stream
});

//pipe output stream to a fs writeStream
pack.output.pipe(fs.createWriteStream('node_modules.bua')).on('finish', () => {
    console.log('packed');
});

function LetsPack(path, cb) {
    fs.stat(path, (err, stats) => {
        if (err) return cb(err);
        if (stats.isDirectory()) {
            // due to there is no data to write for a directory, 
            // you can simply `writeHeader` without creating a stream
            pack.writeHeader({
                name: path,
                size: 0,
                mtime: Math.floor(stats.mtimeMs),
                mode: stats.mode,
                type: 'directory'
            });
            // read directory recursively
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
            // pipe the original file to `pack.entry` with header
            fs.createReadStream(path)
                .pipe(pack.entry({
                name: path,
                size: stats.size,
                mtime: Math.floor(stats.mtimeMs),
                mode: stats.mode,
                type: 'file'
            }, cb));
        else cb(null);
    });
}
```

### Extract
Extract a `.bua` file to file system with original folder structure.
```js
extract = new bua.Extract();

// callback on entry found
extract.entry((header, stream, next) => {
    const time = new Date(header.mtime);
    header.name = header.name.replace(/^node_modules/, 'node_modules_bua');
    if (header.type === 'file')
        // pipe original data to fs writeStream
        stream.pipe(fs.createWriteStream(header.name, { mode: header.mode || 0o644 })).on('finish', () => 
            // restore mtime
            fs.utimes(header.name, 0, time, (err) => {
                if (err) return next(err);
                next();
            })
        );
    else
        (function dirHandler() {

            // to prevent mkdir finished before stream is drained and call `next` too early
            let dirMked = false,
                streamDrained = false;

            // `stream.skip` to drain the stream since there is no data to write for a directory 
            stream.skip(() => {
                // if mkdir has finished then `next` 
                if (dirMked) return next();
                streamDrained = true;
            });

            fs.mkdir(header.name, { recursive: true, mode: header.mode || 0o755 }, (err) => {
                if (err) return next(err);
                // restore mtime
                fs.utimes(header.name, 0, time, (err) => {
                    if (err) return next(err);
                    // if stream has drained then `next` 
                    if (streamDrained) return next();
                    dirMked = true;
                });
            });
        })();
});


//pipe fs readStream to input stream
fs.createReadStream('node_modules.bua').pipe(extract.input).on('finish', () => {
    console.log('extracted', PATH.resolve('node_modules_bua'));
});
```