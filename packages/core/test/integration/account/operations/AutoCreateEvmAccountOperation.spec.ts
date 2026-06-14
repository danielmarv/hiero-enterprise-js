import { describe, it, expect, beforeAll } from "vitest";
import { setupIntegrationTestEnv } from "../../../utils/env.js";
import { AccountService } from "../../../../src/services/index.js";

describe("AccountService.autoCreateEvmAccount [Integration]", () => {
    let client: AccountService;

    beforeAll(() => {
        const ctx = setupIntegrationTestEnv();
        client = new AccountService(ctx);
    });

    it("transfers HBAR to a cold '0x' address, auto-creating the account", async () => {
        // A random dummy strictly formatted 20-byte EVM hex
        const coldAddress = "0x1111111111111111111111111111111111111111";

        await expect(
            client.autoCreateEvmAccount({ evmAddress: coldAddress, amount: 5 }),
        ).resolves.not.toThrow();
    });
});
