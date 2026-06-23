import { describe, it, expect, vi, beforeEach } from "vitest";
import { FileService } from "../../../src/services/file-service.js";
import { createMockContext } from "../../utils/mock-context.js";
import type { IHieroContext } from "../../../src/context/index.js";
import { HieroError } from "../../../src/errors/index.js";
import {
    FileAppendTransaction,
    FileContentsQuery,
    FileCreateTransaction,
    FileDeleteTransaction,
    FileInfoQuery,
    FileUpdateTransaction,
} from "@hiero-ledger/sdk";
import type { Key } from "@hiero-ledger/sdk";

vi.mock("@hiero-ledger/sdk", async (importOriginal) => {
    const actual = await importOriginal<Record<string, unknown>>();

    function createResponse() {
        return {
            transactionId: {
                toString: () => "0.0.123@1234567890.000000000",
            },
            getReceipt: vi.fn().mockResolvedValue({
                status: { toString: () => "SUCCESS" },
                fileId: { toString: () => "0.0.999" },
            }),
        };
    }

    function createMockTx() {
        const response = createResponse();
        const tx = {
            setKeys: vi.fn().mockReturnThis(),
            setContents: vi.fn().mockReturnThis(),
            setExpirationTime: vi.fn().mockReturnThis(),
            setFileId: vi.fn().mockReturnThis(),
            setFileMemo: vi.fn().mockReturnThis(),
            clearFileMemo: vi.fn().mockReturnThis(),
            setChunkSize: vi.fn().mockReturnThis(),
            setMaxChunks: vi.fn().mockReturnThis(),
            setChunkInterval: vi.fn().mockReturnThis(),
            setMaxTransactionFee: vi.fn().mockReturnThis(),
            setTransactionValidDuration: vi.fn().mockReturnThis(),
            setTransactionMemo: vi.fn().mockReturnThis(),
            setRegenerateTransactionId: vi.fn().mockReturnThis(),
            setHighVolume: vi.fn().mockReturnThis(),
            setNodeAccountIds: vi.fn().mockReturnThis(),
            _addSignatureLegacy: vi.fn().mockReturnThis(),
            freezeWith: vi.fn().mockReturnThis(),
            sign: vi.fn().mockResolvedValue(undefined),
            signWith: vi.fn().mockResolvedValue(undefined),
            execute: vi.fn().mockResolvedValue(response),
        };
        return tx;
    }

    function createContentsQuery() {
        return {
            setFileId: vi.fn().mockReturnThis(),
            execute: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
        };
    }

    function createInfoQuery() {
        return {
            setFileId: vi.fn().mockReturnThis(),
            execute: vi.fn().mockResolvedValue({
                fileId: { toString: () => "0.0.999" },
                isDeleted: true,
                size: { toNumber: () => 1024 },
                expirationTime: {
                    toDate: () => new Date("2030-01-01T00:00:00Z"),
                },
                keys: {
                    toArray: () => [
                        { toString: () => "mock-file-key-1" },
                        { toString: () => "mock-file-key-2" },
                    ],
                },
                fileMemo: "mock memo",
                ledgerId: { toString: () => "testnet" },
            }),
        };
    }

    return {
        ...actual,
        FileCreateTransaction: vi.fn(createMockTx),
        FileAppendTransaction: vi.fn(createMockTx),
        FileUpdateTransaction: vi.fn(createMockTx),
        FileDeleteTransaction: vi.fn(createMockTx),
        FileContentsQuery: vi.fn(createContentsQuery),
        FileInfoQuery: vi.fn(createInfoQuery),
    };
});

