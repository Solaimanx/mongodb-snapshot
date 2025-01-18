import { VError } from "verror";
export declare interface MongoTransferError {
    new (message: string, cause?: Error): MongoTransferError;
}
export declare class MongoTransferError extends VError {
    constructor(cause: Error, message?: string);
}
export declare class ConnectorSchemaError extends MongoTransferError {
    constructor(cause: Error);
}
//# sourceMappingURL=errors.d.ts.map