import { HieroContext } from "../../src/context/hiero-context.js";

export const IntegrationTracker = {
    lastTransactionId: "" as string | undefined,
};

export function setupIntegrationTestEnv(): HieroContext {
    const ctx = new HieroContext();

    // Attach tracker to automatically hook the generated ID
    ctx.addTransactionListener({
        onAfterTransaction: (event) => {
            if (event.transactionId) {
                IntegrationTracker.lastTransactionId = event.transactionId;
            }
        },
    });

    return ctx;
}
