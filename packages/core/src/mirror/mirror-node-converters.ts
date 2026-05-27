import type {
    MirrorAccountInfo,
    Balance,
    TokenBalance,
    Nft,
    MirrorTokenInfo,
    MirrorTopicMessage,
    TransactionInfo,
    Transfer,
    TokenTransferInfo,
    NftTransferInfo,
    StakingRewardTransfer,
    ExchangeRate,
    NetworkStake,
    Page,
    MirrorCustomFee,
    MirrorFixedFee,
    MirrorFractionalFee,
    MirrorRoyaltyFee,
    MirrorPageResponse,
    MirrorAccountResponse,
    MirrorNft,
    MirrorTokenResponse,
    MirrorTopicMessageRaw,
    MirrorTransaction,
    MirrorTransfer,
    MirrorTokenTransfer,
    MirrorNftTransfer,
    MirrorStakingRewardTransfer,
    MirrorExchangeRate,
    MirrorNetworkStakeResponse,
} from "../types/index.js";

// ─── Page ────────────────────────────────────────────────────────

export function convertPage<TRaw, TOut>(
    raw: MirrorPageResponse<TRaw>,
    converter: (item: TRaw) => TOut,
): Page<TOut> {
    // The mirror node returns arrays under different keys (nfts, tokens, messages, transactions).
    // Find the first array value that isn't 'links'.
    const dataKey = Object.keys(raw).find(
        (k) => k !== "links" && Array.isArray(raw[k]),
    );
    const items = dataKey ? (raw[dataKey] as TRaw[]) : [];
    return {
        data: items.map(converter),
        links: { next: raw.links?.next ?? null },
    };
}

// ─── Accounts ────────────────────────────────────────────────────

export function convertAccountInfo(
    raw: MirrorAccountResponse,
): MirrorAccountInfo {
    return {
        accountId: raw.account,
        evmAddress: raw.evm_address,
        key: raw.key?.key,
        balance: raw.balance?.balance ?? 0,
        deleted: raw.deleted ?? false,
        autoRenewPeriod: raw.auto_renew_period,
        memo: raw.memo,
        maxAutomaticTokenAssociations: raw.max_automatic_token_associations,
        stakedAccountId: raw.staked_account_id,
        stakedNodeId: raw.staked_node_id,
        stakePeriodStart: raw.stake_period_start,
        createdTimestamp: raw.created_timestamp,
        expirationTimestamp: raw.expiry_timestamp,
    };
}

export function convertBalance(
    accountId: string,
    raw: MirrorAccountResponse,
): Balance {
    const tokens: TokenBalance[] = (raw.balance?.tokens ?? []).map((t) => ({
        tokenId: t.token_id,
        balance: String(t.balance),
        decimals: t.decimals,
    }));
    return {
        accountId,
        hbars: String(raw.balance?.balance ?? 0),
        tokens,
    };
}

// ─── NFTs ────────────────────────────────────────────────────────

export function convertNft(raw: MirrorNft): Nft {
    return {
        tokenId: raw.token_id,
        serialNumber: raw.serial_number,
        accountId: raw.account_id,
        metadata: raw.metadata,
        createdTimestamp: raw.created_timestamp,
        deleted: raw.deleted,
        delegatingSpender: raw.delegating_spender,
        spender: raw.spender,
    };
}

// ─── Tokens ──────────────────────────────────────────────────────

export function convertTokenInfo(raw: MirrorTokenResponse): MirrorTokenInfo {
    const customFees: MirrorCustomFee[] = [];
    if (raw.custom_fees) {
        for (const f of raw.custom_fees.fixed_fees ?? []) {
            customFees.push({
                type: "fixed",
                amount: f.amount,
                collectorAccountId: f.collector_account_id,
                allCollectorsAreExempt: f.all_collectors_are_exempt,
                denominatingTokenId: f.denominating_token_id,
            } as MirrorFixedFee);
        }
        for (const f of raw.custom_fees.fractional_fees ?? []) {
            customFees.push({
                type: "fractional",
                numerator: f.numerator,
                denominator: f.denominator,
                min: f.minimum,
                max: f.maximum,
                netOfTransfers: f.net_of_transfers,
                collectorAccountId: f.collector_account_id,
                allCollectorsAreExempt: f.all_collectors_are_exempt,
            } as MirrorFractionalFee);
        }
        for (const f of raw.custom_fees.royalty_fees ?? []) {
            customFees.push({
                type: "royalty",
                numerator: f.numerator,
                denominator: f.denominator,
                fallbackFee: f.fallback_fee
                    ? {
                          amount: f.fallback_fee.amount,
                          denominatingTokenId:
                              f.fallback_fee.denominating_token_id,
                      }
                    : undefined,
                collectorAccountId: f.collector_account_id,
                allCollectorsAreExempt: f.all_collectors_are_exempt,
            } as MirrorRoyaltyFee);
        }
    }

    return {
        tokenId: raw.token_id,
        name: raw.name,
        symbol: raw.symbol,
        type:
            raw.type === "NON_FUNGIBLE_UNIQUE"
                ? "NON_FUNGIBLE_UNIQUE"
                : "FUNGIBLE_COMMON",
        decimals: parseInt(raw.decimals, 10),
        totalSupply: raw.total_supply,
        maxSupply: raw.max_supply,
        treasuryAccountId: raw.treasury_account_id,
        adminKey: raw.admin_key?.key,
        supplyKey: raw.supply_key?.key,
        freezeKey: raw.freeze_key?.key,
        wipeKey: raw.wipe_key?.key,
        kycKey: raw.kyc_key?.key,
        pauseKey: raw.pause_key?.key,
        feeScheduleKey: raw.fee_schedule_key?.key,
        deleted: raw.deleted,
        paused: raw.pause_status === "PAUSED",
        customFees,
        createdTimestamp: raw.created_timestamp,
        expirationTimestamp: raw.expiry_timestamp,
        memo: raw.memo,
    };
}

