import { describe, it, expect, vi, beforeEach } from "vitest";
import { TokenPauseTransaction, PrivateKey } from "@hiero-ledger/sdk";
import { TokenService } from "../../../../../src/services/token/index.js";
import { createMockContext } from "../../../../utils/mock-context.js";
import { reattachMockChain } from "../../../../utils/sdk-mocks.js";
import type { IHieroContext } from "../../../../../src/context/index.js";

const mocks = await vi.hoisted(async () => {
    const { buildMockTxBundle } =
        await import("../../../../utils/sdk-mocks.js");
    return buildMockTxBundle(["setTokenId"]);
});

vi.mock("@hiero-ledger/sdk", async (importOriginal) => {
    const actual = await importOriginal<Record<string, unknown>>();
    return {
        ...actual,
        TokenPauseTransaction: vi.fn(function () {
            return mocks.tx;
        }),
    };
});

describe("TokenPauseOperation (via TokenService)", () => {
    let context: IHieroContext;
    let service: TokenService;

    beforeEach(() => {
        vi.clearAllMocks();
        reattachMockChain(mocks);
        context = createMockContext();
        service = new TokenService(context);
    });

    it("pauses a token", async () => {
        await service.pauseToken({ tokenId: "0.0.500" });

        const tx = vi.mocked(TokenPauseTransaction).mock.results[0].value;
        expect(tx.setTokenId).toHaveBeenCalledWith("0.0.500");
        expect(tx.execute).toHaveBeenCalledWith(context.client);
    });

    it("applies base TransactionOptions and additionalSigners", async () => {
        const signer = PrivateKey.generateED25519();

        await service.pauseToken({
            tokenId: "0.0.500",
            transactionMemo: "pause memo",
            transactionValidDuration: 60,
            regenerateTransactionId: false,
            additionalSigners: [signer],
        });

        const tx = vi.mocked(TokenPauseTransaction).mock.results[0].value;
        expect(tx.setTransactionMemo).toHaveBeenCalledWith("pause memo");
        expect(tx.setTransactionValidDuration).toHaveBeenCalledWith(60);
        expect(tx.setRegenerateTransactionId).toHaveBeenCalledWith(false);
        expect(tx.freezeWith).toHaveBeenCalledWith(context.client);
        expect(tx.sign).toHaveBeenCalledWith(signer);
    });

    it("throws when tokenId is missing", async () => {
        await expect(
            service.pauseToken({
                tokenId: undefined as unknown as string,
            }),
        ).rejects.toThrow(/tokenId is required/);
    });

    it("throws when tokenId is empty", async () => {
        await expect(service.pauseToken({ tokenId: "" })).rejects.toThrow(
            /tokenId cannot be empty/,
        );
    });
});
