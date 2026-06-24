import { describe, it, expect, vi, beforeEach } from "vitest";
import { FileDeleteTransaction } from "@hiero-ledger/sdk";
import { FileService } from "../../../../../src/services/file/index.js";
import { createMockContext } from "../../../../utils/mock-context.js";
import { reattachMockChain } from "../../../../utils/sdk-mocks.js";
import type { IHieroContext } from "../../../../../src/context/index.js";
import { HieroError } from "../../../../../src/errors/index.js";

const mocks = await vi.hoisted(async () => {
    const { buildMockTxBundle } =
        await import("../../../../utils/sdk-mocks.js");
    return buildMockTxBundle(["setFileId"]);
});

vi.mock("@hiero-ledger/sdk", async (importOriginal) => {
    const actual = await importOriginal<Record<string, unknown>>();
    return {
        ...actual,
        FileDeleteTransaction: vi.fn(function () {
            return mocks.tx;
        }),
    };
});

describe("DeleteFileOperation (via FileService)", () => {
    let context: IHieroContext;
    let service: FileService;

    beforeEach(() => {
        vi.clearAllMocks();
        reattachMockChain(mocks);
        context = createMockContext();
        service = new FileService(context);
    });

    describe("happy path", () => {
        it("deletes a file by ID", async () => {
            await service.deleteFile("0.0.999");

            expect(mocks.tx.setFileId).toHaveBeenCalledWith("0.0.999");
            expect(mocks.tx.freezeWith).toHaveBeenCalledWith(context.client);
            expect(mocks.tx.execute).toHaveBeenCalledWith(context.client);
        });

        it("emits before/after transaction events", async () => {
            await service.deleteFile("0.0.999");

            expect(context.emitBeforeTransaction).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: "FileDelete",
                    serviceName: "FileService",
                    methodName: "deleteFile",
                }),
            );
            expect(context.emitAfterTransaction).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: "FileDelete",
                    methodName: "deleteFile",
                    status: "SUCCESS",
                }),
            );
        });

        it("passes through transaction options", async () => {
            await service.deleteFile("0.0.999", {
                transactionMemo: "delete memo",
            });

            expect(mocks.tx.setTransactionMemo).toHaveBeenCalledWith(
                "delete memo",
            );
        });
    });

    describe("error paths", () => {
        it("wraps SDK errors in HieroError", async () => {
            mocks.tx.execute.mockRejectedValueOnce(
                new Error("FILE_DELETED"),
            );

            await expect(service.deleteFile("0.0.999")).rejects.toThrow(
                HieroError,
            );
        });
    });
});
