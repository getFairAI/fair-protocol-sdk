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

import { TAG_NAMES } from './constants';
import { IContractEdge, IEdge } from '../types/arweave';
import { default as Pino } from 'pino';
import redstone from 'redstone-api';

export const logger = Pino({
  name: 'Fair-SDK',
  level: 'info',
});

type tagName = keyof typeof TAG_NAMES;
export const findTag = (tx: IEdge | IContractEdge, tagName: tagName) =>
  tx.node.tags.find((tag) => tag.name === TAG_NAMES[tagName])?.value;

export const getTxOwner = (tx: IEdge | IContractEdge) =>
  findTag(tx, 'sequencerOwner') ?? tx.node.owner.address;

export const filterByUniqueModelTxId = <T extends Array<IContractEdge>>(data: T) => {
  const newData: string[] = [];
  // do not mutate array
  const mutatbleCopy = [...data];
  mutatbleCopy.sort((a: IContractEdge, b: IContractEdge) => {
    const aTimestamp = parseInt(findTag(a, 'unixTime') as string, 10);
    const bTimestamp = parseInt(findTag(b, 'unixTime') as string, 10);

    if (aTimestamp === bTimestamp) {
      return 1;
    }
    return bTimestamp - aTimestamp;
  });

  return mutatbleCopy.filter((el) => {
    if (newData.includes(findTag(el, 'modelTransaction') as string)) {
      return false;
    } else {
      newData.push(findTag(el, 'modelTransaction') as string);
      return true;
    }
  });
};

export const filterByUniqueScriptTxId = <T extends Array<IContractEdge | IEdge>>(data: T) => {
  const newData: string[] = [];
  const mutatbleCopy = [...data];
  mutatbleCopy.sort((a: IContractEdge | IEdge, b: IContractEdge | IEdge) => {
    const aTimestamp = parseInt(findTag(a, 'unixTime') as string, 10);
    const bTimestamp = parseInt(findTag(b, 'unixTime') as string, 10);

    if (aTimestamp === bTimestamp) {
      return 1;
    }
    return bTimestamp - aTimestamp;
  });

  return mutatbleCopy.filter((el) => {
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
