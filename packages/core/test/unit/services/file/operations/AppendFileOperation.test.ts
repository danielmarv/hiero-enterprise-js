import { describe, it, expect, vi, beforeEach } from "vitest";
import { FileService } from "../../../../../src/services/file/index.js";
import { createMockContext } from "../../../../utils/mock-context.js";
import { reattachMockChain } from "../../../../utils/sdk-mocks.js";
import type { IHieroContext } from "../../../../../src/context/index.js";
import { HieroError } from "../../../../../src/errors/index.js";

const mocks = await vi.hoisted(async () => {
    const { buildMockTxBundle } =
        await import("../../../../utils/sdk-mocks.js");
    return buildMockTxBundle([
        "setFileId",
        "setContents",
        "setChunkSize",
        "setMaxChunks",
        "setChunkInterval",
    ]);
});

vi.mock("@hiero-ledger/sdk", async (importOriginal) => {
    const actual = await importOriginal<Record<string, unknown>>();
    return {
        ...actual,
        FileAppendTransaction: vi.fn(function () {
            return mocks.tx;
        }),
    };
});

describe("AppendFileOperation (via FileService)", () => {
    let context: IHieroContext;
    let service: FileService;

    beforeEach(() => {
        vi.clearAllMocks();
        reattachMockChain(mocks);
        context = createMockContext();
        service = new FileService(context);
    });

    describe("happy path", () => {
        it("appends Uint8Array contents with chunking options", async () => {
            await service.appendFile("0.0.999", new Uint8Array([4, 5, 6]), {
                chunkSize: 1024,
                chunkInterval: 20,
            });

            expect(mocks.tx.setFileId).toHaveBeenCalledWith("0.0.999");
            expect(mocks.tx.setContents).toHaveBeenCalledWith(
                new Uint8Array([4, 5, 6]),
            );
            expect(mocks.tx.setChunkSize).toHaveBeenCalledWith(1024);
            expect(mocks.tx.setMaxChunks).toHaveBeenCalledWith(1);
            expect(mocks.tx.setChunkInterval).toHaveBeenCalledWith(20);
        });

        it("appends string contents (auto-converted to bytes)", async () => {
            await service.appendFile("0.0.999", "hello append");

            expect(mocks.tx.setContents).toHaveBeenCalledWith(
                Buffer.from("hello append"),
            );
        });

        it("defaults to 4096 chunkSize when none provided", async () => {
            await service.appendFile("0.0.999", new Uint8Array([1, 2]));

            expect(mocks.tx.setChunkSize).toHaveBeenCalledWith(4096);
        });

        it("computes maxChunks based on content size and chunkSize", async () => {
            // 10 bytes / 3 chunkSize = ceil(10/3) = 4
            await service.appendFile("0.0.999", new Uint8Array(10), {
                chunkSize: 3,
            });

            expect(mocks.tx.setMaxChunks).toHaveBeenCalledWith(4);
        });

        it("honours explicit maxChunks from options", async () => {
            await service.appendFile("0.0.999", new Uint8Array([1, 2, 3]), {
                maxChunks: 42,
            });

            expect(mocks.tx.setMaxChunks).toHaveBeenCalledWith(42);
        });

        it("emits before/after transaction events", async () => {
            await service.appendFile("0.0.999", new Uint8Array([1]));

            expect(context.emitBeforeTransaction).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: "FileAppend",
                    serviceName: "FileService",
                    methodName: "appendFile",
                }),
            );
            expect(context.emitAfterTransaction).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: "FileAppend",
                    status: "SUCCESS",
                }),
            );
        });
    });

    describe("error paths", () => {
        it("rejects empty Uint8Array contents", async () => {
            await expect(
                service.appendFile("0.0.999", new Uint8Array(0)),
            ).rejects.toThrow("Append contents must not be empty");
        });

        it("rejects empty string contents", async () => {
            await expect(service.appendFile("0.0.999", "")).rejects.toThrow(
                "Append contents must not be empty",
            );
        });

        it("rejects invalid chunkSize (zero)", async () => {
            await expect(
                service.appendFile("0.0.999", new Uint8Array([1]), {
                    chunkSize: 0,
                }),
            ).rejects.toThrow("chunkSize must be a positive integer");
        });

        it("rejects non-integer chunkSize", async () => {
            await expect(
                service.appendFile("0.0.999", new Uint8Array([1]), {
                    chunkSize: 2.5,
                }),
            ).rejects.toThrow("chunkSize must be a positive integer");
        });

        it("wraps SDK errors in HieroError", async () => {
            mocks.tx.execute.mockRejectedValueOnce(
                new Error("INVALID_FILE_ID"),
            );

            await expect(
                service.appendFile("0.0.999", new Uint8Array([1])),
            ).rejects.toThrow(HieroError);
        });
    });
});
