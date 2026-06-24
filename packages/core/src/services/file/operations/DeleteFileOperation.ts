import { FileDeleteTransaction } from "@hiero-ledger/sdk";
import type { IHieroContext } from "../../../context/index.js";
import { normalizeError } from "../../../errors/index.js";
import type { FileDeleteOptions, FileIdLike } from "../../../types/index.js";
import { TransactionExecutor } from "../../transaction/index.js";

export class DeleteFileOperation {
    private readonly executor: TransactionExecutor;

    constructor(private readonly context: IHieroContext) {
        this.executor = new TransactionExecutor(context);
    }

    /**
     * Delete a file using `FileDeleteTransaction`.
     */
    async execute(
        fileId: FileIdLike,
        options: FileDeleteOptions = {},
    ): Promise<void> {
        try {
            const tx = new FileDeleteTransaction().setFileId(fileId);

            await this.executor.run(
                tx,
                options,
                {
                    type: "FileDelete",
                    serviceName: "FileService",
                    methodName: "deleteFile",
                    timestamp: new Date(),
                },
                () => undefined,
            );
        } catch (error) {
            throw normalizeError(error, "FileService.deleteFile");
        }
    }
}
