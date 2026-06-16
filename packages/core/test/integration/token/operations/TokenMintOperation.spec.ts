import { describe, it, expect, beforeAll } from "vitest";
import { setupIntegrationTestEnv } from "../../../utils/env.js";
import { waitForMirrorNodeRecord } from "../../../utils/mirror-node.js";
import { queryNftRecord } from "../../../utils/mirror-node-rest.js";
import {
    createTestAccount,
    type TestAccount,
} from "../../../utils/integration-fixtures.js";
import {
    AccountService,
    TokenService,
} from "../../../../src/services/index.js";

describe("TokenService mint operations [Integration]", () => {
    let accountService: AccountService;
    let tokenService: TokenService;
    let owner: TestAccount;

    beforeAll(async () => {
        const ctx = setupIntegrationTestEnv();
        accountService = new AccountService(ctx);
        tokenService = new TokenService(ctx);
        owner = await createTestAccount(accountService, 10);
    });

    it("mints NFT serials via metadata", async () => {
        const tokenId = await tokenService.createNft({
            tokenName: "Mint NFT Integration",
            tokenSymbol: "MNI",
            treasuryAccountId: owner.accountId,
            supplyKey: owner.key.publicKey,
            additionalSigners: [owner.key],
        });

        await tokenService.mintToken({
            tokenId,
            metadata: [Buffer.from("meta-1"), Buffer.from("meta-2")],
            additionalSigners: [owner.key],
        });

        await waitForMirrorNodeRecord();

        const nft1 = await queryNftRecord(tokenId, 1);
        const nft2 = await queryNftRecord(tokenId, 2);

        expect(nft1.token_id).toBe(tokenId);
        expect(nft1.account_id).toBe(owner.accountId);
        expect(nft2.token_id).toBe(tokenId);
        expect(nft2.account_id).toBe(owner.accountId);
    });

    it("schedules NFT minting and returns a scheduleId", async () => {
        const tokenId = await tokenService.createNft({
            tokenName: "Scheduled Mint NFT",
            tokenSymbol: "SMNI",
            treasuryAccountId: owner.accountId,
            supplyKey: owner.key.publicKey,
            additionalSigners: [owner.key],
        });

        const scheduled = await tokenService.scheduleMintToken(
            {
                tokenId,
                metadata: [Buffer.from("scheduled-meta")],
                additionalSigners: [owner.key],
            },
            { scheduleMemo: "integration scheduled mint" },
        );

        expect(scheduled.scheduleId).toMatch(/^0\.0\.\d+$/);
        expect(scheduled.transactionId).toBeDefined();
    });
});
