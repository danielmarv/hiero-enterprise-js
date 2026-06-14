/**
 * Thin Mirror Node REST helpers for integration tests.
 *
 * The SDK does not expose a typed REST client for the Mirror Node, so each
 * spec used to inline its own `fetch` call plus error handling.  These
 * helpers centralise the URL building, status checking, and JSON parsing so
 * every integration test can assert against the Mirror Node uniformly.
 *
 * Reads `HIERO_MIRROR_NODE_URL` from the environment (set in
 * `setupIntegrationTestEnv`).
 */

const MIRROR_URL = process.env.HIERO_MIRROR_NODE_URL;

export interface MirrorAllowance {
    owner: string;
    spender: string;
    amount?: number;
    token_id?: string;
}

export interface MirrorNftRecord {
    spender?: string | null;
    token_id?: string;
    serial_number?: number;
}

async function getJson<T>(url: string): Promise<T> {
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(
            `Mirror Node GET ${url} failed with status ${res.status}: ${await res.text()}`,
        );
    }
    return (await res.json()) as T;
}

/**
 * Fetch HBAR (crypto) allowances granted by `ownerAccountId`.
 */
export async function queryHbarAllowances(
    ownerAccountId: string,
): Promise<MirrorAllowance[]> {
    const data = await getJson<{ allowances?: MirrorAllowance[] }>(
        `${MIRROR_URL}/api/v1/accounts/${ownerAccountId}/allowances/crypto`,
    );
    return data.allowances ?? [];
}

/**
 * Fetch fungible token allowances granted by `ownerAccountId`.
 */
export async function queryTokenAllowances(
    ownerAccountId: string,
): Promise<MirrorAllowance[]> {
    const data = await getJson<{ allowances?: MirrorAllowance[] }>(
        `${MIRROR_URL}/api/v1/accounts/${ownerAccountId}/allowances/tokens`,
    );
    return data.allowances ?? [];
}

/**
 * Fetch the per-serial NFT record. Per-serial spender approvals appear on
 * the NFT itself rather than the owner-account allowances view.
 */
export async function queryNftRecord(
    tokenId: string,
    serial: number,
): Promise<MirrorNftRecord> {
    return getJson<MirrorNftRecord>(
        `${MIRROR_URL}/api/v1/tokens/${tokenId}/nfts/${serial}`,
    );
}
