import { describe, it, expect, beforeAll } from "vitest";
import { setupIntegrationTestEnv } from "../../../utils/env.js";
import { waitForMirrorNodeRecord } from "../../../utils/mirror-node.js";
import { FileService } from "../../../../src/services/index.js";

describe("DeleteFileOperation [Integration]", () => {
    let service: FileService;
    let testFileId: string;

    beforeAll(async () => {
        const ctx = setupIntegrationTestEnv();
        service = new FileService(ctx);

        testFileId = await service.createFile("to be deleted");
        await waitForMirrorNodeRecord();
    }, 25000);

    it("deletes a file from the ledger", async () => {
        await service.deleteFile(testFileId);
        await waitForMirrorNodeRecord();

        const isDeleted = await service.isDeleted(testFileId);
        expect(isDeleted).toBe(true);
    }, 25000);
});
