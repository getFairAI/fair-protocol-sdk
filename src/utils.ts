import {
  CANCEL_OPERATION,
  DEFAULT_TAGS,
  DEFAULT_TAGS_FOR_TOKENS,
  INFERENCE_PAYMENT,
  MARKETPLACE_ADDRESS,
  MODEL_DELETION,
  NET_ARWEAVE_URL,
  NODE2_BUNDLR_URL,
  N_PREVIOUS_BLOCKS,
  SCRIPT_DELETION,
  SCRIPT_INFERENCE_RESPONSE,
  TAG_NAMES,
  U_CONTRACT_ID,
  U_DIVIDER,
} from './constants';
import { IContractEdge, IEdge, ITagFilter, UState } from './interface';
import { findByTags, getTxWithOwners } from './queries';
import { default as Pino } from 'pino';
import Arweave from 'arweave';
import { JWKInterface, Tags, WarpFactory } from 'warp-contracts';
import Bundlr from '@bundlr-network/client/build/cjs/cjsIndex';

export const logger = Pino({
  name: 'Fair-SDK',
  level: 'debug',
});

const arweave = Arweave.init({
  host: NET_ARWEAVE_URL.split('//')[1],
  port: 443,
  protocol: 'https',
});

const warp = WarpFactory.forMainnet();

const contract = warp.contract(U_CONTRACT_ID).setEvaluationOptions({
  remoteStateSyncSource: 'https://dre-6.warp.cc/contract',
  remoteStateSyncEnabled: true,
  unsafeClient: 'skip',
  allowBigInt: true,
  internalWrites: true,
});

// arweave functionality

export const jwkToAddress = async (jwk: JWKInterface) => arweave.wallets.jwkToAddress(jwk);

export const getArBalance = async (address: string) => {
  const winstonBalance = await arweave.wallets.getBalance(address);

  return arweave.ar.winstonToAr(winstonBalance);
};

// warp u funcitonality
export const connectToU = (jwk: JWKInterface) => {
  contract.connect(jwk);
};

export const getUBalance = async (address: string) => {
  try {
    const { cachedValue } = await contract.readState();

    const balance = (cachedValue as UState).state.balances[address];

    return parseFloat(balance) / U_DIVIDER;
  } catch (error) {
    return 0;
  }
};

export const sendU = async (to: string, amount: string | number, tags: Tags) => {
  if (typeof amount === 'number') {
    amount = amount.toString();
  }

  const result = await contract.writeInteraction(
    {
      function: 'transfer',
      target: to,
      qty: amount,
    },
    { tags, strict: true },
  );

  return result?.originalTxId;
};

// logic functionality

export const isFakeDeleted = async (txid: string, owner: string, type: 'script' | 'model') => {
  const deleteTags: ITagFilter[] = [];

  if (type === 'model') {
    deleteTags.push({ name: TAG_NAMES.operationName, values: [MODEL_DELETION] });
    deleteTags.push({ name: TAG_NAMES.modelTransaction, values: [txid] });
  } else {
    deleteTags.push({ name: TAG_NAMES.operationName, values: [SCRIPT_DELETION] });
    deleteTags.push({ name: TAG_NAMES.scriptTransaction, values: [txid] });
  }

  const owners = owner ? [MARKETPLACE_ADDRESS, owner] : [MARKETPLACE_ADDRESS];

  const data = await getTxWithOwners(deleteTags, owners);

  return data.length > 0;
};

type tagName = keyof typeof TAG_NAMES;
export const findTag = (tx: IEdge | IContractEdge, tagName: tagName) =>
  tx.node.tags.find((tag) => tag.name === TAG_NAMES[tagName])?.value;

export const getTxOwner = (tx: IEdge | IContractEdge) => {
  return findTag(tx, 'sequencerOwner') ?? tx.node.owner.address;
};

