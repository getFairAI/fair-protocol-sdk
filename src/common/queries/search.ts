import { FairModel } from '../classes/model';
import { FairScript } from '../classes/script';
import { FairOperator } from '../classes/operator';
import { IContractEdge, ITagFilter } from '../types/arweave';
import { findTag } from '../utils/common';
import {
  MARKETPLACE_FEE,
  MODEL_CREATION_PAYMENT,
  OPERATOR_REGISTRATION_AR_FEE,
  PROTOCOL_NAME,
  PROTOCOL_VERSION,
  REGISTER_OPERATION,
  SCRIPT_CREATION_FEE,
  SCRIPT_CREATION_PAYMENT,
  TAG_NAMES,
  U_CONTRACT_ID,
  U_DIVIDER,
  VAULT_ADDRESS,
} from '../utils/constants';
import { findByTags, modelsFilter, operatorsFilter, scriptsFilter } from '../utils/queries';

type entitiesFilter = 'model' | 'operator' | 'script';
type categoryFilter = 'image' | 'text' | 'video' | 'audio' | 'other';

type searchFilters = {
  typeFilter?: entitiesFilter[];
  modelCategory: categoryFilter[];
  owners?: string[];
  tags?: ITagFilter[];
};

const validatePaymentValues = (tx: IContractEdge, operationName: string) => {
  try {
    const input = findTag(tx, 'input');
    const { target, qty, function: fn } = JSON.parse(input as string);
    if (target !== VAULT_ADDRESS) {
      throw new Error(`Invalid payment target for ${operationName}`);
    }
    if (fn !== 'transfer') {
      throw new Error(`Invalid payment function for ${operationName}`);
    }

    const payment = parseFloat(qty);
    if (isNaN(payment)) {
      throw new Error(`Invalid payment values for ${operationName}`);
    }
    let expectedPayment;
    if (operationName === MODEL_CREATION_PAYMENT) {
      expectedPayment = parseFloat(MARKETPLACE_FEE) * U_DIVIDER;
    } else if (operationName === SCRIPT_CREATION_PAYMENT) {
      expectedPayment = parseFloat(SCRIPT_CREATION_FEE) * U_DIVIDER;
    } else if (operationName === REGISTER_OPERATION) {
      expectedPayment = parseFloat(OPERATOR_REGISTRATION_AR_FEE) * U_DIVIDER;
    } else {
      throw new Error(`Invalid payment values for ${operationName}`);
    }

    if (payment !== expectedPayment) {
      throw new Error(`Invalid payment values for ${operationName}`);
    }

    return true;
  } catch (error) {
    return false;
  }
};

