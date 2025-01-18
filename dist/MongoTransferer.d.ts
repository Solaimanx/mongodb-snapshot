import { Observable } from "rxjs";
import { SourceConnector, TargetConnector } from "./connectors/Connector";
import { Progress } from "./contracts";
interface MongoTransfererOptions {
    source: SourceConnector;
    targets: TargetConnector[];
}
/**
 * Transfers a snapshot of a database and stream it׳s content.
 * During the process the module emit events regarding the transfer process that you can subscribe to.
 */
export declare class MongoTransferer implements AsyncIterable<Progress> {
    private source;
    private targets;
    constructor({ source, targets }: MongoTransfererOptions);
    [Symbol.asyncIterator](): AsyncIterableIterator<Progress>;
    /**
     * Allows an easier iteration across the transferer events.
     * Lazingly start the transfer operation.
     * As long as there was no execution of "for await ..." expression the transfer process wont start.
     *
     * @example
     * ```js
     * const source = new LocalFileSystemDuplexConnector(...);
     * const target = new MongoDBDuplexConnector(...);
     *
     * const transferer = new MongoTransferer({ source, targets: [target] });
     *
     * for await (const progress of transferer.iterator()) {
     *    console.log(progress);
     * }
     * ```
     */
    iterator(): AsyncIterableIterator<Progress>;
    /**
     * Returns a promise that allows you to await until the transfer operation is done.
     * The promise might be rejected if there was a critical error.
     * If the promise was fullfilled it will provide a summary details of the transfer operation.
     */
    promise(): Promise<Progress>;
    /**
     * Returns a stream transferer progression events to listen to during the transfer process.
     */
    progress$(): Observable<Progress>;
}
export {};
//# sourceMappingURL=MongoTransferer.d.ts.map