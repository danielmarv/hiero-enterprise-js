import { describe, it, expect, beforeAll } from "vitest";
import { setupIntegrationTestEnv } from "../../../utils/env.js";
import { waitForMirrorNodeRecord } from "../../../utils/mirror-node.js";
import { queryAccountTokens } from "../../../utils/mirror-node-rest.js";
import {
    createTestAccount,
    type TestAccount,
} from "../../../utils/integration-fixtures.js";
import {
    AccountService,
    TokenService,
} from "../../../../src/services/index.js";

describe("TokenService associate operations [Integration]", () => {
    let accountService: AccountService;
    let tokenService: TokenService;
    let owner: TestAccount;

    beforeAll(async () => {
        const ctx = setupIntegrationTestEnv();
        accountService = new AccountService(ctx);
        tokenService = new TokenService(ctx);
        owner = await createTestAccount(accountService, 10);
    });

    it("associates a token to an account", async () => {
        const receiver = await createTestAccount(accountService, 1);

        const tokenId = await tokenService.createFungibleToken({
            tokenName: "Associate Integration",
            tokenSymbol: "ASI",
            decimals: 2,
            initialSupply: 1_000,
            treasuryAccountId: owner.accountId,
            supplyKey: owner.key.publicKey,
            additionalSigners: [owner.key],
        });

        await tokenService.associateToken({
            accountId: receiver.accountId,
            tokenId,
            additionalSigners: [receiver.key],
        });

        await waitForMirrorNodeRecord();

        const tokens = await queryAccountTokens(receiver.accountId);
        const relationship = tokens.find((t) => t.token_id === tokenId);

        expect(relationship).toBeDefined();
        expect(relationship?.token_id).toBe(tokenId);
    });

    it("schedules a token association and returns a scheduleId", async () => {
        const scheduledReceiver = await createTestAccount(accountService, 1);

        const tokenId = await tokenService.createFungibleToken({
            tokenName: "Scheduled Associate",
            tokenSymbol: "SASI",
            decimals: 0,
            initialSupply: 500,
            treasuryAccountId: owner.accountId,
            supplyKey: owner.key.publicKey,
            additionalSigners: [owner.key],
        });

        const scheduled = await tokenService.scheduleAssociateToken(
            {
                accountId: scheduledReceiver.accountId,
                tokenId,
                additionalSigners: [scheduledReceiver.key],
            },
            { scheduleMemo: "integration scheduled associate" },
        );

        expect(scheduled.scheduleId).toMatch(/^0\.0\.\d+$/);
        expect(scheduled.transactionId).toBeDefined();
    });
});
