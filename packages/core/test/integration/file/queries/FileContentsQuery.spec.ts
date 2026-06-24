import { describe, it, expect, beforeAll } from "vitest";
import { setupIntegrationTestEnv } from "../../../utils/env.js";
import { waitForMirrorNodeRecord } from "../../../utils/mirror-node.js";
import { FileService } from "../../../../src/services/index.js";

describe("FileContentsQueryHandler [Integration]", () => {
    let service: FileService;
    let testFileId: string;
    const expectedContents = "query integration test contents";

    beforeAll(async () => {
        const ctx = setupIntegrationTestEnv();
        service = new FileService(ctx);

        testFileId = await service.createFile(expectedContents);
        await waitForMirrorNodeRecord();
    }, 25000);

    it("retrieves file contents as Uint8Array via getFileContents", async () => {
        const bytes = await service.getFileContents(testFileId);

        expect(bytes).toBeInstanceOf(Uint8Array);
        expect(Buffer.from(bytes).toString("utf-8")).toBe(expectedContents);
    }, 20000);

    it("retrieves the same contents via the readFile alias", async () => {
        const bytes = await service.readFile(testFileId);

        expect(bytes).toBeInstanceOf(Uint8Array);
        expect(Buffer.from(bytes).toString("utf-8")).toBe(expectedContents);
    }, 20000);

    it("returns empty contents for an empty file", async () => {
        const emptyFileId = await service.createFile();
        await waitForMirrorNodeRecord();

        const bytes = await service.getFileContents(emptyFileId);
        expect(bytes.length).toBe(0);
    }, 25000);
});
