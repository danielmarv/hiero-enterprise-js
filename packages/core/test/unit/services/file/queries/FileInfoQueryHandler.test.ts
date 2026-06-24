import { describe, it, expect, vi, beforeEach } from "vitest";
import { FileInfoQuery } from "@hiero-ledger/sdk";
import { FileService } from "../../../../../src/services/file/index.js";
import { createMockContext } from "../../../../utils/mock-context.js";
import type { IHieroContext } from "../../../../../src/context/index.js";
import { HieroError } from "../../../../../src/errors/index.js";

vi.mock("@hiero-ledger/sdk", async (importOriginal) => {
    const actual = await importOriginal<Record<string, unknown>>();
    return {
        ...actual,
        FileInfoQuery: vi.fn(function () {
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
        }),
    };
});

describe("FileInfoQueryHandler (via FileService)", () => {
    let context: IHieroContext;
    let service: FileService;

    beforeEach(() => {
        vi.clearAllMocks();
        context = createMockContext();
        service = new FileService(context);
    });

    describe("happy path", () => {
        it("gets normalized file metadata", async () => {
            const info = await service.getFileInfo("0.0.999");

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

        it("checks if file is deleted via isDeleted()", async () => {
            const deleted = await service.isDeleted("0.0.999");
            expect(deleted).toBe(true);
        });

        it("gets file size in bytes via getSize()", async () => {
            const size = await service.getSize("0.0.999");
            expect(size).toBe(1024);
        });

        it("gets file expiration time via getExpirationTime()", async () => {
            const expiration = await service.getExpirationTime("0.0.999");
            expect(expiration).toEqual(new Date("2030-01-01T00:00:00Z"));
        });

        it("returns false for isDeleted when file is not deleted", async () => {
            vi.mocked(FileInfoQuery).mockImplementationOnce(function () {
                return {
                    setFileId: vi.fn().mockReturnThis(),
                    execute: vi.fn().mockResolvedValue({
                        fileId: { toString: () => "0.0.999" },
                        isDeleted: false,
                        size: { toNumber: () => 512 },
                        expirationTime: {
                            toDate: () => new Date("2030-01-01T00:00:00Z"),
                        },
                        keys: { toArray: () => [] },
                        fileMemo: "",
                        ledgerId: null,
                    }),
                } as never;
            });

            const deleted = await service.isDeleted("0.0.999");
            expect(deleted).toBe(false);
        });

        it("handles file with no ledgerId (returns undefined)", async () => {
            vi.mocked(FileInfoQuery).mockImplementationOnce(function () {
                return {
                    setFileId: vi.fn().mockReturnThis(),
                    execute: vi.fn().mockResolvedValue({
                        fileId: { toString: () => "0.0.999" },
                        isDeleted: false,
                        size: { toNumber: () => 0 },
                        expirationTime: {
                            toDate: () => new Date("2030-01-01T00:00:00Z"),
                        },
                        keys: { toArray: () => [] },
                        fileMemo: "",
                        ledgerId: null,
                    }),
                } as never;
            });

            const info = await service.getFileInfo("0.0.999");
            expect(info.ledgerId).toBeUndefined();
            expect(info.size).toBe(0);
            expect(info.keys).toEqual([]);
        });
    });

    describe("error paths", () => {
        it("wraps SDK errors in HieroError", async () => {
            vi.mocked(FileInfoQuery).mockImplementationOnce(function () {
                return {
                    setFileId: vi.fn().mockReturnThis(),
                    execute: vi
                        .fn()
                        .mockRejectedValue(new Error("INVALID_FILE_ID")),
                } as never;
            });

            await expect(service.getFileInfo("0.0.bad")).rejects.toThrow(
                HieroError,
            );
        });

        it("wraps errors from isDeleted in HieroError", async () => {
            vi.mocked(FileInfoQuery).mockImplementationOnce(function () {
                return {
                    setFileId: vi.fn().mockReturnThis(),
                    execute: vi
                        .fn()
                        .mockRejectedValue(new Error("network timeout")),
                } as never;
            });

            await expect(service.isDeleted("0.0.999")).rejects.toThrow(
                HieroError,
            );
        });

        it("wraps errors from getSize in HieroError", async () => {
            vi.mocked(FileInfoQuery).mockImplementationOnce(function () {
                return {
                    setFileId: vi.fn().mockReturnThis(),
                    execute: vi
                        .fn()
                        .mockRejectedValue(new Error("connection refused")),
                } as never;
            });

            await expect(service.getSize("0.0.999")).rejects.toThrow(
                HieroError,
            );
        });

        it("wraps errors from getExpirationTime in HieroError", async () => {
            vi.mocked(FileInfoQuery).mockImplementationOnce(function () {
                return {
                    setFileId: vi.fn().mockReturnThis(),
                    execute: vi
                        .fn()
                        .mockRejectedValue(new Error("server error")),
                } as never;
            });

            await expect(
                service.getExpirationTime("0.0.999"),
            ).rejects.toThrow(HieroError);
        });
    });
});
