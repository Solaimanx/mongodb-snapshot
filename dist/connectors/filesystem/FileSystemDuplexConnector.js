"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileSystemDuplexConnector = void 0;
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const tar = require("tar-stream");
const zlib = require("zlib");
const Validatable_1 = require("../Validatable");
const verror_1 = require("verror");
class FileSystemDuplexConnector extends Validatable_1.Validatable {
    write(datas, metadatas) {
        return rxjs_1.defer(() => {
            const pack = tar.pack({
                highWaterMark: this.astarget.bulk_write_size,
            });
            const output_file = this.createWriteStream();
            const gzip = zlib.createGzip(this.astarget.gzip);
            // pack streams
            const metadata$ = rxjs_1.concat(...metadatas.map((metadata) => packMetadata$(pack, metadata))).pipe(operators_1.toArray(), operators_1.map(() => 0));
            const content$ = rxjs_1.concat(...datas.map(({ metadata: { name, size }, chunk$: collectionData$ }) => packCollectionData$(pack, { name, size }, this.astarget.bulk_write_size, collectionData$)
                .pipe(operators_1.catchError((err) => rxjs_1.throwError(new verror_1.VError(err, `pack collection: ${name} failed`))))));
            // executing the stream
            const file_close_promise = rxjs_1.fromEvent(pack.pipe(gzip).pipe(output_file), 'close').pipe(operators_1.take(1)).toPromise();
            const finalizing$ = rxjs_1.defer(async () => {
                pack.finalize();
            });
            const closing$ = rxjs_1.defer(async () => {
                await file_close_promise;
            });
            const ending$ = rxjs_1.concat(finalizing$, closing$).pipe(operators_1.toArray(), operators_1.map(() => 0));
            const packing$ = rxjs_1.concat(metadata$, content$).pipe(operators_1.catchError((err) => {
                return rxjs_1.concat(ending$, rxjs_1.throwError(err));
            }));
            return rxjs_1.concat(packing$, ending$);
        });
    }
    chunk$({ name: collection_name }) {
        return new rxjs_1.Observable((observer) => {
            const extract = tar.extract({
                highWaterMark: this.assource.bulk_read_size
            });
            const file_input_stream = this.createReadStream();
            const unzip = zlib.createGunzip(this.assource.gzip);
            extract.on('entry', ({ name }, source_stream, next) => {
                if (!name.endsWith('.bson')) {
                    // skipping
                    source_stream.resume();
                    return next();
                }
                const collection_name_in_tar = name.replace('.bson', '');
                if (collection_name !== collection_name_in_tar) {
                    // skipping
                    source_stream.resume();
                    return next();
                }
                source_stream.on('data', chunk => observer.next(chunk));
                source_stream.on('error', (error) => observer.error(error));
                source_stream.on('end', () => next());
                source_stream.resume();
            });
            extract.on('finish', () => {
                observer.complete();
            });
            // execute the stream
            file_input_stream.pipe(unzip).pipe(extract);
        });
    }
    async transferable() {
        return new rxjs_1.Observable((observer) => {
            const extract = tar.extract({
                highWaterMark: this.assource.bulk_read_size
            });
            const file_input_stream = this.createReadStream();
            const unzip = zlib.createGunzip(this.assource.gzip);
            extract.on('entry', ({ size, name }, source_stream, next) => {
                if (!name.endsWith('.metadata.json')) {
                    if (name.endsWith('.bson')) {
                        const collection_name = name.replace('.bson', '');
                        observer.next({
                            name: collection_name,
                            size
                        });
                    }
                    source_stream.resume();
                    return next();
                }
                let metadata_str = '';
                const collection_name = name.replace('.metadata.json', '');
                source_stream.on('data', chunk => {
                    metadata_str += chunk.toString();
                });
                source_stream.on('error', (error) => observer.error(error));
                source_stream.on('end', () => {
                    const { indexes = [] } = JSON.parse(metadata_str);
                    observer.next({
                        name: collection_name,
                        indexes,
                    });
                    next();
                });
            });
            extract.on('finish', () => {
                observer.complete();
            });
            // execute the stream
            file_input_stream.pipe(unzip).pipe(extract);
        }).pipe(operators_1.groupBy(({ name }) => name, (partial_metadatas) => partial_metadatas, undefined, () => new rxjs_1.ReplaySubject()), operators_1.concatMap(metadataGroup$ => metadataGroup$.pipe(operators_1.toArray(), operators_1.map(partial_metadatas => partial_metadatas.reduce((acc_metadata, partial_metadata) => ({ ...acc_metadata, ...partial_metadata }), { name: metadataGroup$.key, size: 0, indexes: [] }))))).pipe(operators_1.toArray()).toPromise();
    }
    ;
}
exports.FileSystemDuplexConnector = FileSystemDuplexConnector;
function packMetadata$(pack, metadata) {
    return new rxjs_1.Observable((observer) => {
        const content = JSON.stringify({
            options: {},
            indexes: metadata.indexes,
            uuid: "",
        });
        pack.entry({ name: `${metadata.name}.metadata.json` }, content, (error) => {
            if (error) {
                observer.error(error);
            }
            else {
                observer.next(metadata);
                observer.complete();
            }
        });
    });
}
function packCollectionData$(pack, metadata, fillEmptyChunkSize, chunk$) {
    return new rxjs_1.Observable((observer) => {
        let streamError = null;
        /*
        * the data might be bigger or smaller than the metadata size by this point.
        * This is because collections can be altered during the packing process (insert / remove / modifying documents).
        * so in order to perfectly fill the collection backup file with the right amount of data,
        * it is necessary to create a stream of empty chunks if the actual data stream is smaller than the metadata size
        * and trimming the stream of data if it is bigger than the metadata size.
        */
        // when the data stream is bigger than the metadata size of the collection
        const trimmed$ = getTrimmedChunk$({
            chunk$,
            totalBytes: metadata.size
        }).pipe(operators_1.share());
        const content$ = trimmed$.pipe(operators_1.map(({ chunk }) => chunk));
        // handling when the data stream is smaller than the metadata size of the collection
        const remain$ = rxjs_1.concat(trimmed$.pipe(operators_1.takeLast(1), operators_1.map(({ accumulatedTotalBytes: totalBytes }) => metadata.size - totalBytes)), 
        // this is necessary to handle a case when the data stream is empty
        rxjs_1.of(metadata.size)).pipe(
        // always emits one value, either the remaining bytes by the actual size of the chunk stream or metadata size
        operators_1.take(1), operators_1.switchMap((remainBytes) => getEmptyChunk$({
            chunkSize: fillEmptyChunkSize,
            totalBytes: remainBytes
        })));
        const write$ = rxjs_1.concat(content$, remain$);
        const entry = pack.entry({ name: `${metadata.name}.bson`, size: metadata.size }, (error) => {
            if (streamError) {
                observer.error(streamError);
            }
            else if (error) {
                observer.error(error);
            }
            else {
                observer.complete();
            }
        });
        const subscription = write$.pipe(operators_1.concatMap(async (data) => {
            return await new Promise((resolve, reject) => {
                entry.write(data, (error) => {
                    if (error) {
                        reject(error);
                    }
                    else {
                        resolve(data.length);
                    }
                });
            });
        })).subscribe((chunk) => {
            observer.next(chunk);
        }, (error) => {
            streamError = error;
            entry.end();
        }, () => {
            entry.end();
        });
        return () => {
            subscription.unsubscribe();
        };
    });
}
function getTrimmedChunk$(opts) {
    return opts.chunk$.pipe(
    // cutting extra data from the stream
    operators_1.scan((acc, chunk) => {
        const remainingBytes = opts.totalBytes - acc.accumulatedTotalBytes;
        if (remainingBytes > 0) {
            if (chunk.length < remainingBytes) {
                return {
                    chunk,
                    accumulatedTotalBytes: acc.accumulatedTotalBytes + chunk.length
                };
            }
            else {
                return {
                    chunk: chunk.slice(0, remainingBytes),
                    accumulatedTotalBytes: opts.totalBytes
                };
            }
        }
        else {
            return {
                accumulatedTotalBytes: opts.totalBytes
            };
        }
    }, {
        accumulatedTotalBytes: 0,
    }), operators_1.filter(({ accumulatedTotalBytes: totalBytes, chunk }) => {
        return totalBytes > 0 && chunk !== undefined;
    }));
}
function getEmptyChunk$(opts) {
    // check remaining bytes
    let remainingBytes = opts.totalBytes;
    return new rxjs_1.Observable((observer) => {
        const totalChunks = Math.floor(opts.totalBytes / opts.chunkSize);
        for (let i = 0; i < totalChunks; i++) {
            observer.next(Buffer.alloc(opts.chunkSize));
            remainingBytes -= opts.chunkSize;
        }
        if (remainingBytes > 0) {
            observer.next(Buffer.alloc(remainingBytes));
            remainingBytes = 0;
        }
        observer.complete();
    });
}
//# sourceMappingURL=FileSystemDuplexConnector.js.map