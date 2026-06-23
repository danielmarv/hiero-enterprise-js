import { describe, it, expect, beforeAll } from "vitest";
import { setupIntegrationTestEnv } from "../utils/env.js";
import { waitForMirrorNodeRecord } from "../utils/mirror-node.js";
import { FileService } from "../../src/services/file-service.js";

describe("FileService [Integration]", () => {
    let client: FileService;
    let testFileId: string;
    let expectedContents =
        "Hello from Hiero Enterprise Node Integration Tests!";

    beforeAll(() => {
        const ctx = setupIntegrationTestEnv();
        client = new FileService(ctx);
    });

    it("creates a file directly and dynamically handles underlying chunks", async () => {
        const content = Buffer.from(expectedContents);
        const fileId = await client.createFile(content);

        expect(typeof fileId).toBe("string");
        expect(fileId).toBeDefined();

        await waitForMirrorNodeRecord(); // Allow node to sync
        testFileId = fileId;
    }, 25000);

    it("reads the file contents natively from the consensus node", async () => {
        const bytes = await client.getFileContents(testFileId);

        const decoded = Buffer.from(bytes).toString("utf-8");
        expect(decoded).toBe(expectedContents);
    }, 20000);

    it("appends contents explicitly with FileAppendTransaction", async () => {
        expectedContents += " Appended via FileAppendTransaction.";

        await client.appendFile(
            testFileId,
            Buffer.from(" Appended via FileAppendTransaction."),
        );

        const bytes = await client.getFileContents(testFileId);
        expect(Buffer.from(bytes).toString("utf-8")).toBe(expectedContents);
    }, 25000);

    it("retrieves file metadata with FileInfoQuery", async () => {
        const info = await client.getFileInfo(testFileId);

        expect(info.fileId).toBe(testFileId);
        expect(info.size).toBe(Buffer.byteLength(expectedContents));
        expect(info.isDeleted).toBe(false);
        expect(info.expirationTime).toBeInstanceOf(Date);
        expect(Array.isArray(info.keys)).toBe(true);
    }, 20000);

    it("updates file contents with FileUpdateTransaction", async () => {
        expectedContents = "Updated by FileUpdateTransaction.";

        await client.updateFile(testFileId, Buffer.from(expectedContents));

        const bytes = await client.getFileContents(testFileId);
        expect(Buffer.from(bytes).toString("utf-8")).toBe(expectedContents);
    }, 25000);

    it("deletes the file from the ledger network", async () => {
        await client.deleteFile(testFileId);

        await waitForMirrorNodeRecord();

        const isDeleted = await client.isDeleted(testFileId);
        expect(isDeleted).toBe(true);
    }, 25000);
});
