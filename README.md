# Fair SDK

## Installation

## Usage

```ts
import FairSdk from 'fair-protocol-sdk';
```

### Query API

* List Models

```ts
const models = await FairSDK.queries.listModels();
```

* List Scripts

```ts
const allScripts = await FairSDK.queries.listScripts(); // without filters
// OR
const scriptsByModelId  = await FairSDK.queries.listScripts('txid'); // filter by model tx id
// OR
const modelTx = models[0].raw; // use model tx
const scriptsByModelTx = await FairSDK.queries.listScripts(modelTx); // filter by model tx object
```

* List Operators

```ts
const allScripts = await FairSDK.queries.listOperators(); // without filters
// OR
const scriptsByModelId  = await FairSDK.queries.listOperators('txid'); // filter by script tx id
// OR
const scriptTx = allScripts[0]; // use scirpt tx
const scriptsByModelTx = await FairSDK.queries.listOperators(scriptTx); // filter by script tx object
```

* Get Inference Requests

```ts
const nRequests = 10; // number of max txs to get
const requestTxs = await FairSDK.queries.getRequests(nRequests);
```

* Get Inference Responses

```ts
const requestIds = [ 'responseTxId', 'responseTxId2', '...']; // number of max txs to get
const responsesForRequests = await FairSDK.queries.getResponses(requestIds);

const nRequests = 10; // number of max txs to get
const allResponses = await FairSDK.queries.getAllResponses(nRequests);
```

### Inference

* Execute Prompt

```ts
await FairSDK.setWallet('./wallet-user.json'); // load wallet into sdk
await FairSDK.address; // load address
await FairSDK.use('model', 'uVDgZu7c78Ro2RuPS6-fqF75VoShO8CIKSMrVe9uAfw'); // use model by payment txid
await FairSDK.use('script', '1Ra-E9rYvcShaFRqp38Lkf1SP1FFDtYggZILFpggtNE'); // use script by payment txid
await FairSDK.use('operator', 'IGpjxRSgZoghaxZ-arElfMI2cRaXWPh34MGzOe8NTsE'); // use operator by txid

await FairSDK.prompt('This is a test');
```

### Utilities

```ts
// change SDK log level
type logLevels = 'fatal' | 'error' | 'trace' | 'debug' | 'info' | 'warn';
const level = 'debug'
FairSDK.setLogLevels(level);

FairSDK.model; // returns loaded model (after FairSDK.use)
FairSDK.script; // returns loaded script (after FairSDK.use)
FairSDK.operator; // returns loaded operator (after FairSDK.use)
await FairSDK.address; // returns loaded address

await FairSDK.getArBalance(); // get ar balance for the current loaded wallet
await FairSDK.getUBalance(); // get u balance for the current loaded wallet
await FairSDK.setWallet('./wallet-user.json'); // load wallet into sdk
```
