import type { IHieroContext } from "../../context/index.js";
import type {
    FileAppendOptions,
    FileContents,
    FileCreateOptions,
    FileDeleteOptions,
    FileIdLike,
    FileInfo,
    FileUpdateOptions,
} from "../../types/index.js";
import type { TransactionOptions } from "../transaction/index.js";
import {
    CreateFileOperation,
    AppendFileOperation,
    UpdateFileOperation,
    DeleteFileOperation,
} from "./operations/index.js";
import {
    FileContentsQueryHandler,
    FileInfoQueryHandler,
} from "./queries/index.js";

/**
 * Service for managing files on the Hiero network.
 *
 * Covers FileCreateTransaction, FileAppendTransaction, FileUpdateTransaction,
 * FileDeleteTransaction, FileContentsQuery, and FileInfoQuery.
 */
export class FileService {
    private readonly createOperation: CreateFileOperation;
    private readonly appendOperation: AppendFileOperation;
    private readonly updateOperation: UpdateFileOperation;
    private readonly deleteOperation: DeleteFileOperation;
    private readonly contentsQuery: FileContentsQueryHandler;
    private readonly infoQuery: FileInfoQueryHandler;

    constructor(context: IHieroContext) {
        this.createOperation = new CreateFileOperation(context);
        this.appendOperation = new AppendFileOperation(context);
        this.updateOperation = new UpdateFileOperation(context);
        this.deleteOperation = new DeleteFileOperation(context);
        this.contentsQuery = new FileContentsQueryHandler(context);
        this.infoQuery = new FileInfoQueryHandler(context);
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
        return await this.createOperation.execute(
            contentsOrOptions as FileContents,
            expirationTime,
        );
    }

    /**
     * Append contents to an existing file.
     */
    async appendFile(
        fileId: FileIdLike,
        contents: FileContents,
        options: FileAppendOptions = {},
    ): Promise<void> {
        await this.appendOperation.execute(fileId, contents, options);
    }

    /**
     * Retrieve the binary contents of a file using `FileContentsQuery`.
     */
    async getFileContents(fileId: FileIdLike): Promise<Uint8Array> {
        return await this.contentsQuery.execute(fileId);
    }

    /**
     * Read the contents of a file.
     *
     * Kept as a compatibility alias for `getFileContents`.
     */
    async readFile(fileId: FileIdLike): Promise<Uint8Array> {
        return await this.contentsQuery.execute(fileId);
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
        await this.updateOperation.execute(
            fileId,
            contentsOrOptions as FileContents,
        );
    }

    /**
     * Delete a file using `FileDeleteTransaction`.
     */
    async deleteFile(
        fileId: FileIdLike,
        options: FileDeleteOptions = {},
    ): Promise<void> {
        await this.deleteOperation.execute(fileId, options);
    }

    /**
     * Update the expiration time of a file.
     */
    async updateExpirationTime(
        fileId: FileIdLike,
        expirationTime: Date,
        options: TransactionOptions = {},
    ): Promise<void> {
        await this.updateOperation.executeUpdateExpiration(
            fileId,
            expirationTime,
            options,
        );
    }

    /**
     * Retrieve file metadata using `FileInfoQuery`.
     */
    async getFileInfo(fileId: FileIdLike): Promise<FileInfo> {
        return await this.infoQuery.execute(fileId);
    }

    /**
     * Check if a file has been deleted.
     */
    async isDeleted(fileId: FileIdLike): Promise<boolean> {
        const info = await this.infoQuery.execute(fileId);
        return info.isDeleted;
    }

    /**
     * Get the size of a file in bytes.
     */
    async getSize(fileId: FileIdLike): Promise<number> {
        const info = await this.infoQuery.execute(fileId);
        return info.size;
    }

    /**
     * Get the expiration time of a file.
     */
    async getExpirationTime(fileId: FileIdLike): Promise<Date> {
        const info = await this.infoQuery.execute(fileId);
        return info.expirationTime;
    }
}
