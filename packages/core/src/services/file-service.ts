import {
    FileAppendTransaction,
    FileContentsQuery,
    FileCreateTransaction,
    FileDeleteTransaction,
    FileInfoQuery,
    FileUpdateTransaction,
} from "@hiero-ledger/sdk";
import type {
    FileInfo as SdkFileInfo,
    Transaction,
    TransactionReceipt,
} from "@hiero-ledger/sdk";
import type { IHieroContext } from "../context/index.js";
import { normalizeError } from "../errors/index.js";
import type { TransactionEvent } from "../listeners/index.js";
import type {
    FileAppendOptions,
    FileContents,
    FileCreateOptions,
    FileDeleteOptions,
    FileIdLike,
    FileInfo,
    FileUpdateOptions,
} from "../types/index.js";
import { TransactionExecutor } from "./transaction/index.js";
import type { TransactionOptions } from "./transaction/index.js";

/** Default chunk size for file operations (4KB). */
const DEFAULT_CHUNK_SIZE = 4096;

/**
 * Service for managing files on the Hiero network.
 *
 * Covers FileCreateTransaction, FileAppendTransaction, FileUpdateTransaction,
 * FileDeleteTransaction, FileContentsQuery, and FileInfoQuery.
 */
export class FileService {
    private readonly executor: TransactionExecutor;

    constructor(private readonly context: IHieroContext) {
        this.executor = new TransactionExecutor(context);
    }

    /**
     * Create a new file.
     *
     * Existing positional usage is preserved:
     * `createFile(contents, expirationTime?)`.
     */
    async createFile(
        contents: FileContents,
        expirationTime?: Date,
    ): Promise<string>;
    async createFile(options?: FileCreateOptions): Promise<string>;
    async createFile(
        contentsOrOptions: FileContents | FileCreateOptions = new Uint8Array(),
        expirationTime?: Date,
    ): Promise<string> {
        const options = this.normalizeCreateOptions(
            contentsOrOptions,
            expirationTime,
        );

        try {
            const contents = this.toBytes(options.contents ?? new Uint8Array());
            const chunkSize = this.resolveChunkSize(options.chunkSize);
            const firstChunk = contents.slice(0, chunkSize);

            const tx = new FileCreateTransaction()
                .setKeys(options.keys ?? [this.context.operatorPublicKey])
                .setContents(firstChunk);

            if (options.expirationTime != null) {
                tx.setExpirationTime(options.expirationTime);
            }

            if (options.fileMemo != null) {
                tx.setFileMemo(options.fileMemo);
            }

            const fileId = await this.runTransaction(
                tx,
                options,
                "FileCreate",
                "createFile",
                (receipt) => receipt.fileId!.toString(),
            );

            if (contents.length > chunkSize) {
                await this.appendFile(
                    fileId,
                    contents.slice(chunkSize),
                    this.toAppendOptions(options, chunkSize),
                );
            }

            return fileId;
        } catch (error) {
            throw normalizeError(error, "FileService.createFile");
        }
    }

    /**
     * Append contents to an existing file.
     *
     * Uses the SDK's `FileAppendTransaction` chunking support for payloads
     * larger than one file chunk.
     */
    async appendFile(
        fileId: FileIdLike,
        contents: FileContents,
        options: FileAppendOptions = {},
    ): Promise<void> {
        try {
            const bytes = this.toBytes(contents);
            const chunkSize = this.resolveChunkSize(options.chunkSize);

            const tx = new FileAppendTransaction()
                .setFileId(fileId)
                .setContents(bytes)
                .setChunkSize(chunkSize)
                .setMaxChunks(
                    options.maxChunks ??
                        this.getRequiredChunks(bytes, chunkSize),
                );

            if (options.chunkInterval != null) {
                tx.setChunkInterval(options.chunkInterval);
            }

            await this.runTransaction(
                tx,
                options,
                "FileAppend",
                "appendFile",
                () => undefined,
            );
        } catch (error) {
            throw normalizeError(error, "FileService.appendFile");
        }
    }

