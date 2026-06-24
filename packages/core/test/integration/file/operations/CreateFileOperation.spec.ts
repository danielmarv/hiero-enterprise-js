import { describe, it, expect, beforeAll } from "vitest";
import { setupIntegrationTestEnv } from "../../../utils/env.js";
import { waitForMirrorNodeRecord } from "../../../utils/mirror-node.js";
import { FileService } from "../../../../src/services/index.js";

describe("CreateFileOperation [Integration]", () => {
    let service: FileService;

    beforeAll(() => {
        const ctx = setupIntegrationTestEnv();
        service = new FileService(ctx);
    });

    it("creates a file with string contents", async () => {
        const fileId = await service.createFile("Hello Hiero");

        expect(typeof fileId).toBe("string");
        expect(fileId).toMatch(/^\d+\.\d+\.\d+$/);

        await waitForMirrorNodeRecord();

        const bytes = await service.getFileContents(fileId);
        expect(Buffer.from(bytes).toString("utf-8")).toBe("Hello Hiero");
    }, 25000);

    it("creates a file with Uint8Array contents and expiration", async () => {
        const contents = Buffer.from("binary payload");
        const expiration = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // +60 days
        const fileId = await service.createFile(contents, expiration);

        expect(fileId).toBeDefined();
        await waitForMirrorNodeRecord();

        const info = await service.getFileInfo(fileId);
        expect(info.size).toBe(contents.length);
        expect(info.expirationTime).toBeInstanceOf(Date);
    }, 25000);

    it("creates a file larger than 4KB using chunked append", async () => {
        const largeContents = "x".repeat(5000);
        const fileId = await service.createFile(largeContents);

        expect(fileId).toBeDefined();
        await waitForMirrorNodeRecord();

        const bytes = await service.getFileContents(fileId);
        expect(Buffer.from(bytes).toString("utf-8")).toBe(largeContents);
    }, 30000);

    it("creates a file with options object (keys, memo)", async () => {
        const fileId = await service.createFile({
            contents: "with memo",
            fileMemo: "integration test file",
        });

        expect(fileId).toBeDefined();
        await waitForMirrorNodeRecord();

        const info = await service.getFileInfo(fileId);
        expect(info.fileMemo).toBe("integration test file");
    }, 35000);

    it("creates an empty file when no contents provided", async () => {
        const fileId = await service.createFile();

        expect(fileId).toBeDefined();
        await waitForMirrorNodeRecord();

        const info = await service.getFileInfo(fileId);
        expect(info.size).toBe(0);
    }, 35000);
});
