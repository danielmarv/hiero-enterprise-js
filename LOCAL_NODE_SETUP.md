# Local Hiero Solo Network Setup Guide

This guide details how to seamlessly run a fully functional, localized Hashgraph deployment (the Solo network) directly on your machine. This eliminates the need for testnet accounts, eliminates fees, and allows for rapid protocol-level iteration right within your repository.

Below are the commands, configurations, and challenges overcome to set up the robust integration pipeline you see in `@hiero-enterprise/core`.

---

## Prerequisites

Before starting your local node, you must have the following running and installed:
- **Node.js**: `v20` or higher
- **Docker**: Docker Desktop (or Colima) must be actively running in the background.
- **Kubernetes CLI**: `kubectl` and `helm` are required. (The CLI will automatically assist in provisioning a local `kind` cluster).

---

## 🚀 Setup Commands

We've simplified the entire setup flow by mapping the underlying `@hashgraph/solo` CLI tools natively into NPM scripts in the repository root.

### 1. Install & Deploy the Network (`solo:setup`)
To spin up the network natively from scratch (including Consensus Nodes and the Mirror Node):

```bash
pnpm run solo:setup
```

*Under the hood, this runs `npx @hashgraph/solo one-shot single deploy -q`. This handles generating nodes, keys, stakes, and proxies automatically.*

> **Note**: The first deployment takes ~3-5 minutes as it downloads the latest Hashgraph Docker images and provisions the `kind-solo-cluster`.

### 2. Pause & Resume the Network (`solo:stop` & `solo:start`)
If you are done testing for the day but don't want to wipe your local ledger state and reinstall everything tomorrow, you can simply pause and resume the entire underlying Docker cluster instantly:

```bash
# Pauses the network instantly
pnpm run solo:stop

# Resumes the network instantly
pnpm run solo:start
```

*Under the hood, this executes `docker stop kind-solo-cluster-control-plane` and `docker start kind-solo-cluster-control-plane` to freeze/unfreeze the Kubernetes node instantly.*

### 3. Teardown & Wipe the Network (`solo:teardown`)
To completely wipe the network, delete the local state, and reclaim your machine's resources:

```bash
pnpm run solo:teardown
```

*Under the hood, this executes `npx @hashgraph/solo one-shot single destroy -q`.*

---

## 🛠 Challenges Encountered & How We Solved Them

Setting up a complete decentralized network stack locally comes with a few specific challenges. Here is a log of what we encountered and the solutions embedded in our test suite.

### 1. Solo CLI Version Incompatibilities
**The Issue**: Older tutorials and scripts reference commands like `solo node setup` or `solo network start`. In `@hashgraph/solo` version **0.34.1+**, these commands have been completely deprecated, leading to "command not found" crashes natively.
**The Solution**: We exclusively transitioned to the modern `one-shot` subcommands. Instead of a multi-step setup plan, we mapped `solo:start` entirely to `one-shot single deploy`, handling the Kubernetes setup and node deployment simultaneously.

### 2. Mirror Node Propagation Latency (Race Conditions)
**The Issue**: Hedera is fundamentally asynchronous. In our integration tests, we found that creating an account on the Consensus Node was lightning fast, but asserting that same account's data a millisecond later via the Mirror Node failed. The data simply hadn't propagated from Consensus to the Mirror API yet, causing flaky, blinking tests.
**The Solution**: We implemented a dynamic `waitForMirrorNodeRecord()` utility.
- Every transaction fired by `HieroContext` emits a standard `TransactionEvent` with its unique ID.
- Our test runner globally hooks this event and stores the most recent ID.
- Tests automatically call `waitForMirrorNodeRecord()`, which repeatedly polls the local Mirror Node REST API (`http://localhost:5551/api/v1/transactions/...`) until the transaction definitively drops before validating assertions.

### 3. Native Fetch Polyfill Conflicts in Vitest
**The Issue**: When attempting to execute requests to the Mirror Node, Vitest silently choked trying to resolve third-party `node-fetch` modules imported for basic HTTP requests. Because Vitest operates in complex isolation, it often ignores undeclared workspace implicit dependencies.
**The Solution**: We removed `node-fetch` from the implementation entirely. Since we mandate Node.js >= 20, we simply utilize the built-in, globally available `fetch()` API natively in Node, eliminating the explicit external dependency and ensuring tests compile cleanly.

### 4. Integration Tests Excluded by Default
**The Issue**: Running `vitest run` skipped all of our new `account-client.spec.ts` files silently. Default configuration in many monorepos prevents long-running `.spec` integration tests from running automatically during unit testing.
**The Solution**: We created an explicit sidecar configuration, `vitest.config.integration.ts`, designed exactly to whitelist integration files and vastly bump the connection timeout defaults (from 5s to 60s) directly catering to standard internal transaction lags. 
This is securely mapped via `pnpm run test:integration` globally.

### 5. Seamless CI Integration
**The Issue**: Expecting the remote GitHub Actions workers to manually `npm i -g @hashgraph/solo` and manage complex Docker/Kind bootstrapping limits CI speed.
**The Solution**: We utilized the pre-built `hiero-ledger/hiero-solo-action@v0.8` native GitHub Action inside `.github/workflows/ci.yml`. This automatically spins up a clean local network inside the remote runner, exports the connection URLs (`HIERO_MIRROR_NODE_URL`) natively as system variables, and runs standard integration tests against them securely without manual Docker steps on PRs.

### 6. Getting Stuck or Failing at "Install Kind" / "Create default cluster"
**The Issue**: When executing `pnpm solo:start`, the terminal freezes or fails explicitly with `% ELIFECYCLE Command failed` right at the `✖ Install Kind` or `◼ Create default cluster` stage.
**The Solution**: This occurs fundamentally due to the underlying Kubernetes/Docker bridge. To fix this:
1. **Ensure Docker is actively running**: `kind` (Kubernetes in Docker) cannot be installed or booted if the Docker Daemon (Docker Desktop, OrbStack, or Colima) is stopped. 
2. **Clean up zombie clusters**: If you previously forced-quit a Solo deployment, a broken `kind-solo-cluster` might still exist. Clean it forcefully by running `kind delete cluster --name kind-solo-cluster` (or `pnpm solo:stop`).
3. **Manual binary installation**: Sometimes Solo lacks local root permission to securely download the `kind` executable. Bypass this by manually installing it using Homebrew: `brew install kind`. Solo will detect the existing installation and skip the download phase entirely.
