import { describe, it, expect, vi, beforeEach } from "vitest";
import { FileCreateTransaction, FileAppendTransaction } from "@hiero-ledger/sdk";
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
        create: buildMockTxBundle([
            "setKeys",
            "setContents",
            "setExpirationTime",
            "setFileMemo",
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
        FileCreateTransaction: vi.fn(function () {
            return mocks.create.tx;
        }),
        FileAppendTransaction: vi.fn(function () {
            return mocks.append.tx;
        }),
    };
});

describe("CreateFileOperation (via FileService)", () => {
    let context: IHieroContext;
    let service: FileService;

    beforeEach(() => {
        vi.clearAllMocks();
        reattachMockChain(mocks.create);
        reattachMockChain(mocks.append);
        context = createMockContext();
        service = new FileService(context);
    });

    describe("happy path", () => {
        it("creates a file under 4KB without chunking", async () => {
            const contents = new Uint8Array(100);
            const expires = new Date();

            const fileId = await service.createFile(contents, expires);

            expect(fileId).toBe("0.0.555");
            expect(mocks.create.tx.setContents).toHaveBeenCalledWith(contents);
            expect(mocks.create.tx.setExpirationTime).toHaveBeenCalledWith(
                expires,
            );
            expect(mocks.create.tx.freezeWith).toHaveBeenCalledWith(
                context.client,
            );
            expect(mocks.create.tx.execute).toHaveBeenCalledWith(context.client);
            expect(FileAppendTransaction).not.toHaveBeenCalled();
        });

        it("creates a file over 4KB and appends remaining contents", async () => {
            const contents = new Uint8Array(5000);

            const fileId = await service.createFile(contents, new Date("2030-01-01"));

            expect(fileId).toBe("0.0.555");
            expect(FileCreateTransaction).toHaveBeenCalled();
            expect(FileAppendTransaction).toHaveBeenCalled();
        });

        it("supports create options for keys and file memo", async () => {
            const key = { toString: () => "mock-key" } as unknown as Key;
            await service.createFile({
                contents: "hello",
                keys: [key],
                fileMemo: "enterprise file",
            });

            expect(mocks.create.tx.setKeys).toHaveBeenCalledWith([key]);
            expect(mocks.create.tx.setFileMemo).toHaveBeenCalledWith(
                "enterprise file",
            );
        });

        it("defaults to operator public key when no keys provided", async () => {
            await service.createFile(new Uint8Array(10));

            expect(mocks.create.tx.setKeys).toHaveBeenCalledWith([
                context.operatorPublicKey,
            ]);
        });

        it("creates an empty file when called with no arguments", async () => {
            const fileId = await service.createFile();

            expect(fileId).toBe("0.0.555");
            expect(mocks.create.tx.setContents).toHaveBeenCalledWith(
                new Uint8Array(),
            );
        });

        it("converts string contents to bytes", async () => {
            await service.createFile("hello world");

            expect(mocks.create.tx.setContents).toHaveBeenCalledWith(
                Buffer.from("hello world"),
            );
        });

        it("emits before/after transaction events", async () => {
            await service.createFile(new Uint8Array(10));

            expect(context.emitBeforeTransaction).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: "FileCreate",
                    serviceName: "FileService",
                    methodName: "createFile",
                }),
            );
            expect(context.emitAfterTransaction).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: "FileCreate",
                    serviceName: "FileService",
                    methodName: "createFile",
                    status: "SUCCESS",
                }),
            );
        });

        it("respects custom chunkSize option", async () => {
            const contents = new Uint8Array(200);
            await service.createFile({ contents, chunkSize: 100 });

            // First chunk goes to create, rest goes to append
            expect(mocks.create.tx.setContents).toHaveBeenCalledWith(
                contents.slice(0, 100),
            );
            expect(FileAppendTransaction).toHaveBeenCalled();
        });
    });

    describe("error paths", () => {
        it("rejects invalid chunkSize (negative)", async () => {
            await expect(
                service.createFile({ contents: "hi", chunkSize: -1 }),
            ).rejects.toThrow("chunkSize must be a positive integer");
        });

        it("rejects invalid chunkSize (zero)", async () => {
            await expect(
                service.createFile({ contents: "hi", chunkSize: 0 }),
            ).rejects.toThrow("chunkSize must be a positive integer");
        });

        it("rejects non-integer chunkSize", async () => {
            await expect(
                service.createFile({ contents: "hi", chunkSize: 1.5 }),
            ).rejects.toThrow("chunkSize must be a positive integer");
        });

        it("wraps SDK errors in HieroError", async () => {
            mocks.create.tx.execute.mockRejectedValueOnce(
                new Error("INSUFFICIENT_PAYER_BALANCE"),
            );

            await expect(
                service.createFile(new Uint8Array(10)),
            ).rejects.toThrow(HieroError);
        });
    });
});
