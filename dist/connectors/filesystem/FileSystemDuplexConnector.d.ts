/// <reference types="node" />
import { TargetConnector, SourceConnector, CollectionData } from "../Connector";
import { Readable, Writable } from "stream";
import { GzipOpts, CollectionMetadata } from "../../contracts";
import { Observable } from "rxjs";
import { Validatable } from "../Validatable";
export interface FileSystemSourceConnector extends SourceConnector {
    createReadStream(): Readable;
}
export interface FileSystemTargetConnector extends TargetConnector {
    createWriteStream(): Writable;
}
export declare abstract class FileSystemDuplexConnector extends Validatable implements FileSystemSourceConnector, FileSystemTargetConnector {
    write(datas: CollectionData[], metadatas: CollectionMetadata[]): Observable<number>;
    chunk$({ name: collection_name }: CollectionMetadata): Observable<Buffer>;
    transferable(): Promise<CollectionMetadata[]>;
    abstract type: string;
    abstract connection: any;
    abstract assource: {
        [key: string]: any;
        gzip: GzipOpts;
        bulk_read_size: number;
    };
    abstract astarget: {
        [key: string]: any;
        remove_on_failure: boolean;
        remove_on_startup: boolean;
        gzip: GzipOpts;
        bulk_write_size: number;
    };
    abstract createReadStream(batch_size?: number): Readable;
    abstract createWriteStream(): Writable;
    abstract remove(): Promise<boolean>;
    abstract connect(): Promise<any>;
    abstract close(): Promise<any>;
    abstract exists(): Promise<boolean>;
    abstract fullname(): Promise<string>;
}
//# sourceMappingURL=FileSystemDuplexConnector.d.ts.map