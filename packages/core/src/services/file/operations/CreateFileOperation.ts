import { FileAppendTransaction, FileCreateTransaction } from "@hiero-ledger/sdk";
import type { IHieroContext } from "../../../context/index.js";
import { normalizeError } from "../../../errors/index.js";
import type {
    FileAppendOptions,
    FileContents,
    FileCreateOptions,
} from "../../../types/index.js";
import { TransactionExecutor } from "../../transaction/index.js";
import { CreateFileValidator } from "../validation/index.js";

/** Default chunk size for file operations (4KB). */
const DEFAULT_CHUNK_SIZE = 4096;

export class CreateFileOperation {
    private readonly executor: TransactionExecutor;
    private readonly validator: CreateFileValidator;

    constructor(private readonly context: IHieroContext) {
        this.executor = new TransactionExecutor(context);
        this.validator = new CreateFileValidator();
    }

    /**
     * Create a new file.
     *
     * Existing positional usage is preserved:
     * `execute(contents, expirationTime?)`.
     */
    async execute(
        contents: FileContents,
        expirationTime?: Date,
    ): Promise<string>;
    async execute(options?: FileCreateOptions): Promise<string>;
    async execute(
        contentsOrOptions: FileContents | FileCreateOptions = new Uint8Array(),
        expirationTime?: Date,
    ): Promise<string> {
        const options = this.normalizeCreateOptions(
            contentsOrOptions,
            expirationTime,
        );
        this.validator.validate(options);

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

            const fileId = await this.executor.run(
                tx,
                options,
                {
                    type: "FileCreate",
                    serviceName: "FileService",
                    methodName: "createFile",
                    timestamp: new Date(),
                },
                (receipt) => receipt.fileId!.toString(),
            );

            if (contents.length > chunkSize) {
                await this.appendRemaining(
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

    private async appendRemaining(
        fileId: string,
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

    private normalizeCreateOptions(
        contentsOrOptions: FileContents | FileCreateOptions,
        expirationTime?: Date,
    ): FileCreateOptions {
        if (this.isFileContents(contentsOrOptions)) {
            return { contents: contentsOrOptions, expirationTime };
        }
        return contentsOrOptions;
    }

    private toAppendOptions(
        options: FileCreateOptions,
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
