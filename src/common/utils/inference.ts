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

import { Tag } from 'warp-contracts';
import { FairScript } from '../classes/script';
import { ITag } from '../types/arweave';
import { getUsdCost, logger } from './common';
import {
  TAG_NAMES,
  INFERENCE_PAYMENT,
  secondInMS,
  OPERATOR_PERCENTAGE_FEE,
  MARKETPLACE_PERCENTAGE_FEE,
  CREATOR_PERCENTAGE_FEE,
  CURATOR_PERCENTAGE_FEE,
  VAULT_ADDRESS,
  SCRIPT_INFERENCE_REQUEST,
  PROTOCOL_NAME,
  PROTOCOL_VERSION,
  ATOMIC_ASSET_CONTRACT_SOURCE_ID,
  UDL_ID,
  RAREWEAVE_CONTRACT_ID,
  TX_ORIGIN_NODE,
  TX_ORIGIN_WEB,
  U_DIVIDER,
} from './constants';
import { sendU } from './warp';
import { Configuration } from '../types/configuration';

const MAX_ROYALTY = 100;
const RADIX = 10;

export const addAtomicAssetTags = (
  tags: ITag[],
  userAddr: string,
  name: string,
  ticker: string,
  balance = 1,
  appendIdx?: number,
) => {
  // add atomic asset tags
  const manifest = {
    evaluationOptions: {
      sourceType: 'redstone-sequencer',
      allowBigInt: true,
      internalWrites: true,
      unsafeClient: 'skip',
      useConstructor: false,
    },
  };
  const initState = {
    firstOwner: userAddr,
    canEvolve: false,
    balances: {
      [userAddr]: balance,
    },
    name,
    ticker,
  };

  const newTags = [
    { name: TAG_NAMES.appName, value: 'SmartWeaveContract' },
    { name: TAG_NAMES.appVersion, value: '0.3.0' },
    { name: TAG_NAMES.contractSrc, value: ATOMIC_ASSET_CONTRACT_SOURCE_ID },
    {
      name: TAG_NAMES.contractManifest,
      value: JSON.stringify(manifest),
    },
    {
      name: TAG_NAMES.initState,
      value: JSON.stringify(initState),
    },
  ];

  if (!appendIdx) {
    tags.push(...newTags);
  } else {
    tags.splice(appendIdx, 0, ...newTags);
  }
};

export const addRareweaveTags = (
  tags: ITag[],
  userAddr: string,
  name: string,
  description: string,
  royalty: number,
  contentType: string,
  balance = 1,
  appendIdx?: number,
) => {
  if (royalty < 0 || royalty > MAX_ROYALTY) {
    royalty = 0;
  }

  // add atomic asset tags
  const manifest = {
    evaluationOptions: {
      sourceType: 'redstone-sequencer',
      allowBigInt: true,
      internalWrites: true,
      unsafeClient: 'skip',
      useConstructor: false,
    },
  };
  const initState = {
    owner: userAddr,
    minter: userAddr,
    ticker: 'RWNFT',
    balances: {
      [userAddr]: balance,
    },
    createdAt: Date.now(),
    evolve: null,
    forSale: false,
    price: 0,
    reservationBlockHeight: 0,
    name,
    description,
    contentType,
    royalty,
  };

  const newTags = [
    { name: TAG_NAMES.appName, value: 'SmartWeaveContract' },
    { name: TAG_NAMES.appVersion, value: '0.3.0' },
    { name: TAG_NAMES.contractSrc, value: RAREWEAVE_CONTRACT_ID },
    {
      name: TAG_NAMES.contractManifest,
      value: JSON.stringify(manifest),
    },
    {
      name: TAG_NAMES.initState,
      value: JSON.stringify(initState),
    },
  ];

  if (!appendIdx) {
    tags.push(...newTags);
  } else {
    tags.splice(appendIdx, 0, ...newTags);
  }
};

const addConfigTags = (tags: ITag[], configuration: Configuration) => {
  if (configuration.assetNames) {
    tags.push({ name: TAG_NAMES.assetNames, value: JSON.stringify(configuration.assetNames) });
  }

  if (configuration.negativePrompt) {
    tags.push({ name: TAG_NAMES.negativePrompt, value: configuration.negativePrompt });
  }

  if (configuration.description) {
    tags.push({ name: TAG_NAMES.description, value: configuration.description });
  }

  if (configuration.customTags && configuration.customTags?.length > 0) {
    tags.push({ name: TAG_NAMES.userCustomTags, value: JSON.stringify(configuration.customTags) });
  }

  if (configuration.nImages && configuration.nImages > 0) {
    tags.push({ name: TAG_NAMES.nImages, value: configuration.nImages.toString() });
  }

  if (configuration.generateAssets && configuration.generateAssets !== 'none') {
    tags.push({ name: TAG_NAMES.generateAssets, value: configuration.generateAssets });
  }

  if (configuration.generateAssets === 'rareweave' && configuration.rareweaveConfig) {
    tags.push({
      name: TAG_NAMES.rareweaveConfig,
      value: JSON.stringify(configuration.rareweaveConfig),
    });
  }
};

