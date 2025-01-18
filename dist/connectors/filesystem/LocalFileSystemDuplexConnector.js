"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalFileSystemDuplexConnector = void 0;
const fs_1 = require("fs");
const joi = require("joi");
const lodash_1 = require("lodash");
const util_1 = require("util");
const zlib = require("zlib");
const FileSystemDuplexConnector_1 = require("./FileSystemDuplexConnector");
const Connector_1 = require("../Connector");
const accessP = util_1.promisify(fs_1.access);
const unlinkP = util_1.promisify(fs_1.unlink);
const gzipSchema = joi.object({
    flush: joi.number().optional(),
    finishFlush: joi.number().optional(),
    chunkSize: joi.number().optional(),
    windowBits: joi.number().optional(),
    level: joi.number().optional(),
    memLevel: joi.number().optional(),
    strategy: joi.number().optional(),
}).required();
const schema = joi.object({
    connection: joi.object({
        path: joi.string().required()
    }).required(),
    assource: joi.object({
        ...Connector_1.SOURCE_CONNECTOR_BASE_OPTIONS_SCHEMA,
        gzip: gzipSchema
    }).required(),
    astarget: joi.object({
        ...Connector_1.TARGET_CONNECTOR_BASE_OPTIONS_SCHEMA,
        gzip: gzipSchema,
        bulk_write_size: joi.number().optional()
    }).required(),
});
class LocalFileSystemDuplexConnector extends FileSystemDuplexConnector_1.FileSystemDuplexConnector {
    constructor({ connection, assource = {}, astarget = {} }) {
        super();
        this.type = 'Local FileSystem Connector';
        this.connection = connection;
        this.assource = lodash_1.merge({
            bulk_read_size: 10000,
            gzip: {
                chunkSize: 50 * 1024,
                level: zlib.constants.Z_BEST_SPEED,
            },
        }, assource);
        this.astarget = lodash_1.merge({
            remove_on_failure: true,
            remove_on_startup: true,
            gzip: {
                chunkSize: 50 * 1024,
                level: zlib.constants.Z_BEST_SPEED,
            },
            bulk_write_size: 50 * 1024
        }, astarget);
    }
    createWriteStream() {
        return fs_1.createWriteStream(this.connection.path, {
            highWaterMark: this.astarget.bulk_write_size,
            autoClose: true,
            emitClose: true
        });
    }
    createReadStream() {
        return fs_1.createReadStream(this.connection.path, { highWaterMark: this.assource.bulk_read_size });
    }
    async remove() {
        return unlinkP(this.connection.path).then(() => true).catch(() => false);
    }
    async connect() {
    }
    async close() {
    }
    options() {
        return lodash_1.pick(this, ['connection', 'assource', 'astarget']);
    }
    schema() {
        return schema;
    }
    async exists() {
        return accessP(this.connection.path).then(() => true).catch(() => false);
    }
    async fullname() {
        return `type: ${this.type}, path: ${this.connection.path}`;
    }
}
exports.LocalFileSystemDuplexConnector = LocalFileSystemDuplexConnector;
//# sourceMappingURL=LocalFileSystemDuplexConnector.js.map