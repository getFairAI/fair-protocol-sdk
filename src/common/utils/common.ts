/*
 * Copyright 2023 Fair protocol
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 *
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
  CANCEL_OPERATION,
  DEFAULT_TAGS,
  INFERENCE_PAYMENT,
  MARKETPLACE_ADDRESS,
  MODEL_DELETION,
  N_PREVIOUS_BLOCKS,
  SCRIPT_DELETION,
  SCRIPT_INFERENCE_RESPONSE,
  TAG_NAMES,
  U_CONTRACT_ID,
} from './constants';
import { IContractEdge, IEdge, ITagFilter } from '../types/arweave';
import { findByTags, getTxWithOwners } from './queries';
import { default as Pino } from 'pino';
import redstone from 'redstone-api';

export const logger = Pino({
  name: 'Fair-SDK',
  level: 'info',
});

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
    ...DEFAULT_TAGS,
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

export const getTxOwner = (tx: IEdge | IContractEdge) =>
  findTag(tx, 'sequencerOwner') ?? tx.node.owner.address;

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

export const getArPriceUSD = async () => {
  const price = await redstone.getPrice('AR');
  return price.value;
};

export const getUsdCost = async (cost: number) => {
  const arPrice = await getArPriceUSD();
  return cost * arPrice;
};
