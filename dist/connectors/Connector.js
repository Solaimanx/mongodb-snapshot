"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TARGET_CONNECTOR_BASE_OPTIONS_SCHEMA = exports.SOURCE_CONNECTOR_BASE_OPTIONS_SCHEMA = void 0;
const joi = require("joi");
;
exports.SOURCE_CONNECTOR_BASE_OPTIONS_SCHEMA = {
    bulk_read_size: joi.number().optional(),
    collections: joi.array().items(joi.string()).optional(),
    exclude_collections: joi.array().items(joi.string()).optional(),
};
exports.TARGET_CONNECTOR_BASE_OPTIONS_SCHEMA = {
    remove_on_failure: joi.boolean().optional(),
    remove_on_startup: joi.boolean().optional(),
    collections: joi.array().items(joi.string()).optional(),
    exclude_collections: joi.array().items(joi.string()).optional(),
    metadatas: joi.array().items(joi.string()).optional(),
    exclude_metadatas: joi.array().items(joi.string()).optional()
};
//# sourceMappingURL=Connector.js.map