describe("FileService", () => {
    let context: IHieroContext;
    let client: FileService;

    beforeEach(() => {
        vi.clearAllMocks();
        context = createMockContext();
        client = new FileService(context);
    });

    describe("createFile", () => {
        it("creates a file under 4KB without chunking", async () => {
            const contents = new Uint8Array(100);
            const expires = new Date();

            const fileId = await client.createFile(contents, expires);

            expect(fileId).toBe("0.0.999");

            const createMock = vi.mocked(FileCreateTransaction).mock.results[0]
                .value;
            expect(createMock.setContents).toHaveBeenCalledWith(contents);
            expect(createMock.setExpirationTime).toHaveBeenCalledWith(expires);
            expect(createMock.freezeWith).toHaveBeenCalledWith(context.client);
            expect(createMock.execute).toHaveBeenCalledWith(context.client);
            expect(FileAppendTransaction).not.toHaveBeenCalled();
        });

        it("creates a file over 4KB and emits append for remaining contents", async () => {
            const contents = new Uint8Array(5000);

            const fileId = await client.createFile(
                contents,
                new Date("2030-01-01"),
            );

            expect(fileId).toBe("0.0.999");
            expect(FileCreateTransaction).toHaveBeenCalled();
            expect(FileAppendTransaction).toHaveBeenCalled();
            expect(context.emitBeforeTransaction).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: "FileCreate",
                    methodName: "createFile",
                }),
            );
            expect(context.emitBeforeTransaction).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: "FileAppend",
                    methodName: "appendFile",
                }),
            );
        });

        it("supports create options for keys and file memo", async () => {
            const key = { toString: () => "mock-key" } as unknown as Key;
            await client.createFile({
                contents: "hello",
                keys: [key],
                fileMemo: "enterprise file",
            });

            const createMock = vi.mocked(FileCreateTransaction).mock.results[0]
                .value;
            expect(createMock.setKeys).toHaveBeenCalledWith([key]);
            expect(createMock.setFileMemo).toHaveBeenCalledWith(
                "enterprise file",
            );
        });
    });

    describe("appendFile", () => {
        it("appends file contents through FileAppendTransaction", async () => {
            await client.appendFile("0.0.999", new Uint8Array([4, 5, 6]), {
                chunkSize: 1024,
                chunkInterval: 20,
            });

            const txMock = vi.mocked(FileAppendTransaction).mock.results[0]
                .value;
            expect(txMock.setFileId).toHaveBeenCalledWith("0.0.999");
            expect(txMock.setContents).toHaveBeenCalledWith(
                new Uint8Array([4, 5, 6]),
            );
            expect(txMock.setChunkSize).toHaveBeenCalledWith(1024);
            expect(txMock.setMaxChunks).toHaveBeenCalledWith(1);
            expect(txMock.setChunkInterval).toHaveBeenCalledWith(20);
            expect(context.emitAfterTransaction).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: "FileAppend",
                    methodName: "appendFile",
                    status: "SUCCESS",
                }),
            );
        });
    });

    describe("getFileContents", () => {
        it("reads file contents", async () => {
            const contents = await client.getFileContents("0.0.999");

            expect(contents).toEqual(new Uint8Array([1, 2, 3]));

            const queryMock =
                vi.mocked(FileContentsQuery).mock.results[0].value;
            expect(queryMock.setFileId).toHaveBeenCalledWith("0.0.999");
            expect(queryMock.execute).toHaveBeenCalledWith(context.client);
        });

        it("keeps readFile as a compatibility alias", async () => {
            const contents = await client.readFile("0.0.999");
            expect(contents).toEqual(new Uint8Array([1, 2, 3]));
        });

        it("normalizes SDK query errors", async () => {
            vi.mocked(FileContentsQuery).mockImplementationOnce(
                () =>
                    ({
                        setFileId: vi.fn().mockReturnThis(),
                        execute: vi.fn().mockRejectedValue(new Error("boom")),
                    }) as never,
            );

            await expect(client.getFileContents("0.0.999")).rejects.toThrow(
                HieroError,
            );
        });
    });

    describe("updateFile", () => {
        it("updates file contents", async () => {
            const contents = new Uint8Array(100);
            await client.updateFile("0.0.999", contents);

            const txMock = vi.mocked(FileUpdateTransaction).mock.results[0]
                .value;
            expect(txMock.setFileId).toHaveBeenCalledWith("0.0.999");
            expect(txMock.setContents).toHaveBeenCalledWith(contents);
            expect(context.emitAfterTransaction).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: "FileUpdate",
                    methodName: "updateFile",
                    status: "SUCCESS",
                }),
            );
        });

        it("updates file keys, expiry, and memo", async () => {
            const key = { toString: () => "mock-key" } as unknown as Key;
            const expirationTime = new Date("2030-01-01T00:00:00Z");

            await client.updateFile("0.0.999", {
                keys: [key],
                expirationTime,
                fileMemo: "new memo",
            });

            const txMock = vi.mocked(FileUpdateTransaction).mock.results[0]
                .value;
            expect(txMock.setKeys).toHaveBeenCalledWith([key]);
            expect(txMock.setExpirationTime).toHaveBeenCalledWith(
                expirationTime,
            );
            expect(txMock.setFileMemo).toHaveBeenCalledWith("new memo");
        });

        it("clears the file memo when fileMemo is null", async () => {
            await client.updateFile("0.0.999", { fileMemo: null });

            const txMock = vi.mocked(FileUpdateTransaction).mock.results[0]
                .value;
            expect(txMock.clearFileMemo).toHaveBeenCalled();
        });

        it("updates expiration time with its own listener method name", async () => {
            const expirationTime = new Date("2030-01-01T00:00:00Z");

            await client.updateExpirationTime("0.0.999", expirationTime);

            const txMock = vi.mocked(FileUpdateTransaction).mock.results[0]
                .value;
            expect(txMock.setExpirationTime).toHaveBeenCalledWith(
                expirationTime,
            );
            expect(context.emitAfterTransaction).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: "FileUpdate",
                    methodName: "updateExpirationTime",
                    status: "SUCCESS",
                }),
            );
        });
    });

    describe("deleteFile", () => {
        it("deletes a file", async () => {
            await client.deleteFile("0.0.999");

            const txMock = vi.mocked(FileDeleteTransaction).mock.results[0]
                .value;
            expect(txMock.setFileId).toHaveBeenCalledWith("0.0.999");
            expect(txMock.execute).toHaveBeenCalledWith(context.client);
            expect(context.emitAfterTransaction).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: "FileDelete",
                    methodName: "deleteFile",
                    status: "SUCCESS",
                }),
            );
        });
    });

    describe("getFileInfo", () => {
        it("gets normalized file metadata", async () => {
            const info = await client.getFileInfo("0.0.999");

            expect(info).toEqual({
                fileId: "0.0.999",
                isDeleted: true,
                size: 1024,
                expirationTime: new Date("2030-01-01T00:00:00Z"),
                keys: ["mock-file-key-1", "mock-file-key-2"],
                fileMemo: "mock memo",
                ledgerId: "testnet",
            });

            const queryMock = vi.mocked(FileInfoQuery).mock.results[0].value;
            expect(queryMock.setFileId).toHaveBeenCalledWith("0.0.999");
            expect(queryMock.execute).toHaveBeenCalledWith(context.client);
        });
    });

    describe("isDeleted", () => {
        it("checks if file is deleted", async () => {
            const deleted = await client.isDeleted("0.0.999");
            expect(deleted).toBe(true);
        });
    });

    describe("getSize", () => {
        it("gets file size", async () => {
            const size = await client.getSize("0.0.999");
            expect(size).toBe(1024);
        });
    });

    describe("getExpirationTime", () => {
        it("gets file expiration time", async () => {
            const expiration = await client.getExpirationTime("0.0.999");
            expect(expiration).toEqual(new Date("2030-01-01T00:00:00Z"));
        });
    });
});
