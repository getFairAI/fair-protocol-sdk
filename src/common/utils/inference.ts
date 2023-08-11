import { Tag } from 'warp-contracts';
import { FairScript } from '../classes/script';
import { ITag } from '../types/arweave';
import { logger } from './common';
import {
  TAG_NAMES,
  APP_NAME,
  APP_VERSION,
  INFERENCE_PAYMENT,
  secondInMS,
  OPERATOR_PERCENTAGE_FEE,
  MARKETPLACE_PERCENTAGE_FEE,
  CREATOR_PERCENTAGE_FEE,
  CURATOR_PERCENTAGE_FEE,
  VAULT_ADDRESS,
  SCRIPT_INFERENCE_REQUEST,
} from './constants';
import { sendU } from './warp';

const RADIX = 10;

export const handlePayment = async (
  bundlrId: string,
  inferenceFee: string,
  contentType: string,
  script: FairScript,
  conversationId: number,
  modelCreator: string,
  operatorAddrr: string,
) => {
  const parsedUFee = parseFloat(inferenceFee);
  const paymentTags = [
    { name: TAG_NAMES.appName, value: APP_NAME },
    { name: TAG_NAMES.appVersion, value: APP_VERSION },
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

  const operatorFeeShare = parsedUFee * OPERATOR_PERCENTAGE_FEE;
  const marketPlaceFeeShare = parsedUFee * MARKETPLACE_PERCENTAGE_FEE;
  const creatorFeeShare = parsedUFee * CREATOR_PERCENTAGE_FEE;
  const curatorFeeShare = parsedUFee * CURATOR_PERCENTAGE_FEE;

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

  return {
    operatorPaymentTx,
    curatorPaymentTx,
    creatorPaymentTx,
    marketplacePaymentTx,
  };
};

export const getUploadTags = (script: FairScript, operatorAddr: string, conversationId: number) => {
  const tags: ITag[] = [];
  tags.push({ name: TAG_NAMES.appName, value: APP_NAME });
  tags.push({ name: TAG_NAMES.appVersion, value: APP_VERSION });
  tags.push({ name: TAG_NAMES.scriptName, value: script.name });
  tags.push({ name: TAG_NAMES.scriptCurator, value: script.owner });
  tags.push({ name: TAG_NAMES.scriptTransaction, value: script.txid });
  tags.push({ name: TAG_NAMES.scriptOperator, value: operatorAddr });
  tags.push({ name: TAG_NAMES.operationName, value: SCRIPT_INFERENCE_REQUEST });
  tags.push({ name: TAG_NAMES.conversationIdentifier, value: `${conversationId}` });
  const tempDate = Date.now() / secondInMS;
  tags.push({ name: TAG_NAMES.unixTime, value: tempDate.toString() });
  tags.push({ name: TAG_NAMES.contentType, value: 'text/plain' });

  return tags;
};
