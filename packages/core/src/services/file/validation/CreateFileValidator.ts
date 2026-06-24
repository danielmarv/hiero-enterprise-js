import type { FileCreateOptions } from "../../../types/index.js";

/**
 * Validates options for creating a file before building the transaction.
 */
export class CreateFileValidator {
    validate(options: FileCreateOptions): void {
        this.validateChunkSize(options.chunkSize);
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
