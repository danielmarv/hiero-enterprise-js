/**
 * Update File — update contents and metadata.
 *
 * Demonstrates updating a file's contents and metadata fields.
 *
 * Run: pnpm tsx src/file/update-file.ts
 */

import { FileService, HieroContext } from "@hiero-enterprise/core";
import { getED25519Config } from "../env.js";

async function main() {
    const context = new HieroContext(getED25519Config());
    const fileService = new FileService(context);

    // Create a file first
    const fileId = await fileService.createFile("initial contents");
    console.log("Created file:", fileId);

    // Update contents
    await fileService.updateFile(fileId, "updated contents");
    console.log("Updated file contents");

    // Update metadata
    await fileService.updateFile(fileId, {
        fileMemo: "enterprise managed file",
    });
    console.log("Updated file memo");

    // Read back
    const contents = await fileService.getFileContents(fileId);
    console.log("Contents:", Buffer.from(contents).toString());

    const info = await fileService.getFileInfo(fileId);
    console.log("File info:", info);

    context.client.close();
}

void main();
