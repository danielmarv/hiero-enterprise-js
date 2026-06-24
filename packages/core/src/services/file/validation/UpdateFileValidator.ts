import type { FileUpdateOptions } from "../../../types/index.js";

/**
 * Validates options for updating a file before building the transaction.
 */
export class UpdateFileValidator {
    validate(options: FileUpdateOptions, hasContents: boolean): void {
        this.validateChunkSize(options.chunkSize);
        this.assertHasUpdateField(options, hasContents);
    }

    private validateChunkSize(chunkSize: number | undefined): void {
        if (
            chunkSize != null &&
            (!Number.isInteger(chunkSize) || chunkSize <= 0)
        ) {
            throw new Error("chunkSize must be a positive integer");
        }
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
}