export const search = async (params?: searchFilters) => {
  const tags = params?.tags ? params.tags : [];

  // do not allow to overwrite protocol version and name and contract tags
  const protocolVersionIdx = tags.findIndex((tag) => tag.name === TAG_NAMES.protocolVersion);
  const protocolNameIdx = tags.findIndex((tag) => tag.name === TAG_NAMES.protocolName);
  const contractIdx = tags.findIndex((tag) => tag.name === TAG_NAMES.contract);

  if (protocolVersionIdx >= 0) {
    tags.splice(protocolVersionIdx, 1, {
      name: TAG_NAMES.protocolVersion,
      values: [PROTOCOL_VERSION],
    });
  } else {
    tags.push({ name: TAG_NAMES.protocolVersion, values: [PROTOCOL_VERSION] });
  }

  if (protocolNameIdx >= 0) {
    tags.splice(protocolNameIdx, 1, { name: TAG_NAMES.protocolName, values: [PROTOCOL_NAME] });
  } else {
    tags.push({ name: TAG_NAMES.protocolName, values: [PROTOCOL_NAME] });
  }

  if (contractIdx >= 0) {
    tags.splice(contractIdx, 1, { name: TAG_NAMES.contract, values: [U_CONTRACT_ID] });
  } else {
    tags.push({ name: TAG_NAMES.contract, values: [U_CONTRACT_ID] });
  }
  // --

  // initialize tags
  if (params?.typeFilter && params.typeFilter.length > 0) {
    const operationNames = [];
    for (const type of params.typeFilter) {
      switch (type) {
        case 'model':
          operationNames.push(MODEL_CREATION_PAYMENT);
          break;
        case 'operator':
          operationNames.push(REGISTER_OPERATION);
          break;
        case 'script':
          operationNames.push(SCRIPT_CREATION_PAYMENT);
          break;
        default:
          break;
      }
    }
    const operationNameIdx = tags.findIndex((tag) => tag.name === TAG_NAMES.operationName);

    // replace operation name tag if exists; otherwise push
    if (operationNameIdx >= 0) {
      tags.splice(operationNameIdx, 1, { name: TAG_NAMES.operationName, values: operationNames });
    } else {
      tags.push({ name: TAG_NAMES.operationName, values: operationNames });
    }
  } else {
    tags.push({
      name: TAG_NAMES.operationName,
      values: [MODEL_CREATION_PAYMENT, REGISTER_OPERATION, SCRIPT_CREATION_PAYMENT],
    });
  }

  if (params?.owners && params.owners.length > 0) {
    const ownerIdx = tags.findIndex((tag) => tag.name === TAG_NAMES.sequencerOwner);

    if (ownerIdx >= 0) {
      tags.splice(ownerIdx, 1, { name: TAG_NAMES.sequencerOwner, values: params.owners });
    } else {
      tags.push({ name: TAG_NAMES.sequencerOwner, values: params.owners });
    }
  }
  const hasNextPage = false;
  let lastPaginationCursor;
  const results = [];
  const resultsPerPage = 200;

  do {
    const data = await findByTags(tags, resultsPerPage, lastPaginationCursor);

    results.push(...data.transactions.edges);
  } while (hasNextPage);

  const groupedArray = results.reduce(
    (acc: { [key: string]: IContractEdge[] }, curr: IContractEdge) => {
      const operationName = findTag(curr, 'operationName');
      // group by operation name
      // check payments
      if (operationName && validatePaymentValues(curr, operationName)) {
        if (acc[operationName]) {
          acc[operationName].push(curr);
        } else {
          acc[operationName] = [curr];
        }
      }
      return acc;
    },
    {},
  );

  if (params?.modelCategory && params.modelCategory.length > 0) {
    const filteredModels = (await modelsFilter(groupedArray[MODEL_CREATION_PAYMENT]))
      .filter((el) => {
        const category = findTag(el, 'modelCategory');
        return params.modelCategory.includes(category as categoryFilter);
      })
      .map((modelTx) => new FairModel(modelTx));

    const filteredScripts = (await scriptsFilter(groupedArray[SCRIPT_CREATION_PAYMENT]))
      .filter((el) => {
        const modelTx = findTag(el, 'modelTransaction');
        return filteredModels.some((model) => model.txid === modelTx);
      })
      .map((scriptTx) => new FairScript(scriptTx));

    const filteredOperators = (await operatorsFilter(groupedArray[REGISTER_OPERATION]))
      .filter((el) => {
        const scriptTx = findTag(el, 'scriptTransaction');
        return filteredScripts.some((script) => script.txid === scriptTx);
      })
      .map((operatorTx) => new FairOperator(operatorTx));

    return {
      models: filteredModels,
      scripts: filteredScripts,
      operators: filteredOperators,
    };
  }

  const models = (await modelsFilter(groupedArray[MODEL_CREATION_PAYMENT])).map(
    (modelTx) => new FairModel(modelTx),
  );

  const filteredScripts = await scriptsFilter(groupedArray[SCRIPT_CREATION_PAYMENT]);

  const scripts = filteredScripts.map((scriptTx) => new FairScript(scriptTx));

  const filteredOperators = await operatorsFilter(groupedArray[REGISTER_OPERATION]);

  const operators = filteredOperators.map((operatorTx) => new FairOperator(operatorTx));

  return {
    models,
    scripts,
    operators,
  };
};
