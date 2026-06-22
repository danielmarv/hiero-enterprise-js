import type BigNumber from "bignumber.js";
import type { TokenId, AccountId, Long } from "@hiero-ledger/sdk";
import { TokenWipeTransaction } from "@hiero-ledger/sdk";
import type { IHieroContext } from "../../../context/index.js";
import { TransactionExecutor } from "../../transaction/index.js";
import type {
    TransactionOptions,
    ScheduleOptions,
    ScheduledResult,
} from "../../transaction/index.js";
import { TokenWipeValidator } from "../validation/index.js";

/**
 * Low-level options for the `TokenWipeTransaction` SDK transaction.
 *
 * Mirrors SDK props while extending `TransactionOptions`. Exactly one of
 * `amount` (fungible) or `serials` (NFT) must be supplied. The target
 * holder is identified by `accountId` — the wipe key must sign.
 */
export interface TokenWipeOperationOptions extends TransactionOptions {
    tokenId: TokenId | string;
    accountId: AccountId | string;
    amount?: Long | number | BigNumber | bigint;
    serials?: (Long | number)[];
}

export class TokenWipeOperation {
    private readonly executor: TransactionExecutor;
    private readonly validator: TokenWipeValidator;

    constructor(context: IHieroContext) {
        this.executor = new TransactionExecutor(context);
        this.validator = new TokenWipeValidator();
    }

    /**
     * Submit a `TokenWipeTransaction`.
     *
     * @returns The token's new total supply after the wipe.
     */
    async execute(options: TokenWipeOperationOptions): Promise<Long> {
        this.validator.validate(options);

        const tx = this.build(options);

        return await this.executor.run(
            tx,
            options,
            {
                type: "TokenWipe",
                serviceName: "TokenService",
                methodName: "wipeToken",
                timestamp: new Date(),
            },
            (receipt) => {
                if (receipt.totalSupply == null) {
                    throw new Error(
                        "TokenWipe receipt did not include totalSupply.",
                    );
                }
                return receipt.totalSupply;
            },
        );
    }

    /** Schedule a `TokenWipeTransaction` for deferred multi-sig execution. */
    async schedule(
        options: TokenWipeOperationOptions,
        scheduleOptions?: ScheduleOptions,
    ): Promise<ScheduledResult> {
        this.validator.validate(options);

        const tx = this.build(options);

        return await this.executor.scheduleRun(
            tx,
            options,
            {
                type: "TokenWipe",
                serviceName: "TokenService",
                methodName: "wipeToken",
                timestamp: new Date(),
            },
            scheduleOptions,
        );
    }

    private build(options: TokenWipeOperationOptions): TokenWipeTransaction {
        const tx = new TokenWipeTransaction()
            .setTokenId(options.tokenId)
            .setAccountId(options.accountId);

        if (options.amount != null) {
            tx.setAmount(options.amount);
        }

        if (options.serials != null && options.serials.length > 0) {
            tx.setSerials(options.serials);
        }

        return tx;
    }
}
