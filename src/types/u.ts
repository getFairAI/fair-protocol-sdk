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
