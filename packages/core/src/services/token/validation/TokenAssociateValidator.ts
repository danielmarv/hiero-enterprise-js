import { normalizeError } from "../../../errors/index.js";
import type { TokenAssociateOperationOptions } from "../operations/TokenAssociateOperation.js";

/**
 * Validates `TokenAssociateOperationOptions` before they reach the SDK.
 */
export class TokenAssociateValidator {
    validate(options: TokenAssociateOperationOptions): void {
        this.validateAccountId(options);
        this.validateTokenId(options);
    }

    private validateAccountId(options: TokenAssociateOperationOptions): void {
        if (options.accountId == null) {
            throw normalizeError(
                new Error("accountId is required."),
                "TokenAssociateValidator",
            );
        }

        if (
            typeof options.accountId === "string" &&
            options.accountId.trim().length === 0
        ) {
            throw normalizeError(
                new Error("accountId cannot be empty."),
                "TokenAssociateValidator",
            );
        }
    }

    private validateTokenId(options: TokenAssociateOperationOptions): void {
        if (options.tokenId == null) {
            throw normalizeError(
                new Error("tokenId is required."),
                "TokenAssociateValidator",
            );
        }

        if (
            typeof options.tokenId === "string" &&
            options.tokenId.trim().length === 0
        ) {
            throw normalizeError(
                new Error("tokenId cannot be empty."),
                "TokenAssociateValidator",
            );
        }
    }
}
