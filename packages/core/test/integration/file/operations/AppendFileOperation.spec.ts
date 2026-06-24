import { describe, it, expect, beforeAll } from "vitest";
import { setupIntegrationTestEnv } from "../../../utils/env.js";
import { waitForMirrorNodeRecord } from "../../../utils/mirror-node.js";
import { FileService } from "../../../../src/services/index.js";

describe("AppendFileOperation [Integration]", () => {
    let service: FileService;
    let testFileId: string;

    beforeAll(async () => {
        const ctx = setupIntegrationTestEnv();
        service = new FileService(ctx);

        // Create a file to append to
        testFileId = await service.createFile("initial");
        await waitForMirrorNodeRecord();
    }, 25000);

    it("appends contents to an existing file", async () => {
        await service.appendFile(testFileId, " appended");

        const bytes = await service.getFileContents(testFileId);
        expect(Buffer.from(bytes).toString("utf-8")).toBe("initial appended");
    }, 25000);

    it("appends a second time (accumulated contents)", async () => {
        await service.appendFile(testFileId, " more");

        const bytes = await service.getFileContents(testFileId);
        expect(Buffer.from(bytes).toString("utf-8")).toBe(
            "initial appended more",
        );
    }, 25000);

    it("appends large content with chunking", async () => {
        const largeChunk = "y".repeat(5000);
        await service.appendFile(testFileId, largeChunk);

        const bytes = await service.getFileContents(testFileId);
        const decoded = Buffer.from(bytes).toString("utf-8");
        expect(decoded).toContain(largeChunk);
    }, 30000);
});
