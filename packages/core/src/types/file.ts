import type { FileId, Key, KeyList, Timestamp } from "@hiero-ledger/sdk";
import type { TransactionOptions } from "../services/transaction/index.js";

/** File contents accepted by File Service transactions. */
export type FileContents = Uint8Array | string;

/** File ID input accepted by File Service methods. */
export type FileIdLike = string | FileId;

/** Chunking controls for file create, append, and update operations. */
export interface FileChunkOptions {
    /** Bytes per file transaction chunk. Defaults to 4096. */
    chunkSize?: number;
    /** Maximum append chunks allowed for one SDK append transaction. */
    maxChunks?: number;
    /** Valid-start interval between append chunks, in nanoseconds. */
    chunkInterval?: number;
}

/** Options for creating a file with `FileCreateTransaction`. */
export interface FileCreateOptions
    extends TransactionOptions, FileChunkOptions {
    /** Initial file contents. Omit to create an empty file. */
    contents?: FileContents;
    /** File modification keys. Defaults to the operator public key. */
    keys?: Key[] | KeyList;
    /** File expiry timestamp. */
    expirationTime?: Timestamp | Date;
    /** File-level memo. */
    fileMemo?: string;
}

/** Options for appending contents with `FileAppendTransaction`. */
export interface FileAppendOptions
    extends TransactionOptions, FileChunkOptions {}

/** Options for updating a file with `FileUpdateTransaction`. */
export interface FileUpdateOptions
    extends TransactionOptions, FileChunkOptions {
    /** Replacement file contents. Omit to leave contents unchanged. */
    contents?: FileContents;
    /** Replacement file modification keys. */
    keys?: Key[] | KeyList;
    /** Replacement file expiry timestamp. */
    expirationTime?: Timestamp | Date;
    /** Replacement file-level memo. Use null to clear it. */
    fileMemo?: string | null;
}

/** Options for deleting a file with `FileDeleteTransaction`. */
export type FileDeleteOptions = TransactionOptions;

/** Normalized metadata returned from `FileInfoQuery`. */
export interface FileInfo {
    /** File ID. */
    fileId: string;
    /** Current file contents size in bytes. */
    size: number;
    /** Current expiration time. */
    expirationTime: Date;
    /** Whether the file has been deleted but not expired. */
    isDeleted: boolean;
    /** File modification keys as string representations. */
    keys: string[];
    /** File-level memo. */
    fileMemo: string;
    /** Ledger ID, when returned by the SDK. */
    ledgerId?: string;
}
