export const VAULT_ADDRESS = 'tXd-BOaxmxtgswzwMLnryROAYlX5uDC9-XK2P4VNCQQ';
export const MARKETPLACE_ADDRESS = 'RQFarhgXPXYkgRM0Lzv088MllseKQWEdnEiRUggteIo';

export const U_CONTRACT_ID = 'KTzTXT_ANmF84fWEKHzWURD1LWd9QaFR9yfYUwH2Lxw';
export const U_DIVIDER = 1e6;
export const VOUCH_CONTRACT_ID = '_z0ch80z_daDUFqC9jHjfOL8nekJcok4ZRkE_UesYsk';
export const U_LOGO_SRC = 'https://arweave.net/J3WXX4OGa6wP5E9oLhNyqlN4deYI7ARjrd5se740ftE';

export const APP_NAME = 'Fair Protocol';
export const PREVIOUS_VERSIONS = ['0.1'];
export const APP_VERSION = '0.3';

export const MARKETPLACE_FEE = '0.5'; // u
export const SCRIPT_CREATION_FEE = '0.5'; // u
export const OPERATOR_REGISTRATION_AR_FEE = '0.05'; // u

export const OPERATOR_PERCENTAGE_FEE = 0.8;
export const MARKETPLACE_PERCENTAGE_FEE = 0.15;
export const CURATOR_PERCENTAGE_FEE = 0.025;
export const CREATOR_PERCENTAGE_FEE = 0.025;

// Choose the latest script and operator
export const IS_TO_CHOOSE_MODEL_AUTOMATICALLY = true;

export const TAG_NAMES = {
  appName: 'App-Name',
  appVersion: 'App-Version',
  contentType: 'Content-Type',
  unixTime: 'Unix-Time',
  modelName: 'Model-Name',
  modelCreator: 'Model-Creator',
  modelOperator: 'Model-Operator',
  modelTransaction: 'Model-Transaction',
  modelUser: 'Model-User',
  operationName: 'Operation-Name',
  notes: 'Notes',
  category: 'Category',
  avatarUrl: 'AvatarUrl',
  description: 'Description',
  operatorName: 'Operator-Name',
  operatorFee: 'Operator-Fee',
  conversationIdentifier: 'Conversation-Identifier',
  inferenceTransaction: 'Inference-Transaction',
  requestTransaction: 'Request-Transaction',
  responseTransaction: 'Response-Transaction',
  attachmentName: 'Attachment-Name',
  attachmentRole: 'Attachment-Role',
  saveTransaction: 'Save-Transaction',
  paymentQuantity: 'Payment-Quantity',
  paymentTarget: 'Payment-Target',
  scriptTransaction: 'Script-Transaction',
  scriptName: 'Script-Name',
  scriptCurator: 'Script-Curator',
  scriptOperator: 'Script-Operator',
  scriptUser: 'Script-User',
  voteFor: 'Vote-For',
  votedTransaction: 'Voted-Transaction',
  fileName: 'File-Name',
  allowFiles: 'Allow-Files',
  allowText: 'Allow-Text',
  registrationTransaction: 'Registration-Transaction',
  registrationFee: 'Registration-Fee',
  input: 'Input',
  contract: 'Contract',
  sequencerOwner: 'Sequencer-Owner',
  updateFor: 'Update-For',
  previousVersions: 'Previous-Versions',
};

// Operation Names
export const MODEL_CREATION = 'Model Creation';

export const MODEL_DELETION = 'Model Deletion';

export const SCRIPT_CREATION = 'Script Creation';

export const SCRIPT_DELETION = 'Script Deletion';

export const SCRIPT_CREATION_PAYMENT = 'Script Creation Payment';

export const MODEL_ATTACHMENT = 'Model Attachment';

export const MODEL_CREATION_PAYMENT = 'Model Creation Payment';

export const REGISTER_OPERATION = 'Operator Registration';

export const SAVE_REGISTER_OPERATION = 'Operator Registration Save';

export const CANCEL_OPERATION = 'Operator Cancellation';

export const MODEL_FEE_UPDATE = 'Model Fee Update';

export const MODEL_FEE_PAYMENT = 'Model Fee Payment';

export const MODEL_FEE_PAYMENT_SAVE = 'Model Fee Payment Save';

export const SCRIPT_INFERENCE_REQUEST = 'Script Inference Request';

export const INFERENCE_PAYMENT = 'Inference Payment';

export const SCRIPT_INFERENCE_RESPONSE = 'Script Inference Response';

export const INFERENCE_PAYMENT_DISTRIBUTION = 'Fee Redistribution';

export const CONVERSATION_START = 'Conversation Start';

export const SCRIPT_FEE_PAYMENT = 'Script Fee Payment';

export const SCRIPT_FEE_PAYMENT_SAVE = 'Script Fee Payment Save';

export const UP_VOTE = 'Up Vote';

export const DOWN_VOTE = 'Down Vote';

export const VOTE_FOR_MODEL = 'Vote For Model';

export const VOTE_FOR_SCRIPT = 'Vote For Script';

export const VOTE_FOR_OPERATOR = 'Vote For Operator';