// ─── Topics ──────────────────────────────────────────────────────

export function convertTopicMessage(
    raw: MirrorTopicMessageRaw,
): MirrorTopicMessage {
    return {
        topicId: raw.topic_id,
        sequenceNumber: String(raw.sequence_number),
        message: raw.message,
        runningHash: raw.running_hash,
        consensusTimestamp: raw.consensus_timestamp,
        payerAccountId: raw.payer_account_id,
    };
}

// ─── Transactions ────────────────────────────────────────────────

export function convertTransactionInfo(
    raw: MirrorTransaction,
): TransactionInfo {
    return {
        transactionId: raw.transaction_id,
        type: raw.name?.toUpperCase().replace(/ /g, "") ?? "",
        name: raw.name ?? "",
        result: raw.result,
        consensusTimestamp: raw.consensus_timestamp,
        validStartTimestamp: raw.valid_start_timestamp,
        successful: raw.result === "SUCCESS",
        chargedTxFee: raw.charged_tx_fee,
        memo: raw.memo_base64 ? atob(raw.memo_base64) : undefined,
        transfers: (raw.transfers ?? []).map(convertTransfer),
        tokenTransfers: (raw.token_transfers ?? []).map(convertTokenTransfer),
        nftTransfers: (raw.nft_transfers ?? []).map(convertNftTransfer),
        stakingRewardTransfers: (raw.staking_reward_transfers ?? []).map(
            convertStakingRewardTransfer,
        ),
    };
}

function convertTransfer(raw: MirrorTransfer): Transfer {
    return {
        accountId: raw.account,
        amount: raw.amount,
        isApproval: raw.is_approval,
    };
}

function convertTokenTransfer(raw: MirrorTokenTransfer): TokenTransferInfo {
    return {
        tokenId: raw.token_id,
        accountId: raw.account,
        amount: raw.amount,
    };
}

function convertNftTransfer(raw: MirrorNftTransfer): NftTransferInfo {
    return {
        tokenId: raw.token_id,
        serialNumber: raw.serial_number,
        senderAccountId: raw.sender_account_id,
        receiverAccountId: raw.receiver_account_id,
    };
}

function convertStakingRewardTransfer(
    raw: MirrorStakingRewardTransfer,
): StakingRewardTransfer {
    return {
        accountId: raw.account,
        amount: raw.amount,
    };
}

// ─── Network ─────────────────────────────────────────────────────

export function convertExchangeRate(raw: MirrorExchangeRate): ExchangeRate {
    return {
        hbarEquivalent: raw.hbar_equivalent,
        centEquivalent: raw.cent_equivalent,
        expirationTime: String(raw.expiration_time),
    };
}

export function convertNetworkStake(
    raw: MirrorNetworkStakeResponse,
): NetworkStake {
    return {
        maxStakeRewarded: raw.max_stake_rewarded,
        maxStakingRewardRatePerHbar: raw.max_staking_reward_rate_per_hbar,
        maxTotalReward: raw.max_total_reward,
        nodeRewardFeeFraction: raw.node_reward_fee_fraction,
        reservedStakingRewards: raw.reserved_staking_rewards,
        rewardBalanceThreshold: raw.reward_balance_threshold,
        stakeTotal: raw.stake_total,
        stakingPeriod: raw.staking_period,
        stakingPeriodDuration: raw.staking_period_duration,
        stakingPeriodsStored: raw.staking_periods_stored,
        unreservedStakingRewardBalance: raw.unreserved_staking_reward_balance,
    };
}
