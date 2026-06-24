import { describe, it, expect, vi, beforeEach } from "vitest";
import { FileUpdateTransaction, FileAppendTransaction } from "@hiero-ledger/sdk";
import type { Key } from "@hiero-ledger/sdk";
import { FileService } from "../../../../../src/services/file/index.js";
import { createMockContext } from "../../../../utils/mock-context.js";
import { reattachMockChain } from "../../../../utils/sdk-mocks.js";
import type { IHieroContext } from "../../../../../src/context/index.js";
import { HieroError } from "../../../../../src/errors/index.js";

const mocks = await vi.hoisted(async () => {
    const { buildMockTxBundle } =
        await import("../../../../utils/sdk-mocks.js");
    return {
        update: buildMockTxBundle([
            "setFileId",
            "setContents",
            "setKeys",
            "setExpirationTime",
            "setFileMemo",
            "clearFileMemo",
        ]),
        append: buildMockTxBundle([
            "setFileId",
            "setContents",
            "setChunkSize",
            "setMaxChunks",
            "setChunkInterval",
        ]),
    };
});

vi.mock("@hiero-ledger/sdk", async (importOriginal) => {
    const actual = await importOriginal<Record<string, unknown>>();
    return {
        ...actual,
        FileUpdateTransaction: vi.fn(function () {
            return mocks.update.tx;
        }),
        FileAppendTransaction: vi.fn(function () {
            return mocks.append.tx;
        }),
    };
});

describe("UpdateFileOperation (via FileService)", () => {
    let context: IHieroContext;
    let service: FileService;

    beforeEach(() => {
        vi.clearAllMocks();
        reattachMockChain(mocks.update);
        reattachMockChain(mocks.append);
        context = createMockContext();
        service = new FileService(context);
    });

    describe("happy path", () => {
        it("updates file contents (positional API)", async () => {
            const contents = new Uint8Array(100);
            await service.updateFile("0.0.999", contents);

            expect(mocks.update.tx.setFileId).toHaveBeenCalledWith("0.0.999");
            expect(mocks.update.tx.setContents).toHaveBeenCalledWith(contents);
        });

        it("updates file contents (string positional API)", async () => {
            await service.updateFile("0.0.999", "new contents");

            expect(mocks.update.tx.setContents).toHaveBeenCalledWith(
                Buffer.from("new contents"),
            );
        });

        it("updates file keys, expiry, and memo via options", async () => {
            const key = { toString: () => "mock-key" } as unknown as Key;
            const expirationTime = new Date("2030-01-01T00:00:00Z");

            await service.updateFile("0.0.999", {
                keys: [key],
                expirationTime,
                fileMemo: "new memo",
            });

            expect(mocks.update.tx.setKeys).toHaveBeenCalledWith([key]);
            expect(mocks.update.tx.setExpirationTime).toHaveBeenCalledWith(
                expirationTime,
            );
            expect(mocks.update.tx.setFileMemo).toHaveBeenCalledWith("new memo");
        });

        it("clears the file memo when fileMemo is null", async () => {
            await service.updateFile("0.0.999", { fileMemo: null });

            expect(mocks.update.tx.clearFileMemo).toHaveBeenCalled();
            expect(mocks.update.tx.setFileMemo).not.toHaveBeenCalled();
        });

        it("chunks large update contents with an append follow-up", async () => {
            const contents = new Uint8Array(5000);
            await service.updateFile("0.0.999", contents);

            expect(mocks.update.tx.setContents).toHaveBeenCalledWith(
                contents.slice(0, 4096),
            );
            expect(FileAppendTransaction).toHaveBeenCalled();
        });

        it("emits before/after transaction events for updateFile", async () => {
            await service.updateFile("0.0.999", "x");

            expect(context.emitBeforeTransaction).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: "FileUpdate",
                    serviceName: "FileService",
                    methodName: "updateFile",
                }),
            );
            expect(context.emitAfterTransaction).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: "FileUpdate",
                    methodName: "updateFile",
                    status: "SUCCESS",
                }),
            );
        });
    });

    describe("updateExpirationTime", () => {
        it("updates expiration time with its own method name", async () => {
            const expirationTime = new Date("2030-01-01T00:00:00Z");
            await service.updateExpirationTime("0.0.999", expirationTime);

            expect(mocks.update.tx.setExpirationTime).toHaveBeenCalledWith(
                expirationTime,
            );
        });

        it("emits events with methodName 'updateExpirationTime'", async () => {
            await service.updateExpirationTime("0.0.999", new Date("2030-01-01"));

            expect(context.emitAfterTransaction).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: "FileUpdate",
                    methodName: "updateExpirationTime",
                    status: "SUCCESS",
                }),
            );
        });
    });

    describe("error paths", () => {
        it("rejects when no update field is provided", async () => {
            await expect(service.updateFile("0.0.999", {})).rejects.toThrow(
                "At least one file update field must be provided",
            );
        });

        it("rejects invalid chunkSize", async () => {
            await expect(
                service.updateFile("0.0.999", { contents: "x", chunkSize: -5 }),
            ).rejects.toThrow("chunkSize must be a positive integer");
        });

        it("wraps SDK errors in HieroError", async () => {
            mocks.update.tx.execute.mockRejectedValueOnce(
                new Error("FILE_DELETED"),
            );

            await expect(
                service.updateFile("0.0.999", "contents"),
            ).rejects.toThrow(HieroError);
        });
    });
});