// Attachment Roles
export const AVATAR_ATTACHMENT = 'avatar';

export const NOTES_ATTACHMENT = 'notes';

// misc
export const DEV_BUNDLR_URL = 'https://devnet.bundlr.network/';
export const NODE1_BUNDLR_URL = 'https://node1.bundlr.network';
export const NODE2_BUNDLR_URL = 'https://node2.bundlr.network/';

export const DEV_ARWEAVE_URL = 'https://arweave.dev';
export const NET_ARWEAVE_URL = 'https://arweave.net';

export const N_PREVIOUS_BLOCKS = 7;
export const MIN_CONFIRMATIONS = 7;

export const DEFAULT_TAGS = [
  { name: TAG_NAMES.appName, values: [APP_NAME] },
  { name: TAG_NAMES.appVersion, values: [APP_VERSION] },
];

// add smartWeaveContract tags so atomic tokens can be picked up
export const DEFAULT_TAGS_FOR_TOKENS = [
  { name: TAG_NAMES.appName, values: [APP_NAME, 'SmartWeaveContract'] },
  { name: TAG_NAMES.appVersion, values: [APP_VERSION, '0.3.0'] },
];

// export default tags with support for old version txs
export const DEFAULT_TAGS_RETRO = [
  { name: TAG_NAMES.appName, values: [APP_NAME] },
  { name: TAG_NAMES.appVersion, values: [...PREVIOUS_VERSIONS, APP_VERSION] },
];

export const GITHUB_LINK = 'https://github.com/FAIR-Protocol/decentralized-inference';
export const DISCORD_LINK = 'https://discord.gg/GRf7CukfXf';
export const WHITEPAPER_LINK =
  'https://lqcpjipmt2d2daazjknargowboxuhn3wgealzbqdsjmwxbgli52q.arweave.net/XAT0oeyeh6GAGUqaCJnWC69Dt3YxALyGA5JZa4TLR3U';
export const TWITTER_LINK = 'https://twitter.com/fairAIprotocol';
export const STUDIO_LINK = 'https://fairstudio.arweave.dev/';

export const operatorHeaders = [
  'Address',
  'Name',
  'Registration',
  'Fee ($U)',
  'Status',
  'Stamps',
  'Selected',
];

export const scriptHeaders = ['Creator', 'Name', 'Registration', 'Stamps', 'Selected'];

export const secondInMS = 1000;
export const defaultDecimalPlaces = 4;
export const successStatusCode = 200;
export const textContentType = 'text/plain';

export const modelPaymentInputStr = JSON.stringify({
  function: 'transfer',
  target: VAULT_ADDRESS,
  qty: (parseFloat(MARKETPLACE_FEE) * U_DIVIDER).toString(),
});

export const modelPaymentInputNumber = JSON.stringify({
  function: 'transfer',
  target: VAULT_ADDRESS,
  qty: parseFloat(MARKETPLACE_FEE) * U_DIVIDER,
});

export const scriptPaymentInputStr = JSON.stringify({
  function: 'transfer',
  target: VAULT_ADDRESS,
  qty: (parseFloat(SCRIPT_CREATION_FEE) * U_DIVIDER).toString(),
});

export const scriptPaymentInputNumber = JSON.stringify({
  function: 'transfer',
  target: VAULT_ADDRESS,
  qty: parseFloat(SCRIPT_CREATION_FEE) * U_DIVIDER,
});

export const operatorPaymentInputStr = JSON.stringify({
  function: 'transfer',
  target: VAULT_ADDRESS,
  qty: (parseFloat(OPERATOR_REGISTRATION_AR_FEE) * U_DIVIDER).toString(),
});

export const operatorPaymentInputNumber = JSON.stringify({
  function: 'transfer',
  target: VAULT_ADDRESS,
  qty: parseFloat(OPERATOR_REGISTRATION_AR_FEE) * U_DIVIDER,
});

export const MODEL_CREATION_PAYMENT_TAGS = [
  { name: TAG_NAMES.operationName, values: [MODEL_CREATION_PAYMENT] },
  { name: TAG_NAMES.contract, values: [U_CONTRACT_ID] },
  { name: TAG_NAMES.input, values: [modelPaymentInputStr, modelPaymentInputNumber] },
];

export const SCRIPT_CREATION_PAYMENT_TAGS = [
  { name: TAG_NAMES.operationName, values: [SCRIPT_CREATION_PAYMENT] },
  { name: TAG_NAMES.contract, values: [U_CONTRACT_ID] },
  { name: TAG_NAMES.input, values: [scriptPaymentInputStr, scriptPaymentInputNumber] },
];

export const OPERATOR_REGISTRATION_PAYMENT_TAGS = [
  { name: TAG_NAMES.operationName, values: [REGISTER_OPERATION] },
  { name: TAG_NAMES.contract, values: [U_CONTRACT_ID] },
  { name: TAG_NAMES.input, values: [operatorPaymentInputStr, operatorPaymentInputNumber] },
];

const kb = 1024;
const maxKb = 100;

export const MAX_MESSAGE_SIZE = kb * maxKb;