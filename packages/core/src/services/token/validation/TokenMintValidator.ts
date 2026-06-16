import { normalizeError } from "../../../errors/index.js";
import type { TokenMintOperationOptions } from "../operations/TokenMintOperation.js";

/**
 * Validates `TokenMintOperationOptions` before they reach the SDK.
 */
export class TokenMintValidator {
    validate(options: TokenMintOperationOptions): void {
        this.validateTokenId(options);
        this.validateAmountOrMetadata(options);
        this.validateAmount(options);
        this.validateMetadata(options);
    }

    private validateTokenId(options: TokenMintOperationOptions): void {
        if (options.tokenId == null) {
            throw normalizeError(
                new Error("tokenId is required."),
                "TokenMintValidator",
            );
        }

        if (
            typeof options.tokenId === "string" &&
            options.tokenId.trim().length === 0
        ) {
            throw normalizeError(
                new Error("tokenId cannot be empty."),
                "TokenMintValidator",
            );
        }
    }

    private validateAmountOrMetadata(options: TokenMintOperationOptions): void {
        const hasAmount = options.amount != null;
        const hasMetadata =
            options.metadata != null && options.metadata.length > 0;

        if (!hasAmount && !hasMetadata) {
            throw normalizeError(
                new Error(
                    "Token mint requires either amount (fungible) or metadata (NFT).",
                ),
                "TokenMintValidator",
            );
        }
    }

    private validateAmount(options: TokenMintOperationOptions): void {
        if (typeof options.amount === "number" && options.amount < 0) {
            throw normalizeError(
                new Error("amount cannot be negative."),
                "TokenMintValidator",
            );
        }
    }

    private validateMetadata(options: TokenMintOperationOptions): void {
        if (options.metadata != null && options.metadata.length === 0) {
            throw normalizeError(
                new Error("metadata cannot be an empty array."),
                "TokenMintValidator",
            );
        }
    }
}
