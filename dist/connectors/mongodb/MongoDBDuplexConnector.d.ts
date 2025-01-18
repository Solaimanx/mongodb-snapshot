/// <reference types="node" />
import { FilterQuery } from "mongodb";
import { Observable } from "rxjs";
import * as joi from 'joi';
import { TargetConnector, SourceConnector, CollectionData, SourceConnectorBaseOptions, TargetConnectorBaseOptions } from '../Connector';
import { MongoDBConnection, CollectionMetadata as CollectionMetadata } from "../../contracts";
import { Validatable } from "../Validatable";
export interface MongoDBConnectorOptions {
    connection: MongoDBConnection;
    /**
     * data related to this connector as a source
     */
    assource?: Partial<AsSourceMongoDBOptions>;
    /**
     * data related to this connector as a target
     */
    astarget?: Partial<AsTargetMongoDBOptions>;
}
declare type AsSourceMongoDBOptions = SourceConnectorBaseOptions;
declare type AsTargetMongoDBOptions = TargetConnectorBaseOptions & {
    /**
    * The amount of documents to write in each operation.
    * The greater this number is the better performance it will provide as it will make less writes to the MongoDB server.
    */
    documents_bulk_write_count: number;
    /**
    * insert or update exist documents on the target connector, overriding them by searching specific fields.
    * the upsert options is a dictionary representation of a collection selector to a document filter.
    * The collection selector can either be a regular expression or the literal name of the collection.
    * The document filter can be the literal name or regex of the field / fields or a function to perform the search of an exist document by (it is recommended to use something that compose a unique key).
    * @example
    * ```
    * {
    *   ...
    *   upsert: {
    *       "prefix_.*_suffix": (document) => pick(document, ['p1', 'p2', 'p3']),
    *       "collection_0": (document) => ({ p1: 'p1', p2: { $gte: 0 }}),
    *       "collection_1": ['p1', 'p2', 'p3'],
    *       "collection_2": ['p.*'],
    *       ".*": "_id"
    *   }
    * }
    * ```
    */
    upsert?: {
        [collection: string]: DocumentFilter | DocumentFilter[];
    };
    /**
     * allows you to filter specific documents to write into the target connector.
     * if this function returns true, the document will be written to the target connector.
     */
    writeDocument?: (collection: string, document: any) => boolean;
};
declare type DocumentFilterFunction<D = any> = (doc: D) => FilterQuery<D>;
declare type DocumentFilter = string | DocumentFilterFunction;
interface CollectionDocument {
    raw: Buffer;
    obj: {
        [key: string]: any;
    };
}
export declare class MongoDBDuplexConnector extends Validatable implements SourceConnector, TargetConnector {
    type: string;
    assource: AsSourceMongoDBOptions;
    astarget: AsTargetMongoDBOptions;
    connection: MongoDBConnection;
    private client?;
    private db?;
    private collections?;
    constructor({ connection, assource, astarget }: MongoDBConnectorOptions);
    chunk$({ name: collection_name, }: CollectionMetadata): Observable<Buffer>;
    exists(): Promise<boolean>;
    fullname(): Promise<string>;
    options(): Pick<this, "connection" | "assource" | "astarget">;
    schema(): joi.ObjectSchema;
    remove(): Promise<boolean>;
    writeCollectionMetadata(metadata: CollectionMetadata): Promise<any>;
    writeCollectionData(collection_name: string, chunk$: Observable<Buffer>): Observable<number>;
    writeCollectionDocuments(collectionName: string, documents: [CollectionDocument]): Promise<import("mongodb").BulkWriteOpResultObject>;
    write(datas: CollectionData[], metadatas: CollectionMetadata[]): Observable<number>;
    connect(): Promise<void>;
    close(): Promise<void>;
    transferable(): Promise<{
        name: string;
        size: number;
        count: number;
        indexes: any;
    }[]>;
}
export {};
//# sourceMappingURL=MongoDBDuplexConnector.d.ts.map