export const filterByUniqueScriptTxId = <T extends Array<IContractEdge | IEdge>>(data: T) => {
  const newData: string[] = [];
  data.sort((a: IContractEdge | IEdge, b: IContractEdge | IEdge) => {
    const aTimestamp = parseInt(findTag(a, 'unixTime') as string, 10);
    const bTimestamp = parseInt(findTag(b, 'unixTime') as string, 10);

    if (aTimestamp === bTimestamp) {
      return 1;
    }
    return aTimestamp - bTimestamp;
  });

  return data.filter((el) => {
    if (newData.includes(findTag(el, 'scriptTransaction') as string)) {
      return false;
    } else {
      newData.push(findTag(el, 'scriptTransaction') as string);
      return true;
    }
  });
};

export const filterPreviousVersions = <T extends Array<IContractEdge | IEdge>>(data: T) => {
  const oldVersionsTxIds: string[] = [];

  for (const el of data) {
    // const previousVersion = findTag(el, 'updateFor');
    // previousVersions should include all versions including updateFor
    const olderVersions = findTag(el, 'previousVersions');
    if (olderVersions) {
      const versionsArray: string[] = JSON.parse(olderVersions);
      oldVersionsTxIds.push(...versionsArray);
    }
    // Array.from(new Set(el))
  }

  return data.filter(
    (el) =>
      !oldVersionsTxIds.find(
        (oldTxId) => el.node.id === oldTxId || findTag(el, 'scriptTransaction') === oldTxId,
      ),
  ) as T;
};

const getOperatorRequests = async (
  address: string,
  operatorFee: string,
  scriptName: string,
  scriptCurator: string,
) => {
  const qty = parseFloat(operatorFee);
  const requestPaymentsInputNumber = JSON.stringify({
    function: 'transfer',
    target: address,
    qty,
  });
  const requestPaymentsInputStr = JSON.stringify({
    function: 'transfer',
    target: address,
    qty: qty.toString(),
  });
  const tags = [
    ...DEFAULT_TAGS,
    { name: TAG_NAMES.contract, values: [U_CONTRACT_ID] },
    { name: TAG_NAMES.input, values: [requestPaymentsInputNumber, requestPaymentsInputStr] },
    { name: TAG_NAMES.operationName, values: [INFERENCE_PAYMENT] },
    { name: TAG_NAMES.scriptName, values: [scriptName] },
    { name: TAG_NAMES.scriptCurator, values: [scriptCurator] },
  ];
  const first = N_PREVIOUS_BLOCKS;

  const data = await findByTags(tags, first);

  return data.transactions.edges;
};

const hasOperatorAnswered = async (request: IEdge | IContractEdge, opAddress: string) => {
  const responseTags: ITagFilter[] = [
    ...DEFAULT_TAGS_FOR_TOKENS,
    {
      name: TAG_NAMES.requestTransaction,
      values: [findTag(request, 'inferenceTransaction') as string],
    },
    { name: TAG_NAMES.operationName, values: [SCRIPT_INFERENCE_RESPONSE] },
  ];

  const data: IEdge[] = await getTxWithOwners(responseTags, [opAddress]);

  if (data.length === 0) {
    return false;
  } else {
    return true;
  }
};

const isCancelled = async (txid: string, opAddress: string) => {
  const cancelTags = [
    ...DEFAULT_TAGS,
    { name: TAG_NAMES.operationName, values: [CANCEL_OPERATION] },
    { name: TAG_NAMES.registrationTransaction, values: [txid] },
  ];

  const data: IEdge[] = await getTxWithOwners(cancelTags, [opAddress]);

  return data.length > 0;
};

export const isValidRegistration = async (
  txid: string,
  operatorFee: string,
  opAddress: string,
  scriptName: string,
  scriptCurator: string,
) => {
  const isCancelledTx = await isCancelled(txid, opAddress);
  if (isCancelledTx) {
    return false;
  }

  const lastRequests = await getOperatorRequests(opAddress, operatorFee, scriptName, scriptCurator);
  for (const request of lastRequests) {
    // check if operator has answered last 7 requests
    if (!(await hasOperatorAnswered(request, opAddress))) {
      // if any of the last 7 requests has not been answered, the operator is not valid
      return false;
    }
  }

  return true;
};

export const initBundlr = async (jwk: JWKInterface) => {
  const bundlr = new Bundlr(NODE2_BUNDLR_URL, 'arweave', jwk);
  await bundlr.ready();

  return bundlr;
};