    /**
     * Retrieve the binary contents of a file using `FileContentsQuery`.
     */
    async getFileContents(fileId: FileIdLike): Promise<Uint8Array> {
        return await this.fetchFileContents(fileId, "getFileContents");
    }

    /**
     * Read the contents of a file.
     *
     * Kept as a compatibility alias for `getFileContents`.
     */
    async readFile(fileId: FileIdLike): Promise<Uint8Array> {
        return await this.fetchFileContents(fileId, "readFile");
    }

    /**
     * Update file contents, keys, expiration, or memo.
     *
     * Existing positional usage is preserved:
     * `updateFile(fileId, contents)`.
     */
    async updateFile(fileId: FileIdLike, contents: FileContents): Promise<void>;
    async updateFile(
        fileId: FileIdLike,
        options: FileUpdateOptions,
    ): Promise<void>;
    async updateFile(
        fileId: FileIdLike,
        contentsOrOptions: FileContents | FileUpdateOptions,
    ): Promise<void> {
        await this.updateFileInternal(
            fileId,
            this.normalizeUpdateOptions(contentsOrOptions),
            "updateFile",
        );
    }

    /**
     * Delete a file using `FileDeleteTransaction`.
     */
    async deleteFile(
        fileId: FileIdLike,
        options: FileDeleteOptions = {},
    ): Promise<void> {
        try {
            const tx = new FileDeleteTransaction().setFileId(fileId);

            await this.runTransaction(
                tx,
                options,
                "FileDelete",
                "deleteFile",
                () => undefined,
            );
        } catch (error) {
            throw normalizeError(error, "FileService.deleteFile");
        }
    }

    /**
     * Update the expiration time of a file.
     */
    async updateExpirationTime(
        fileId: FileIdLike,
        expirationTime: Date,
        options: TransactionOptions = {},
    ): Promise<void> {
        await this.updateFileInternal(
            fileId,
            { ...options, expirationTime },
            "updateExpirationTime",
        );
    }

    /**
     * Retrieve file metadata using `FileInfoQuery`.
     */
    async getFileInfo(fileId: FileIdLike): Promise<FileInfo> {
        return await this.fetchFileInfo(fileId, "getFileInfo");
    }

    /**
     * Check if a file has been deleted.
     */
    async isDeleted(fileId: FileIdLike): Promise<boolean> {
        const info = await this.fetchFileInfo(fileId, "isDeleted");
        return info.isDeleted;
    }

    /**
     * Get the size of a file in bytes.
     */
    async getSize(fileId: FileIdLike): Promise<number> {
        const info = await this.fetchFileInfo(fileId, "getSize");
        return info.size;
    }

    /**
     * Get the expiration time of a file.
     */
    async getExpirationTime(fileId: FileIdLike): Promise<Date> {
        const info = await this.fetchFileInfo(fileId, "getExpirationTime");
        return info.expirationTime;
    }

    private async updateFileInternal(
        fileId: FileIdLike,
        options: FileUpdateOptions,
        methodName: string,
    ): Promise<void> {
        try {
            const hasContents = options.contents !== undefined;
            const contents = hasContents
                ? this.toBytes(options.contents!)
                : undefined;
            const chunkSize = this.resolveChunkSize(options.chunkSize);

            this.assertHasUpdateField(options, hasContents);

            const tx = new FileUpdateTransaction().setFileId(fileId);

            if (hasContents) {
                tx.setContents(contents!.slice(0, chunkSize));
            }

            if (options.keys != null) {
                tx.setKeys(options.keys);
            }

            if (options.expirationTime != null) {
                tx.setExpirationTime(options.expirationTime);
            }

            if (options.fileMemo !== undefined) {
                if (options.fileMemo === null) {
                    tx.clearFileMemo();
                } else {
                    tx.setFileMemo(options.fileMemo);
                }
            }

            await this.runTransaction(
                tx,
                options,
                "FileUpdate",
                methodName,
                () => undefined,
            );

            if (contents != null && contents.length > chunkSize) {
                await this.appendFile(
                    fileId,
                    contents.slice(chunkSize),
                    this.toAppendOptions(options, chunkSize),
                );
            }
        } catch (error) {
            throw normalizeError(error, `FileService.${methodName}`);
        }
    }

