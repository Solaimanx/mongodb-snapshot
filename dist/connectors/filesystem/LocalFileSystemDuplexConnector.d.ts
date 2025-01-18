/// <reference types="node" />
import * as joi from "joi";
import { FileSystemDuplexConnector } from "./FileSystemDuplexConnector";
import { GzipOpts } from "../../contracts";
import { TargetConnectorBaseOptions, SourceConnectorBaseOptions } from '../Connector';
export interface LocalFileSystemOptions {
    connection: LocalFileSystemConnection;
    /**
     * data related to this connector as a source
     */
    assource?: Partial<AsLocalFileSystemSourceOptions>;
    /**
     * data related to this connector as a target
     */
    astarget?: Partial<AsLocalFileSystemTargetOptions>;
}
declare type AsLocalFileSystemSourceOptions = SourceConnectorBaseOptions & {
    /**
     * options to use when extracting data from the source file
     */
    gzip: GzipOpts;
};
declare type AsLocalFileSystemTargetOptions = TargetConnectorBaseOptions & {
    /**
     * options to use when compressing data into the target file
     */
    gzip: GzipOpts;
    /**
     * The amount of bytes to write into the file each time.
     * The bigger the number is it will improve the performance as it will decrease the amount of writes to the disk.
     */
    bulk_write_size: number;
};
export declare class LocalFileSystemDuplexConnector extends FileSystemDuplexConnector {
    type: string;
    connection: LocalFileSystemConnection;
    assource: AsLocalFileSystemSourceOptions;
    astarget: AsLocalFileSystemTargetOptions;
    constructor({ connection, assource, astarget }: LocalFileSystemOptions);
    createWriteStream(): import("fs").WriteStream;
    createReadStream(): import("fs").ReadStream;
    remove(): Promise<boolean>;
    connect(): Promise<void>;
    close(): Promise<void>;
    options(): Pick<this, "connection" | "assource" | "astarget">;
    schema(): joi.ObjectSchema;
    exists(): Promise<boolean>;
    fullname(): Promise<string>;
}
export interface LocalFileSystemConnectorOptions {
    connection: LocalFileSystemConnection;
}
export interface LocalFileSystemConnection {
    /**
     * The path to the archive file to create (relative to current working directory).
     */
    path: string;
}
export {};
//# sourceMappingURL=LocalFileSystemDuplexConnector.d.ts.map