# Fair SDK

## Installation

Install with npm

```sh
npm i @fair-protocol/sdk

```

## Usage

Using Commonjs:

```js
const FairSDK = require('@fair-protocol/sdk/cjs');
```

Using ESM:

```ts
import FairSDK from '@fair-protocol/sdk/node';
```

Or Import For Browser

```ts
import FairSDKWeb from '@fair-protocol/sdk/web';
```

**NOTE:** Please use Warp-Contracts v1.4.5

### Query API

**NOTE:** All Queries methods have same usage for web and node

* List Models

```ts
const models = await FairSDK.query.listModels();
```

* List Scripts

```ts
const allScripts = await FairSDK.query.listScripts(); // without filters
// OR
const scriptsByModelId  = await FairSDK.query.listScripts('txid'); // filter by model tx id
// OR
const modelTx = models[0].raw; // use model tx
const scriptsByModelTx = await FairSDK.query.listScripts(modelTx); // filter by model tx object
```

* List Operators

```ts
const allScripts = await FairSDK.query.listOperators(); // without filters
// OR
const scriptsByModelId  = await FairSDK.query.listOperators('txid'); // filter by script tx id
// OR
const scriptTx = allScripts[0]; // use scirpt tx
const scriptsByModelTx = await FairSDK.query.listOperators(scriptTx); // filter by script tx object
```

* Get Inference Requests

```ts
const nRequests = 10; // number of max txs to get
const requestTxs = await FairSDK.query.getRequests(nRequests);
```

* Get Inference Responses

```ts
const requestIds = [ 'responseTxId', 'responseTxId2', '...']; // number of max txs to get
const responsesForRequests = await FairSDK.query.getResponses(requestIds);

const nRequests = 10; // number of max txs to get
const allResponses = await FairSDK.query.getAllResponses(nRequests);
```

* Unified Search Utility

```ts
// basic search without filtering
// will return all available models, scripts and operators according to Fair Protocol rules
await FairSDK.query.search();

// Get only models
await FairSDK.query.search({ typeFilter: ['model'] });

// Get models and scripts
await FairSDK.query.search({ typeFilter: ['model', 'scripts'] });


// Get By model Type
await FairSDK.query.search({ modelCategory: [ 'image' ] });

// Filter with custom tags
await FairSDK.query.search({ tags: [ { name: 'Tag-A', value: 'value' } ] });

// Filter by Owners
await FairSDK.query.search({ owners: [ 'address' ] });
```

### Inference

* Execute Prompt For Node

```ts
await FairSDK.setWallet('./wallet-user.json'); // load wallet into sdk
await FairSDK.address; // load address
await FairSDK.use('model', 'uVDgZu7c78Ro2RuPS6-fqF75VoShO8CIKSMrVe9uAfw'); // use model by payment txid
await FairSDK.use('script', '1Ra-E9rYvcShaFRqp38Lkf1SP1FFDtYggZILFpggtNE'); // use script by payment txid
await FairSDK.use('operator', 'IGpjxRSgZoghaxZ-arElfMI2cRaXWPh34MGzOe8NTsE'); // use operator by txid

await FairSDK.prompt('This is a test');
```

* Inference Usage for Browser

```ts
// need to initialize arweave and pass it's reference
import Arweave from 'arweave';
const arweave = Arweave.init();

// init SDK with created arweave instance
await FairSDKWeb.init(arweave); // load address
await FairSDKWeb.connectWallet(); // connect web browser wallet

await FairSDKWeb.use('model', 'uVDgZu7c78Ro2RuPS6-fqF75VoShO8CIKSMrVe9uAfw'); // use model by payment txid
await FairSDKWeb.use('script', '1Ra-E9rYvcShaFRqp38Lkf1SP1FFDtYggZILFpggtNE'); // use script by payment txid
await FairSDKWeb.use('operator', 'IGpjxRSgZoghaxZ-arElfMI2cRaXWPh34MGzOe8NTsE'); // use operator by txid

await FairSDKWeb.prompt('This is a test');
```

* Prompt configuration

```ts
// overriding a single field in configuration

// override request Caller
await FairSDK.prompt('this is a test', {
  ...FairSDK.constants.DEFAULT_PROMPT_CONFIGURATION,
  requestCaller: 'ExampleCallerAddress'
});

// use full custom configuration
await FairSDK.prompt('this is a test', {
  requestCaller: 'ExampleCallerAddress',
  generateAssets: 'rareweave';
  assetNames: [ 'Asset #1', 'Asset #2' ], // one name per asset, if number of assets generated is bigger than names provided, names will be repeated in order
  customTags: [
    { name: 'Custom-Tag#1', value: 'Custom Value #1'},
  ],
  negativePrompt: 'ugly, bad hands, ...',
  nImages: 1, // 1- 10
  title: 'Title', // 'Title' tag -> will be applied to all assets
  description: 'Some Description'; // 'Title' tag -> will be applied to all assets
  // rareweave config will only be used if 'generateAssets' is 'rareweave'
  rareweaveConfig: {
    
    royalty: 10; // 0-100 %
  },
  requestCaller: 'ExampleCallerAddress';
});
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


// more utils using
// TODO: Add mor edocumentation to utils
const utils = FairSDK.utils;

// **NOTE:** Set Wallet only exists for node sdk
await FairSDK.setWallet('./wallet-user.json'); // load wallet into sdk
// or web

FairSDK.setLogLevels(level);

FairSDKWeb.model; // returns loaded model (after FairSDKWeb.use)
FairSDKWeb.script; // returns loaded script (after FairSDKWeb.use)
FairSDKWeb.operator; // returns loaded operator (after FairSDKWeb.use)
await FairSDKWeb.address; // returns loaded address
await FairSDKWeb.getArBalance(); // get ar balance for the current loaded wallet
await FairSDKWeb.getUBalance(); // get u balance for the current loaded wallet

// more utils using
// TODO: Add mor edocumentation to utils
const utils = FairSDKWeb.utils;
```

## Development

* Run Tests

```sh
npm run test
```
