import { describe, it, expect, beforeAll } from "vitest";
import { setupIntegrationTestEnv } from "../../../utils/env.js";
import { waitForMirrorNodeRecord } from "../../../utils/mirror-node.js";
import { FileService } from "../../../../src/services/index.js";

describe("UpdateFileOperation [Integration]", () => {
    let service: FileService;
    let testFileId: string;

    beforeAll(async () => {
        const ctx = setupIntegrationTestEnv();
        service = new FileService(ctx);

        testFileId = await service.createFile("original contents");
        await waitForMirrorNodeRecord();
    }, 25000);

    it("updates file contents with new Uint8Array", async () => {
        const newContents = "replaced contents";
        await service.updateFile(testFileId, newContents);

        const bytes = await service.getFileContents(testFileId);
        expect(Buffer.from(bytes).toString("utf-8")).toBe(newContents);
    }, 25000);

    it("updates file contents larger than 4KB with chunked append", async () => {
        const largeContents = "z".repeat(5000);
        await service.updateFile(testFileId, largeContents);

        const bytes = await service.getFileContents(testFileId);
        expect(Buffer.from(bytes).toString("utf-8")).toBe(largeContents);
    }, 30000);

    it("updates expiration time via updateExpirationTime", async () => {
        const futureDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
        await service.updateExpirationTime(testFileId, futureDate);

        const expiration = await service.getExpirationTime(testFileId);
        // Consensus rounds to nearest second
        expect(expiration.getTime()).toBeGreaterThanOrEqual(
            futureDate.getTime() - 1000,
        );
    }, 25000);

    it("updates file memo via options", async () => {
        await service.updateFile(testFileId, {
            fileMemo: "updated memo",
        });

        const info = await service.getFileInfo(testFileId);
        expect(info.fileMemo).toBe("updated memo");
    }, 25000);
});
