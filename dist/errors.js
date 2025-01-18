"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectorSchemaError = exports.MongoTransferError = void 0;
const verror_1 = require("verror");
class MongoTransferError extends verror_1.VError {
    constructor(cause, message) {
        super(message !== null && message !== void 0 ? message : `could not transfer mongo database properly`, cause);
    }
}
exports.MongoTransferError = MongoTransferError;
class ConnectorSchemaError extends MongoTransferError {
    constructor(cause) {
        super(cause);
    }
}
exports.ConnectorSchemaError = ConnectorSchemaError;
//# sourceMappingURL=errors.js.map