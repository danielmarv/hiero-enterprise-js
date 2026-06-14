import { describe, it, expect, vi, beforeEach } from "vitest";
import { AccountService } from "../../../../../src/services/account/index.js";
import { createMockContext } from "../../../../utils/mock-context.js";
import type { IHieroContext } from "../../../../../src/context/index.js";

const mocks = vi.hoisted(() => {
    const verify = vi.fn().mockReturnValue(true);
    const verifyTransaction = vi.fn().mockReturnValue(true);
    const publicKey = { verify, verifyTransaction };

    const fakeKeyList = { __isKeyList: true };

    const mockQuery = {
        setAccountId: vi.fn().mockReturnThis(),
        execute: vi.fn().mockResolvedValue({ key: publicKey }),
    };

    return { mockQuery, publicKey, verify, verifyTransaction, fakeKeyList };
});

vi.mock("@hiero-ledger/sdk", async (importOriginal) => {
    const actual = await importOriginal<Record<string, unknown>>();
    // A minimal KeyList stand-in so `instanceof KeyList` discriminates the
    // multi-sig branch without depending on the SDK's full implementation.
    class FakeKeyList {}
    Object.setPrototypeOf(mocks.fakeKeyList, FakeKeyList.prototype);

    return {
        ...actual,
        AccountInfoQuery: vi.fn(function () {
            return mocks.mockQuery;
        }),
        KeyList: FakeKeyList,
    };
});

describe("AccountSignatureQuery (via AccountService)", () => {
    let context: IHieroContext;
    let service: AccountService;

    beforeEach(() => {
        vi.clearAllMocks();
        mocks.mockQuery.execute.mockResolvedValue({ key: mocks.publicKey });
        mocks.verify.mockReturnValue(true);
        mocks.verifyTransaction.mockReturnValue(true);

        context = createMockContext();
        service = new AccountService(context);
    });

    describe("verifyAccountSignature", () => {
        it("returns true when the public key verifies the signature", async () => {
            const message = new Uint8Array([1, 2, 3]);
            const signature = new Uint8Array([9, 9, 9]);

            const result = await service.verifyAccountSignature(
                "0.0.999",
                message,
                signature,
            );

            expect(result).toBe(true);
            expect(mocks.mockQuery.setAccountId).toHaveBeenCalledWith(
                "0.0.999",
            );
            expect(mocks.verify).toHaveBeenCalledWith(message, signature);
        });

        it("returns false when the public key rejects the signature", async () => {
            mocks.verify.mockReturnValue(false);

            const result = await service.verifyAccountSignature(
                "0.0.999",
                new Uint8Array([1]),
                new Uint8Array([2]),
            );

            expect(result).toBe(false);
        });

        it("returns false when the account is multi-sig (KeyList)", async () => {
            mocks.mockQuery.execute.mockResolvedValueOnce({
                key: mocks.fakeKeyList,
            });

            const result = await service.verifyAccountSignature(
                "0.0.999",
                new Uint8Array([1]),
                new Uint8Array([2]),
            );

            expect(result).toBe(false);
            expect(mocks.verify).not.toHaveBeenCalled();
        });

        it("wraps query failures with a normalized error", async () => {
            mocks.mockQuery.execute.mockRejectedValueOnce(
                new Error("network down"),
            );

            await expect(
                service.verifyAccountSignature(
                    "0.0.999",
                    new Uint8Array([1]),
                    new Uint8Array([2]),
                ),
            ).rejects.toThrow(/network down/);
        });
    });

    describe("verifyAccountTransaction", () => {
        it("returns true when the public key verifies the transaction", async () => {
            const tx = { __tx: true } as unknown as Parameters<
                typeof service.verifyAccountTransaction
            >[1];

            const result = await service.verifyAccountTransaction(
                "0.0.999",
                tx,
            );

            expect(result).toBe(true);
            expect(mocks.verifyTransaction).toHaveBeenCalledWith(tx);
        });

        it("returns false when the account is multi-sig (KeyList)", async () => {
            mocks.mockQuery.execute.mockResolvedValueOnce({
                key: mocks.fakeKeyList,
            });

            const result = await service.verifyAccountTransaction(
                "0.0.999",
                {} as unknown as Parameters<
                    typeof service.verifyAccountTransaction
                >[1],
            );

            expect(result).toBe(false);
            expect(mocks.verifyTransaction).not.toHaveBeenCalled();
        });

        it("wraps query failures with a normalized error", async () => {
            mocks.mockQuery.execute.mockRejectedValueOnce(
                new Error("query failed"),
            );

            await expect(
                service.verifyAccountTransaction(
                    "0.0.999",
                    {} as unknown as Parameters<
                        typeof service.verifyAccountTransaction
                    >[1],
                ),
            ).rejects.toThrow(/query failed/);
        });
    });
});
