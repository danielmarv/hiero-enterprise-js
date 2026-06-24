import type { FileAppendOptions, FileContents } from "../../../types/index.js";

/**
 * Validates options for appending to a file before building the transaction.
 */
export class AppendFileValidator {
    validate(contents: FileContents, options: FileAppendOptions): void {
        this.validateContents(contents);
        this.validateChunkSize(options.chunkSize);
    }

    private validateContents(contents: FileContents): void {
        if (typeof contents === "string") {
            if (contents.length === 0) {
                throw new Error("Append contents must not be empty");
            }
        } else if (contents.length === 0) {
            throw new Error("Append contents must not be empty");
        }
    }

    private validateChunkSize(chunkSize: number | undefined): void {
        if (
            chunkSize != null &&
            (!Number.isInteger(chunkSize) || chunkSize <= 0)
        ) {
            throw new Error("chunkSize must be a positive integer");
        }
    }
}
