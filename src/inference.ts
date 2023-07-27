import NodeBundlr from '@bundlr-network/client/build/cjs/node/bundlr';
import {
  APP_NAME,
  APP_VERSION,
  CONVERSATION_START,
  CREATOR_PERCENTAGE_FEE,
  CURATOR_PERCENTAGE_FEE,
  DEFAULT_TAGS,
  INFERENCE_PAYMENT,
  MARKETPLACE_PERCENTAGE_FEE,
  OPERATOR_PERCENTAGE_FEE,
  SCRIPT_INFERENCE_REQUEST,
  TAG_NAMES,
  VAULT_ADDRESS,
  secondInMS,
} from './constants';
import { IQueryResult, ITag } from './interface';
import { FairModel } from './model';
import { FairOperator } from './operator';
import { QUERY_TX_WITH_OWNERS } from './queries';
import { FairScript } from './script';
import { client, findTag, logger, sendU } from './utils';
import { Tag } from 'warp-contracts';

const handlePayment = async (
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
    parseInt(operatorFeeShare.toString(), 10),
    paymentTags as Tag[],
  );
  // pay curator
  const curatorPaymentTx = await sendU(
    script.owner,
    parseInt(curatorFeeShare.toString(), 10),
    paymentTags as Tag[],
  );
  // pay model creator
  const creatorPaymentTx = await sendU(
    modelCreator,
    parseInt(creatorFeeShare.toString(), 10),
    paymentTags as Tag[],
  );
  // pay marketplace
  const marketplacePaymentTx = await sendU(
    VAULT_ADDRESS,
    parseInt(marketPlaceFeeShare.toString(), 10),
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

const getUploadTags = (script: FairScript, operatorAddr: string, conversationId: number) => {
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

const getLastConversationId = async (userAddr: string, script: FairScript) => {
  const data: IQueryResult = await client.request(QUERY_TX_WITH_OWNERS, {
    owners: userAddr,
    first: 1,
    tags: [
      ...DEFAULT_TAGS,
      {
        name: TAG_NAMES.operationName,
        values: [CONVERSATION_START],
      },
      {
        name: TAG_NAMES.scriptTransaction,
        values: [script.txid],
      },
      { name: TAG_NAMES.scriptName, values: [script.name] },
      { name: TAG_NAMES.scriptCurator, values: [script.owner] },
    ],
  });

  if (data && data.transactions && data.transactions.edges && data.transactions.edges.length > 0) {
    const tx = data.transactions.edges[0];
    const conversationId = findTag(tx, 'conversationIdentifier');
    if (conversationId) {
      return parseInt(conversationId, 10);
    } else {
      return 1;
    }
  } else {
    return 1;
  }
};

const inference = async (
  model: FairModel,
  script: FairScript,
  operator: FairOperator,
  prompt: string,
  userAddr: string,
  bundlr: NodeBundlr,
) => {
  const conversationId = await getLastConversationId(userAddr, script);
  const tags = getUploadTags(script, operator.owner, conversationId);
  try {
    const { id: txid } = await bundlr.upload(prompt, { tags });
    if (!txid) {
      throw new Error('No txid returned from bundlr');
    }
    logger.debug(`Inference txid: ${txid}`);

    return handlePayment(
      txid,
      operator.fee,
      'text/plain',
      script,
      conversationId,
      model.owner,
      operator.owner,
    );
  } catch (error) {
    throw new Error(JSON.stringify(error));
  }
};

export { inference };
