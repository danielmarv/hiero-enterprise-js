import type { HieroConfig } from "../config/index.js";
import { resolveMirrorNodeUrl } from "../config/index.js";
import { HieroContext } from "../context/index.js";
import { MirrorNodeClient } from "../mirror/index.js";
import {
    AccountRepository,
    NftRepository,
    TokenRepository,
    TopicRepository,
    TransactionRepository,
    NetworkRepository,
} from "../repositories/index.js";
import {
    AccountClient,
    FileClient,
    FungibleTokenClient,
    NftClient,
    SmartContractClient,
    TopicClient,
} from "../services/index.js";
import type { HieroServices } from "../types/index.js";

export interface HieroRuntime extends HieroServices {
    mirrorNodeClient: MirrorNodeClient;
    close(): void;
}

/**
 * Create the full Hiero runtime graph used by framework adapters.
 */
export function createHieroRuntime(config?: HieroConfig): HieroRuntime {
    const context = new HieroContext(config);
    const mirrorNodeUrl = resolveMirrorNodeUrl(
        context.config.network,
        context.config.mirrorNodeUrl,
    );
    const mirrorNodeClient = new MirrorNodeClient(mirrorNodeUrl, {
        timeoutMs: context.config.mirrorNodeTimeoutMs,
        maxRetries: context.config.mirrorNodeMaxRetries,
    });

    return {
        context,
        mirrorNodeClient,
        accountClient: new AccountClient(context),
        fileClient: new FileClient(context),
        fungibleTokenClient: new FungibleTokenClient(context),
        nftClient: new NftClient(context),
        smartContractClient: new SmartContractClient(context),
        topicClient: new TopicClient(context),
        accountRepository: new AccountRepository(mirrorNodeClient),
        nftRepository: new NftRepository(mirrorNodeClient),
        tokenRepository: new TokenRepository(mirrorNodeClient),
        topicRepository: new TopicRepository(mirrorNodeClient),
        transactionRepository: new TransactionRepository(mirrorNodeClient),
        networkRepository: new NetworkRepository(mirrorNodeClient),
        close: () => context.close(),
    };
}

/**
 * Adapter-facing helper when only the public services surface is needed.
 */
export function createHieroServices(config?: HieroConfig): HieroServices {
    const {
        mirrorNodeClient: _mirrorNodeClient,
        close: _close,
        ...services
    } = createHieroRuntime(config);
    return services;
}
