# Hiero Enterprise JS

[![CI](../../actions/workflows/build.yml/badge.svg)](../../actions/workflows/build.yml)
[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/hiero-hackers/hiero-enterprise-js/badge)](https://scorecard.dev/viewer/?uri=github.com/hiero-hackers/hiero-enterprise-js)
[![Node.js](https://img.shields.io/badge/Node.js-≥20-green.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](./LICENSE)

Integrating a Hiero sdk into a production Node.js service has historically meant a lot of glue code that has nothing to do with your actual business logic: instantiating clients, managing config, plumbing operator keys, handling errors. Hiero Enterprise JS does that work for you. Drop in the middleware or module for your framework of choice and your routes get typed access to accounts, tokens, NFTs, smart contracts, topics, and mirror node queries — without any of the setup code.

It gives each major Node.js framework a native integration that matches how developers already think about that framework — middleware for Express/Fastify, dependency injection for NestJS. Write operations (creating accounts, minting tokens) go through the network client directly. Read operations (looking up balances, browsing NFTs) go through the mirror node REST API, which is faster and doesn't carry transaction fees. Both are exposed through a consistent interface so you don't have to think about which path to use.

## Packages

| Package | Description |
|---------|-------------|
| `@hiero-enterprise/express` | Express middleware — `req.hiero.*` |
| `@hiero-enterprise/fastify` | Fastify plugin — `fastify.hiero.*` |
| `@hiero-enterprise/nest` | NestJS module — `HieroModule.forRoot()` with full DI |

## Quick Start

```bash
# pick the package for your framework
npm install @hiero-enterprise/express
npm install @hiero-enterprise/fastify
npm install @hiero-enterprise/nest
```

Set your operator credentials as environment variables:

```bash
HIERO_NETWORK=testnet
HIERO_OPERATOR_ID=0.0.12345
HIERO_OPERATOR_KEY=302e020100300506032b6570...
```

Or pass config directly when registering the integration.

**Express**

```ts
import express from 'express';
import { hieroMiddleware } from '@hiero-enterprise/express';

const app = express();
app.use(hieroMiddleware());

app.get('/balance', async (req, res) => {
  const balance = await req.hiero.accountClient.getOperatorAccountBalance();
  res.json(balance);
});
```

**Fastify**

```ts
import Fastify from 'fastify';
import { hieroPlugin } from '@hiero-enterprise/fastify';

const app = Fastify();
await app.register(hieroPlugin);

app.get('/balance', async () => {
  return app.hiero.accountClient.getOperatorAccountBalance();
});
```

**NestJS**

```ts
import { Module } from '@nestjs/common';
import { HieroModule, AccountClient } from '@hiero-enterprise/nest';

@Module({ imports: [HieroModule.forRoot()] })
export class AppModule {}

@Controller('balance')
export class BalanceController {
  constructor(private readonly accounts: AccountClient) {}

  @Get()
  getBalance() {
    return this.accounts.getOperatorAccountBalance();
  }
}
```

## Architecture

```
  Express / Fastify / NestJS
  req.hiero.*  |  fastify.hiero.*  |  @Inject()
          │                    │
          ▼                    ▼
  ┌──────────────┐    ┌─────────────────┐
  │   Clients    │    │  Repositories   │
  │              │    │                 │
  │  Account     │    │  Account        │
  │  File        │    │  NFT            │
  │  Token       │    │  Token          │
  │  NFT         │    │  Topic          │
  │  Contract    │    │  Transaction    │
  │  Topic       │    │  Network        │
  └──────┬───────┘    └────────┬────────┘
         │                     │
         ▼                     ▼
  ┌──────────────┐    ┌─────────────────┐
  │ HieroContext │    │ MirrorNodeClient│
  │   Hiero SDK  │    │   REST / HTTP   │
  └──────┬───────┘    └────────┬────────┘
         │                     │
         └──────────┬──────────┘
                    ▼
           Hiero Network
        (testnet / mainnet)
```

Clients handle write operations through the Hiero SDK — transactions that go on-chain. Repositories handle reads through the mirror node, which doesn't cost fees and returns historical or indexed data. `HieroContext` owns the SDK client and operator credentials; both sides share it so there's one config source.

## Services

| Client | What it covers |
|--------|---------------|
| `AccountClient` | Create, delete, check balances |
| `FileClient` | Store and retrieve file content on-chain |
| `FungibleTokenClient` | Create, mint, burn, and transfer fungible tokens |
| `NftClient` | Create NFT types, mint (single + batch), burn, transfer |
| `SmartContractClient` | Deploy and call EVM-compatible smart contracts |
| `TopicClient` | Create topics, manage keys, submit messages |

## Mirror Node Queries

| Repository | What it covers |
|------------|---------------|
| `AccountRepository` | Look up accounts by ID or alias, fetch balances |
| `NftRepository` | Browse NFTs by owner, type, or serial number |
| `TokenRepository` | Fetch token metadata or tokens held by an account |
| `TopicRepository` | Read topic messages by sequence number |
| `TransactionRepository` | Query transactions by account or type |
| `NetworkRepository` | Exchange rates, supply stats, staking rewards |

## Testing

```ts
import { testConfig, createMockMirrorNodeClient } from '@hiero-enterprise/core/testing';
```

`testConfig` gives you safe dummy credentials that pass validation without hitting the network. `createMockMirrorNodeClient()` returns a fully typed mock with sensible defaults, so you can test your service layer without spinning up a node.

## Samples

Working examples are in [`samples/`](./samples). Each one is a minimal but real service you can run against testnet.

| Sample | Framework |
|--------|-----------|
| [express-sample](./samples/express-sample) | Express |
| [fastify-sample](./samples/fastify-sample) | Fastify |
| [nest-sample](./samples/nest-sample) | NestJS |

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for how to report bugs, request features, and submit pull requests. All commits require a DCO sign-off (`git commit -s`) and GPG signing.

## License

[Apache-2.0](./LICENSE)
