import { describe, it, expect, vi, beforeEach } from "vitest";
import { FileContentsQuery } from "@hiero-ledger/sdk";
import { FileService } from "../../../../../src/services/file/index.js";
import { createMockContext } from "../../../../utils/mock-context.js";
import type { IHieroContext } from "../../../../../src/context/index.js";
import { HieroError } from "../../../../../src/errors/index.js";

vi.mock("@hiero-ledger/sdk", async (importOriginal) => {
    const actual = await importOriginal<Record<string, unknown>>();
    return {
        ...actual,
        FileContentsQuery: vi.fn(function () {
            return {
                setFileId: vi.fn().mockReturnThis(),
                execute: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
            };
        }),
    };
});

describe("FileContentsQueryHandler (via FileService)", () => {
    let context: IHieroContext;
    let service: FileService;

    beforeEach(() => {
        vi.clearAllMocks();
        context = createMockContext();
        service = new FileService(context);
    });

    describe("happy path", () => {
        it("reads file contents and returns Uint8Array", async () => {
            const contents = await service.getFileContents("0.0.999");

            expect(contents).toEqual(new Uint8Array([1, 2, 3]));
            const queryMock =
                vi.mocked(FileContentsQuery).mock.results[0].value;
            expect(queryMock.setFileId).toHaveBeenCalledWith("0.0.999");
            expect(queryMock.execute).toHaveBeenCalledWith(context.client);
        });

        it("keeps readFile as a compatibility alias for getFileContents", async () => {
            const contents = await service.readFile("0.0.999");
            expect(contents).toEqual(new Uint8Array([1, 2, 3]));
        });

        it("returns empty Uint8Array for empty file", async () => {
            vi.mocked(FileContentsQuery).mockImplementationOnce(function () {
                return {
                    setFileId: vi.fn().mockReturnThis(),
                    execute: vi.fn().mockResolvedValue(new Uint8Array(0)),
                } as never;
            });

            const contents = await service.getFileContents("0.0.999");
            expect(contents).toEqual(new Uint8Array(0));
            expect(contents.length).toBe(0);
        });
    });

    describe("error paths", () => {
        it("normalizes SDK query errors into HieroError", async () => {
            vi.mocked(FileContentsQuery).mockImplementationOnce(function () {
                return {
                    setFileId: vi.fn().mockReturnThis(),
                    execute: vi.fn().mockRejectedValue(new Error("boom")),
                } as never;
            });

            await expect(service.getFileContents("0.0.999")).rejects.toThrow(
                HieroError,
            );
        });

        it("wraps INVALID_FILE_ID error", async () => {
            vi.mocked(FileContentsQuery).mockImplementationOnce(function () {
                return {
                    setFileId: vi.fn().mockReturnThis(),
                    execute: vi
                        .fn()
                        .mockRejectedValue(new Error("INVALID_FILE_ID")),
                } as never;
            });

            await expect(
                service.getFileContents("0.0.invalid"),
            ).rejects.toThrow(HieroError);
        });

        it("wraps FILE_DELETED error", async () => {
            vi.mocked(FileContentsQuery).mockImplementationOnce(function () {
                return {
                    setFileId: vi.fn().mockReturnThis(),
                    execute: vi
                        .fn()
                        .mockRejectedValue(new Error("FILE_DELETED")),
                } as never;
            });

            await expect(service.getFileContents("0.0.999")).rejects.toThrow(
                HieroError,
            );
        });
    });
});
