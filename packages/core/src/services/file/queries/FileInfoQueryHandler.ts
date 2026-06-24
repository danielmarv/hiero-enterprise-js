import { FileInfoQuery as SdkFileInfoQuery } from "@hiero-ledger/sdk";
import type { FileInfo as SdkFileInfo } from "@hiero-ledger/sdk";
import type { IHieroContext } from "../../../context/index.js";
import { normalizeError } from "../../../errors/index.js";
import type { FileIdLike, FileInfo } from "../../../types/index.js";

export class FileInfoQueryHandler {
    constructor(private readonly context: IHieroContext) {}

    /**
     * Retrieve file metadata using `FileInfoQuery`.
     */
    async execute(fileId: FileIdLike): Promise<FileInfo> {
        try {
            const info = await new SdkFileInfoQuery()
                .setFileId(fileId)
                .execute(this.context.client);
            return this.mapFileInfo(info);
        } catch (error) {
            throw normalizeError(error, "FileService.getFileInfo");
        }
    }

    private mapFileInfo(info: SdkFileInfo): FileInfo {
        return {
            fileId: info.fileId.toString(),
            size: info.size.toNumber(),
            expirationTime: info.expirationTime.toDate(),
            isDeleted: info.isDeleted,
            keys: info.keys.toArray().map((key) => key.toString()),
            fileMemo: info.fileMemo,
            ledgerId: info.ledgerId?.toString(),
        };
    }
}