export const handlePayment = async (
  bundlrId: string,
  inferenceFee: string,
  contentType: string,
  script: FairScript,
  conversationId: number,
  modelCreator: string,
  operatorAddrr: string,
  nImages?: number,
  origin = 'node',
) => {
  const parsedUFee = parseFloat(inferenceFee);
  const paymentTags = [
    { name: TAG_NAMES.protocolName, value: PROTOCOL_NAME },
    { name: TAG_NAMES.protocolVersion, value: PROTOCOL_VERSION },
    { name: TAG_NAMES.operationName, value: INFERENCE_PAYMENT },
    { name: TAG_NAMES.scriptName, value: script.name },
    { name: TAG_NAMES.scriptCurator, value: script.owner },
    { name: TAG_NAMES.scriptTransaction, value: script.txid },
    { name: TAG_NAMES.scriptOperator, value: operatorAddrr },
    { name: TAG_NAMES.modelCreator, value: modelCreator },
    { name: TAG_NAMES.conversationIdentifier, value: `${conversationId}` },
    { name: TAG_NAMES.inferenceTransaction, value: bundlrId },
    { name: TAG_NAMES.unixTime, value: (Date.now() / secondInMS).toString() },
    { name: TAG_NAMES.contentType, value: contentType },
  ];

  if (origin === 'node') {
    paymentTags.push({ name: TAG_NAMES.txOrigin, value: TX_ORIGIN_NODE });
  } else {
    paymentTags.push({ name: TAG_NAMES.txOrigin, value: TX_ORIGIN_WEB });
  }

  let adjustedInferenceFee = parsedUFee;
  if (script.isStableDiffusion && nImages && nImages > 0) {
    // calculate fee for n-images
    adjustedInferenceFee = parsedUFee * nImages;
  } else if (script.isStableDiffusion) {
    // default n images is 4 if not specified
    const defaultNImages = 4;
    adjustedInferenceFee = parsedUFee * defaultNImages;
  } else {
    // no need to change inference fee
  }

  const operatorFeeShare = Math.ceil(adjustedInferenceFee * OPERATOR_PERCENTAGE_FEE);
  const marketPlaceFeeShare = Math.ceil(adjustedInferenceFee * MARKETPLACE_PERCENTAGE_FEE);
  const creatorFeeShare = Math.ceil(adjustedInferenceFee * CREATOR_PERCENTAGE_FEE);
  const curatorFeeShare = Math.ceil(adjustedInferenceFee * CURATOR_PERCENTAGE_FEE);

  // pay operator
  const operatorPaymentTx = await sendU(
    operatorAddrr,
    parseInt(operatorFeeShare.toString(), RADIX),
    paymentTags as Tag[],
  );
  // pay curator
  const curatorPaymentTx = await sendU(
    script.owner,
    parseInt(curatorFeeShare.toString(), RADIX),
    paymentTags as Tag[],
  );
  // pay model creator
  const creatorPaymentTx = await sendU(
    modelCreator,
    parseInt(creatorFeeShare.toString(), RADIX),
    paymentTags as Tag[],
  );
  // pay marketplace
  const marketplacePaymentTx = await sendU(
    VAULT_ADDRESS,
    parseInt(marketPlaceFeeShare.toString(), RADIX),
    paymentTags as Tag[],
  );

  logger.info('Payment Successful');

  const nDigits = 4;
  const uCost = adjustedInferenceFee / U_DIVIDER;
  const usdCost = (await getUsdCost(uCost)).toFixed(nDigits);

  return {
    totalUCost: uCost,
    totalUsdCost: usdCost,
    requestId: bundlrId,
    operatorPaymentTx,
    curatorPaymentTx,
    creatorPaymentTx,
    marketplacePaymentTx,
  };
};

export const getUploadTags = (
  script: FairScript,
  operatorAddr: string,
  userAddr: string,
  conversationId: number,
  contentType: string,
  configuration: Configuration,
  origin = 'node',
  fileName?: string,
) => {
  const tags: { name: string; value: string }[] = [];
  tags.push({ name: TAG_NAMES.protocolName, value: PROTOCOL_NAME });
  tags.push({ name: TAG_NAMES.protocolVersion, value: PROTOCOL_VERSION });
  tags.push({ name: TAG_NAMES.scriptName, value: script.name });
  tags.push({ name: TAG_NAMES.scriptCurator, value: script.owner });
  tags.push({ name: TAG_NAMES.scriptTransaction, value: script.txid });
  tags.push({ name: TAG_NAMES.scriptOperator, value: operatorAddr });
  tags.push({ name: TAG_NAMES.operationName, value: SCRIPT_INFERENCE_REQUEST });
  tags.push({ name: TAG_NAMES.conversationIdentifier, value: `${conversationId}` });
  if (fileName) {
    tags.push({ name: TAG_NAMES.fileName, value: fileName });
  }
  const tempDate = Date.now() / secondInMS;
  tags.push({ name: TAG_NAMES.unixTime, value: tempDate.toString() });
  tags.push({ name: TAG_NAMES.contentType, value: contentType });
  if (origin === 'node') {
    tags.push({ name: TAG_NAMES.txOrigin, value: TX_ORIGIN_NODE });
  } else {
    tags.push({ name: TAG_NAMES.txOrigin, value: TX_ORIGIN_WEB });
  }

  addConfigTags(tags, configuration);

  addAtomicAssetTags(tags, userAddr, 'Fair Protocol Prompt Atomic Asset', 'FPPAA');

  tags.push({ name: TAG_NAMES.license, value: UDL_ID });
  tags.push({ name: TAG_NAMES.derivation, value: 'Allowed-With-License-Passthrough' });
  tags.push({ name: TAG_NAMES.commercialUse, value: 'Allowed' });

  return tags;
};
