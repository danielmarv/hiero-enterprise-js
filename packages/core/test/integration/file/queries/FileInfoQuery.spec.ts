import { describe, it, expect, beforeAll } from "vitest";
import { setupIntegrationTestEnv } from "../../../utils/env.js";
import { waitForMirrorNodeRecord } from "../../../utils/mirror-node.js";
import { FileService } from "../../../../src/services/index.js";

describe("FileInfoQueryHandler [Integration]", () => {
    let service: FileService;
    let testFileId: string;
    const fileContents = "info query integration test";

    beforeAll(async () => {
        const ctx = setupIntegrationTestEnv();
        service = new FileService(ctx);

        testFileId = await service.createFile({
            contents: fileContents,
            fileMemo: "info integration",
        });
        await waitForMirrorNodeRecord();
    }, 25000);

    it("retrieves full file info with getFileInfo", async () => {
        const info = await service.getFileInfo(testFileId);

        expect(info.fileId).toBe(testFileId);
        expect(info.size).toBe(Buffer.byteLength(fileContents));
        expect(info.isDeleted).toBe(false);
        expect(info.expirationTime).toBeInstanceOf(Date);
        expect(info.expirationTime.getTime()).toBeGreaterThan(Date.now());
        expect(Array.isArray(info.keys)).toBe(true);
        expect(info.keys.length).toBeGreaterThan(0);
        expect(info.fileMemo).toBe("info integration");
    }, 20000);

    it("returns file size via getSize", async () => {
        const size = await service.getSize(testFileId);
        expect(size).toBe(Buffer.byteLength(fileContents));
    }, 20000);

    it("returns expiration time via getExpirationTime", async () => {
        const expiration = await service.getExpirationTime(testFileId);
        expect(expiration).toBeInstanceOf(Date);
        expect(expiration.getTime()).toBeGreaterThan(Date.now());
    }, 20000);

    it("returns isDeleted as false for active file", async () => {
        const isDeleted = await service.isDeleted(testFileId);
        expect(isDeleted).toBe(false);
    }, 20000);

    it("returns isDeleted as true after file deletion", async () => {
        // Create a fresh file for deletion
        const toDelete = await service.createFile("will be deleted");
        await waitForMirrorNodeRecord();

        await service.deleteFile(toDelete);
        await waitForMirrorNodeRecord();

        const isDeleted = await service.isDeleted(toDelete);
        expect(isDeleted).toBe(true);
    }, 30000);
});
