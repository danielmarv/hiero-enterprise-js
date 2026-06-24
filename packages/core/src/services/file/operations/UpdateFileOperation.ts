import { FileAppendTransaction, FileUpdateTransaction } from "@hiero-ledger/sdk";
import type { IHieroContext } from "../../../context/index.js";
import { normalizeError } from "../../../errors/index.js";
import type {
    FileAppendOptions,
    FileContents,
    FileIdLike,
    FileUpdateOptions,
} from "../../../types/index.js";
import { TransactionExecutor } from "../../transaction/index.js";
import type { TransactionOptions } from "../../transaction/index.js";
import { UpdateFileValidator } from "../validation/index.js";

/** Default chunk size for file operations (4KB). */
const DEFAULT_CHUNK_SIZE = 4096;

export class UpdateFileOperation {
    private readonly executor: TransactionExecutor;
    private readonly validator: UpdateFileValidator;

    constructor(private readonly context: IHieroContext) {
        this.executor = new TransactionExecutor(context);
        this.validator = new UpdateFileValidator();
    }

    /**
     * Update file contents, keys, expiration, or memo.
     *
     * Existing positional usage is preserved:
     * `execute(fileId, contents)`.
     */
    async execute(fileId: FileIdLike, contents: FileContents): Promise<void>;
    async execute(
        fileId: FileIdLike,
        options: FileUpdateOptions,
    ): Promise<void>;
    async execute(
        fileId: FileIdLike,
        contentsOrOptions: FileContents | FileUpdateOptions,
    ): Promise<void> {
        await this.updateInternal(
            fileId,
            this.normalizeUpdateOptions(contentsOrOptions),
            "updateFile",
        );
    }

    /**
     * Update the expiration time of a file.
     */
    async executeUpdateExpiration(
        fileId: FileIdLike,
        expirationTime: Date,
        options: TransactionOptions = {},
    ): Promise<void> {
        await this.updateInternal(
            fileId,
            { ...options, expirationTime },
            "updateExpirationTime",
        );
    }

    private async updateInternal(
        fileId: FileIdLike,
        options: FileUpdateOptions,
        methodName: string,
    ): Promise<void> {
        const hasContents = options.contents !== undefined;
        this.validator.validate(options, hasContents);

        try {
            const contents = hasContents
                ? this.toBytes(options.contents!)
                : undefined;
            const chunkSize = this.resolveChunkSize(options.chunkSize);

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

            await this.executor.run(
                tx,
                options,
                {
                    type: "FileUpdate",
                    serviceName: "FileService",
                    methodName,
                    timestamp: new Date(),
                },
                () => undefined,
            );

            if (contents != null && contents.length > chunkSize) {
                await this.appendRemaining(
                    fileId,
                    contents.slice(chunkSize),
                    this.toAppendOptions(options, chunkSize),
                );
            }
        } catch (error) {
            throw normalizeError(error, `FileService.${methodName}`);
        }
    }

    private async appendRemaining(
        fileId: FileIdLike,
        contents: Uint8Array,
        options: FileAppendOptions,
    ): Promise<void> {
        const chunkSize = this.resolveChunkSize(options.chunkSize);

        const tx = new FileAppendTransaction()
            .setFileId(fileId)
            .setContents(contents)
            .setChunkSize(chunkSize)
            .setMaxChunks(
                options.maxChunks ?? this.getRequiredChunks(contents, chunkSize),
            );

        if (options.chunkInterval != null) {
            tx.setChunkInterval(options.chunkInterval);
        }

        await this.executor.run(
            tx,
            options,
            {
                type: "FileAppend",
                serviceName: "FileService",
                methodName: "appendFile",
                timestamp: new Date(),
            },
            () => undefined,
        );
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
        options: FileUpdateOptions,
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
        return chunkSize ?? DEFAULT_CHUNK_SIZE;
    }

    private getRequiredChunks(contents: Uint8Array, chunkSize: number): number {
        return Math.max(1, Math.ceil(contents.length / chunkSize));
    }
}
