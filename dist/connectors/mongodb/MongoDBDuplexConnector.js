"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MongoDBDuplexConnector = void 0;
const mongodb_1 = require("mongodb");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const joi = require("joi");
const BSON = require("bson");
const Connector_1 = require("../Connector");
const Validatable_1 = require("../Validatable");
const lodash_1 = require("lodash");
const rxjs_for_await_1 = require("rxjs-for-await");
const utils_1 = require("../../utils");
const BSON_DOC_HEADER_SIZE = 4;
const documentFilterSchema = joi.alternatives().try([
    joi.string(),
    joi.func()
]).required();
const schema = joi.object({
    connection: joi.object({
        uri: joi.string().required(),
        dbname: joi.string().required(),
        connectTimeoutMS: joi.number().optional(),
        isAtlasFreeTier: joi.boolean().optional()
    }).required(),
    assource: joi.object({
        ...Connector_1.SOURCE_CONNECTOR_BASE_OPTIONS_SCHEMA,
    }).required(),
    astarget: joi.object({
        ...Connector_1.TARGET_CONNECTOR_BASE_OPTIONS_SCHEMA,
        documents_bulk_write_count: joi.number().optional(),
        upsert: joi.object().pattern(joi.string(), joi.alternatives(documentFilterSchema, joi.array().items(documentFilterSchema))).optional(),
        writeDocument: joi.func().optional()
    }).required(),
});
class MongoDBDuplexConnector extends Validatable_1.Validatable {
    constructor({ connection, assource = {}, astarget = {} }) {
        super();
        this.type = 'MongoDB Connector';
        this.connection = connection;
        this.assource = lodash_1.merge({ bulk_read_size: 50 * 1024 }, assource);
        this.astarget = lodash_1.merge({ remove_on_failure: false, remove_on_startup: false, documents_bulk_write_count: 1000 }, astarget);
    }
    // as source
    chunk$({ name: collection_name, }) {
        return rxjs_1.defer(async () => {
            if (!this.db || !this.collections) {
                return rxjs_1.EMPTY;
            }
            // check if collection exist
            if (!this.collections.find(collection => collection.collectionName === collection_name)) {
                return rxjs_1.EMPTY;
            }
            const adminDb = this.db.admin();
            const { version } = await adminDb.serverStatus();
            let majorVersion = version.split('.')[0];
            majorVersion = majorVersion && Number(majorVersion);
            const collection = this.db.collection(collection_name);
            // removes timeout property if in atlas free tier, since noTimeout cursors are forbidden (the property timeout cannot be set to any value)
            let chunkCursor = collection.find({}, { timeout: this.connection.isAtlasFreeTier ? undefined : false, batchSize: this.assource.bulk_read_size });
            if (majorVersion < 4) {
                chunkCursor = chunkCursor.snapshot(true);
            }
            return cursorToObservalbe(chunkCursor);
        }).pipe(operators_1.mergeAll());
    }
    async exists() {
        if (!this.db || !this.client) {
            throw new Error("Need to connect to the data source before using this method.");
        }
        return this.client.isConnected() && this.db.databaseName === this.connection.dbname;
    }
    async fullname() {
        return `type: ${this.type}, database: ${this.connection.dbname}`;
    }
    options() {
        return lodash_1.pick(this, 'connection', 'assource', 'astarget');
    }
    schema() {
        return schema;
    }
    // as target
    async remove() {
        if (!this.db || !this.client) {
            throw new Error("Need to connect to the data source before using this method.");
        }
        try {
            await this.db.dropDatabase();
            return true;
        }
        catch (e) {
            return false;
        }
    }
    async writeCollectionMetadata(metadata) {
        var _a;
        if (!this.db || !((_a = this.client) === null || _a === void 0 ? void 0 : _a.isConnected())) {
            throw new Error("Need to connect to the data source before using this method.");
        }
        // create indexes
        if (metadata.indexes.length > 0) {
            // deletes v property from indexes metadata if in atlas free tier
            this.connection.isAtlasFreeTier && metadata.indexes.forEach((i) => delete i.v);
            return this.db.collection(metadata.name).createIndexes(metadata.indexes);
        }
        return Promise.resolve();
    }
    writeCollectionData(collection_name, chunk$) {
        const documents$ = utils_1.convertAsyncGeneratorToObservable(getDocumentsGenerator(chunk$))
            .pipe(operators_1.filter(({ obj: document }) => {
            // filter documents to write into mongodb
            return this.astarget.writeDocument ? this.astarget.writeDocument(collection_name, document) : true;
        }));
        return documents$.pipe(operators_1.bufferCount(this.astarget.documents_bulk_write_count), operators_1.mergeMap(async (documents) => {
            if (documents.length > 0) {
                await this.writeCollectionDocuments(collection_name, documents);
            }
            return documents.reduce((size, { raw }) => size + raw.length, 0);
        }));
    }
    async writeCollectionDocuments(collectionName, documents) {
        if (!this.db) {
            throw new Error("Need to connect to the data source before using this method.");
        }
        const collection = this.db.collection(collectionName);
        const upsert = this.astarget.upsert;
        const replaceFilter = Object.entries(upsert || {}).reduce((docFilterFn, [collectionSelector, collectionDocumentFilters]) => {
            if (utils_1.hasRegexMatch(collectionSelector, collectionName)) {
                collectionDocumentFilters = (!lodash_1.isArray(collectionDocumentFilters)) ? [collectionDocumentFilters] : collectionDocumentFilters;
                const currCollectionDocumentFilterFn = collectionDocumentFilters.reduce((collectionDocumentFilterFn, filter) => {
                    let documentFilterFn = undefined;
                    if (lodash_1.isFunction(filter)) {
                        documentFilterFn = filter;
                    }
                    else if (lodash_1.isString(filter)) {
                        documentFilterFn = (document) => {
                            return lodash_1.pickBy(document, (value, property) => {
                                return utils_1.hasRegexMatch(filter, property);
                            });
                        };
                    }
                    if (documentFilterFn) {
                        return (document) => {
                            if (collectionDocumentFilterFn) {
                                // merge results of filters
                                return {
                                    $and: [
                                        collectionDocumentFilterFn(document),
                                        documentFilterFn(document)
                                    ]
                                };
                            }
                            return documentFilterFn(document);
                        };
                    }
                    return collectionDocumentFilterFn;
                }, undefined);
                if (currCollectionDocumentFilterFn) {
                    return (document) => {
                        if (docFilterFn) {
                            return {
                                $or: [
                                    docFilterFn(document),
                                    currCollectionDocumentFilterFn(document)
                                ]
                            };
                        }
                        return currCollectionDocumentFilterFn(document);
                    };
                }
            }
            return docFilterFn;
        }, undefined);
        async function write(documents) {
            return await collection.bulkWrite(documents.map(({ obj: document }) => ({
                // either replacing or inserting new document for each income document 
                ...(replaceFilter ? ({
                    replaceOne: {
                        upsert: true,
                        replacement: document,
                        filter: replaceFilter(document),
                    }
                }) : ({
                    insertOne: {
                        document
                    }
                })),
            }), {
                ordered: false,
                bypassDocumentValidation: true,
            }));
        }
        return write(documents)
            .catch(async function () {
            // there sometimes failures during insertions because documents contain properties with invalid key names (containing the ".")
            documents.forEach(({ obj: document }) => filterInvalidKeys(document, key => key && key.includes('.')));
            return write(documents);
        });
    }
    write(datas, metadatas) {
        return rxjs_1.defer(() => {
            const metadata$ = rxjs_1.merge(...metadatas.map((metadata) => rxjs_1.from(this.writeCollectionMetadata(metadata)))).pipe(operators_1.toArray(), operators_1.map(() => 0));
            const content$ = rxjs_1.merge(...datas.map(({ metadata, chunk$ }) => this.writeCollectionData(metadata.name, chunk$)));
            return rxjs_1.concat(metadata$, content$);
        });
    }
    async connect() {
        const client = new mongodb_1.MongoClient(this.connection.uri, {
            connectTimeoutMS: this.connection.connectTimeoutMS || 5000,
            raw: true,
            keepAlive: true,
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        this.client = await client.connect();
        this.db = this.client.db(this.connection.dbname);
        this.collections = await this.db.collections();
    }
    async close() {
        var _a;
        if ((_a = this.client) === null || _a === void 0 ? void 0 : _a.isConnected()) {
            await this.client.close();
        }
        this.client = undefined;
        this.db = undefined;
        this.collections = undefined;
    }
    async transferable() {
        var _a;
        if (!((_a = this.client) === null || _a === void 0 ? void 0 : _a.isConnected()) || !this.collections) {
            throw new Error(`MongoDB client is not connected`);
        }
        const all_collections = this.collections.filter((collection) => !collection.collectionName.startsWith("system."));
        return (await Promise.all(all_collections.map(async (collection) => {
            try {
                const [stats, indexes] = await Promise.all([collection.stats(), collection.indexes()]);
                return {
                    name: collection.collectionName,
                    size: stats.size,
                    count: stats.count,
                    indexes,
                };
            }
            catch (e) {
                console.warn(`ignoring collection: "${collection.collectionName}", as we couldnt receive details due to an error: ${e.message}`);
                return null;
            }
        }))).filter(notEmpty);
    }
}
exports.MongoDBDuplexConnector = MongoDBDuplexConnector;
function notEmpty(value) {
    return value !== null && value !== undefined;
}
function filterInvalidKeys(obj, filterKeyFn) {
    const invalid_keys = Object.keys(obj).filter(key => filterKeyFn(key));
    for (const invalid_key of invalid_keys) {
        delete obj[invalid_key];
    }
    for (let k in obj) {
        if (obj[k] && typeof obj[k] === 'object') {
            filterInvalidKeys(obj[k], filterKeyFn);
        }
    }
}
async function* getDocumentsGenerator(chunk$) {
    let buffer = Buffer.alloc(0);
    for await (const data of rxjs_for_await_1.eachValueFrom(chunk$)) {
        buffer = Buffer.concat([buffer, data]);
        let next_doclen = null;
        if (buffer.length >= BSON_DOC_HEADER_SIZE) {
            next_doclen = buffer.readInt32LE(0);
        }
        else {
            next_doclen = null;
        }
        // flush all documents from the buffer
        while (next_doclen && buffer.length >= next_doclen) {
            const raw = buffer.slice(0, next_doclen);
            const obj = BSON.deserialize(raw);
            buffer = buffer.slice(next_doclen);
            yield {
                raw,
                obj
            };
            if (buffer.length >= BSON_DOC_HEADER_SIZE) {
                next_doclen = buffer.readInt32LE(0);
            }
            else {
                next_doclen = null;
            }
        }
    }
}
function cursorToObservalbe(cursor) {
    return new rxjs_1.Observable((observer) => {
        cursor.forEach(observer.next.bind(observer), (err) => {
            if (err) {
                observer.error(err);
            }
            else {
                observer.complete();
            }
        });
    });
}
//# sourceMappingURL=MongoDBDuplexConnector.js.map