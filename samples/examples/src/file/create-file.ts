/**
 * Create File — basic file creation.
 *
 * Demonstrates file creation on the Hiero network:
 * - Creates a file with text contents
 * - Reads it back via consensus node query
 *
 * Run: pnpm tsx src/file/create-file.ts
 */

import { FileService, HieroContext } from "@hiero-enterprise/core";
import { getED25519Config } from "../env.js";

async function main() {
    const context = new HieroContext(getED25519Config());
    const fileService = new FileService(context);

    const contents = "Hello from Hiero Enterprise!";

    const fileId = await fileService.createFile(
        contents,
        new Date("2030-01-01"),
    );
    console.log("Created file:", fileId);

    const readBack = await fileService.getFileContents(fileId);
    console.log("Contents:", Buffer.from(readBack).toString());

    context.client.close();
}

void main();
