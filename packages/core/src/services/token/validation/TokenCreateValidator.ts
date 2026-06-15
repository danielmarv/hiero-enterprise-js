import { TokenType, TokenSupplyType } from "@hiero-ledger/sdk";
import { normalizeError } from "../../../errors/index.js";
import type { TokenCreateOperationOptions } from "../operations/TokenCreateOperation.js";

const MAX_TOKEN_NAME_BYTES = 100;
const MAX_TOKEN_SYMBOL_BYTES = 100;
const MAX_TOKEN_MEMO_BYTES = 100;

/**
 * Validates `TokenCreateOperationOptions` before they reach the SDK.
 *
 * Separated from the operation so validation logic is independently
 * testable without requiring network interaction.
 */
export class TokenCreateValidator {
    /**
     * Validate the caller-provided options prior to building or submitting
     * the transaction.
     *
     * @throws {HieroError} If validation fails
     */
    validate(options: TokenCreateOperationOptions): void {
        this.validateName(options);
        this.validateSymbol(options);
        this.validateTreasury(options);
        this.validateNumericRanges(options);
        this.validateMemo(options);
        this.validateSupplyConstraints(options);
        this.validateNftConstraints(options);
    }

    private validateName(options: TokenCreateOperationOptions): void {
        if (options.tokenName == null || options.tokenName.length === 0) {
            throw normalizeError(
                new Error("tokenName is required."),
                "TokenCreateValidator",
            );
        }

        const byteLength = Buffer.byteLength(options.tokenName, "utf8");
        if (byteLength > MAX_TOKEN_NAME_BYTES) {
            throw normalizeError(
                new Error(
                    `tokenName exceeds ${MAX_TOKEN_NAME_BYTES} bytes (got ${byteLength}).`,
                ),
                "TokenCreateValidator",
            );
        }
    }

    private validateSymbol(options: TokenCreateOperationOptions): void {
        if (options.tokenSymbol == null || options.tokenSymbol.length === 0) {
            throw normalizeError(
                new Error("tokenSymbol is required."),
                "TokenCreateValidator",
            );
        }

        const byteLength = Buffer.byteLength(options.tokenSymbol, "utf8");
        if (byteLength > MAX_TOKEN_SYMBOL_BYTES) {
            throw normalizeError(
                new Error(
                    `tokenSymbol exceeds ${MAX_TOKEN_SYMBOL_BYTES} bytes (got ${byteLength}).`,
                ),
                "TokenCreateValidator",
            );
        }
    }

    private validateTreasury(options: TokenCreateOperationOptions): void {
        if (options.treasuryAccountId == null) {
            throw normalizeError(
                new Error("treasuryAccountId is required."),
                "TokenCreateValidator",
            );
        }

        if (
            typeof options.treasuryAccountId === "string" &&
            options.treasuryAccountId.trim().length === 0
        ) {
            throw normalizeError(
                new Error("treasuryAccountId cannot be empty."),
                "TokenCreateValidator",
            );
        }
    }

    private validateNumericRanges(options: TokenCreateOperationOptions): void {
        if (typeof options.decimals === "number" && options.decimals < 0) {
            throw normalizeError(
                new Error("decimals cannot be negative."),
                "TokenCreateValidator",
            );
        }

        if (
            typeof options.initialSupply === "number" &&
            options.initialSupply < 0
        ) {
            throw normalizeError(
                new Error("initialSupply cannot be negative."),
                "TokenCreateValidator",
            );
        }

        if (typeof options.maxSupply === "number" && options.maxSupply < 0) {
            throw normalizeError(
                new Error("maxSupply cannot be negative."),
                "TokenCreateValidator",
            );
        }
    }

    private validateMemo(options: TokenCreateOperationOptions): void {
        if (options.tokenMemo == null) return;

        const byteLength = Buffer.byteLength(options.tokenMemo, "utf8");
        if (byteLength > MAX_TOKEN_MEMO_BYTES) {
            throw normalizeError(
                new Error(
                    `tokenMemo exceeds ${MAX_TOKEN_MEMO_BYTES} bytes (got ${byteLength}).`,
                ),
                "TokenCreateValidator",
            );
        }
    }

    private validateSupplyConstraints(
        options: TokenCreateOperationOptions,
    ): void {
        if (options.supplyType !== TokenSupplyType.Finite) return;

        if (options.maxSupply == null) {
            throw normalizeError(
                new Error("supplyType Finite requires maxSupply to be set."),
                "TokenCreateValidator",
            );
        }

        if (typeof options.maxSupply === "number" && options.maxSupply <= 0) {
            throw normalizeError(
                new Error(
                    "maxSupply must be greater than 0 for finite supply.",
                ),
                "TokenCreateValidator",
            );
        }
    }

    private validateNftConstraints(options: TokenCreateOperationOptions): void {
        if (options.tokenType !== TokenType.NonFungibleUnique) return;

        if (options.supplyKey == null) {
            throw normalizeError(
                new Error(
                    "Non-fungible tokens require a supplyKey — NFTs are minted after collection creation.",
                ),
                "TokenCreateValidator",
            );
        }

        if (typeof options.decimals === "number" && options.decimals !== 0) {
            throw normalizeError(
                new Error("Non-fungible tokens must have decimals: 0."),
                "TokenCreateValidator",
            );
        }

        if (
            typeof options.initialSupply === "number" &&
            options.initialSupply !== 0
        ) {
            throw normalizeError(
                new Error("Non-fungible tokens must have initialSupply: 0."),
                "TokenCreateValidator",
            );
        }
    }
}
