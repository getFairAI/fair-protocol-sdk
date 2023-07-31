export interface ITag {
  name: string;
  value: string;
}

export interface ITagFilter {
  name: string;
  values: string[];
}

export interface IData {
  size: number;
  type: string | null;
}

export interface IFee {
  ar: string;
  winston: string;
}

export interface IOwner {
  address: string;
  key: string;
}

export interface IQuantity {
  ar: string;
  winston: string;
}

export interface IBlock {
  height: number;
  id: string;
  previous: string;
  timestamp: number;
}

export interface INode {
  id: string;
  tags: ITag[];
  anchor?: string;
  data: IData;
  fee: IFee;
  owner: IOwner;
  quantity: IQuantity;
  recipient: string;
  signature: string;
  block: IBlock;
}

export interface IEdge {
  node: INode;
  cursor?: string;
}

export interface ITransactions {
  edges: IEdge[];
  pageInfo: {
    hasNextPage: boolean;
  };
}

export interface IQueryResult {
  transactions: ITransactions;
}

export interface IContractEdge {
  cursor: string;
  node: {
    id: string;
    tags: ITag[];
    owner: IOwner;
  };
}

export interface IContractTransactions {
  edges: IContractEdge[];
  pageInfo: {
    hasNextPage: boolean;
  };
}

export interface IContractQueryResult {
  transactions: IContractTransactions;
}

export interface UState {
  state: {
    name: string;
    ticker: string;
    settings: Array<Array<string>>;
    balances: { [address: string]: string };
    claimable: Array<{ txid: string; to: string }>;
    divisibility: number;
  };
}
