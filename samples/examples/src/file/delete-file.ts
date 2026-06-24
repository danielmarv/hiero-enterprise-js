/**
 * Delete File — create and then delete a file.
 *
 * Demonstrates file lifecycle management: create, verify, delete, confirm deletion.
 *
 * Run: pnpm tsx src/file/delete-file.ts
 */

import { FileService, HieroContext } from "@hiero-enterprise/core";
import { getED25519Config } from "../env.js";

async function main() {
    const context = new HieroContext(getED25519Config());
    const fileService = new FileService(context);

    // Create a file
    const fileId = await fileService.createFile("temporary file");
    console.log("Created file:", fileId);

    // Delete it
    await fileService.deleteFile(fileId);
    console.log("Deleted file:", fileId);

    // Confirm deletion
    const deleted = await fileService.isDeleted(fileId);
    console.log("Is deleted:", deleted);

    context.client.close();
}

void main();