    private async fetchFileContents(
        fileId: FileIdLike,
        methodName: string,
    ): Promise<Uint8Array> {
        try {
            return await new FileContentsQuery()
                .setFileId(fileId)
                .execute(this.context.client);
        } catch (error) {
            throw normalizeError(error, `FileService.${methodName}`);
        }
    }

    private async fetchFileInfo(
        fileId: FileIdLike,
        methodName: string,
    ): Promise<FileInfo> {
        try {
            const info = await new FileInfoQuery()
                .setFileId(fileId)
                .execute(this.context.client);
            return this.mapFileInfo(info);
        } catch (error) {
            throw normalizeError(error, `FileService.${methodName}`);
        }
    }

    private async runTransaction<TResult>(
        tx: Transaction,
        options: TransactionOptions,
        type: string,
        methodName: string,
        processReceipt: (
            receipt: TransactionReceipt,
            transactionId: string,
        ) => TResult,
    ): Promise<TResult> {
        return await this.executor.run(
            tx,
            options,
            this.createEvent(type, methodName),
            processReceipt,
        );
    }

    private createEvent(type: string, methodName: string): TransactionEvent {
        return {
            type,
            serviceName: "FileService",
            methodName,
            timestamp: new Date(),
        };
    }

    private normalizeCreateOptions(
        contentsOrOptions: FileContents | FileCreateOptions,
        expirationTime?: Date,
    ): FileCreateOptions {
        if (this.isFileContents(contentsOrOptions)) {
            return { contents: contentsOrOptions, expirationTime };
        }
        return contentsOrOptions;
    }

    private normalizeUpdateOptions(
        contentsOrOptions: FileContents | FileUpdateOptions,
    ): FileUpdateOptions {
        if (this.isFileContents(contentsOrOptions)) {
            return { contents: contentsOrOptions };
        }
        return contentsOrOptions;
    }

    private toAppendOptions(
        options: FileCreateOptions | FileUpdateOptions,
        chunkSize: number,
    ): FileAppendOptions {
        return { ...options, chunkSize };
    }

    private isFileContents(value: unknown): value is FileContents {
        return typeof value === "string" || value instanceof Uint8Array;
    }

    private toBytes(contents: FileContents): Uint8Array {
        return typeof contents === "string" ? Buffer.from(contents) : contents;
    }

    private resolveChunkSize(chunkSize: number | undefined): number {
        if (chunkSize == null) {
            return DEFAULT_CHUNK_SIZE;
        }

        if (!Number.isInteger(chunkSize) || chunkSize <= 0) {
            throw new Error("chunkSize must be a positive integer");
        }

        return chunkSize;
    }

    private getRequiredChunks(contents: Uint8Array, chunkSize: number): number {
        return Math.max(1, Math.ceil(contents.length / chunkSize));
    }

    private assertHasUpdateField(
        options: FileUpdateOptions,
        hasContents: boolean,
    ): void {
        if (
            !hasContents &&
            options.keys == null &&
            options.expirationTime == null &&
            options.fileMemo === undefined
        ) {
            throw new Error("At least one file update field must be provided");
        }
    }

    private mapFileInfo(info: SdkFileInfo): FileInfo {
        return {
            fileId: info.fileId.toString(),
            size: info.size.toNumber(),
            expirationTime: info.expirationTime.toDate(),
            isDeleted: info.isDeleted,
            keys: info.keys.toArray().map((key) => key.toString()),
            fileMemo: info.fileMemo,
            ledgerId: info.ledgerId?.toString(),
        };
    }
}
