import { FileContentsQuery as SdkFileContentsQuery } from "@hiero-ledger/sdk";
import type { IHieroContext } from "../../../context/index.js";
import { normalizeError } from "../../../errors/index.js";
import type { FileIdLike } from "../../../types/index.js";

export class FileContentsQueryHandler {
    constructor(private readonly context: IHieroContext) {}

    /**
     * Retrieve the binary contents of a file using `FileContentsQuery`.
     */
    async execute(fileId: FileIdLike): Promise<Uint8Array> {
        try {
            return await new SdkFileContentsQuery()
                .setFileId(fileId)
                .execute(this.context.client);
        } catch (error) {
            throw normalizeError(error, "FileService.getFileContents");
        }
    }
}
