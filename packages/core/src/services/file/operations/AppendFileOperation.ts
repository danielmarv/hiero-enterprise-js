import { FileAppendTransaction } from "@hiero-ledger/sdk";
import type { IHieroContext } from "../../../context/index.js";
import { normalizeError } from "../../../errors/index.js";
import type {
    FileAppendOptions,
    FileContents,
    FileIdLike,
} from "../../../types/index.js";
import { TransactionExecutor } from "../../transaction/index.js";
import { AppendFileValidator } from "../validation/index.js";

/** Default chunk size for file operations (4KB). */
const DEFAULT_CHUNK_SIZE = 4096;

export class AppendFileOperation {
    private readonly executor: TransactionExecutor;
    private readonly validator: AppendFileValidator;

    constructor(private readonly context: IHieroContext) {
        this.executor = new TransactionExecutor(context);
        this.validator = new AppendFileValidator();
    }

    /**
     * Append contents to an existing file.
     *
     * Uses the SDK's `FileAppendTransaction` chunking support for payloads
     * larger than one file chunk.
     */
    async execute(
        fileId: FileIdLike,
        contents: FileContents,
        options: FileAppendOptions = {},
    ): Promise<void> {
        this.validator.validate(contents, options);

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
        } catch (error) {
            throw normalizeError(error, "FileService.appendFile");
        }
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
