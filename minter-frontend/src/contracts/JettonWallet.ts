import {
  Address,
  beginCell,
  Cell,
  Contract,
  contractAddress,
  ContractProvider,
  Sender,
  SendMode,
  toNano,
} from '@ton/core';

export type JettonWalletConfig = {
  ownerAddress: Address;
  jettonMasterAddress: Address;
  jettonWalletCode: Cell;
};

export function jettonWalletConfigToCell(config: JettonWalletConfig): Cell {
  return beginCell()
    .storeCoins(0) // balance
    .storeAddress(config.ownerAddress)
    .storeAddress(config.jettonMasterAddress)
    .storeRef(config.jettonWalletCode)
    .endCell();
}

export const WalletOpcodes = {
  transfer: 0xf8a7ea5,
  internalTransfer: 0x178d4519,
  burn: 0x595f07bc,
};

export class JettonWallet implements Contract {
  constructor(
    readonly address: Address,
    readonly init?: { code: Cell; data: Cell }
  ) {}

  static createFromAddress(address: Address) {
    return new JettonWallet(address);
  }

  static createFromConfig(
    config: JettonWalletConfig,
    code: Cell,
    workchain = 0
  ) {
    const data = jettonWalletConfigToCell(config);
    const init = { code, data };
    return new JettonWallet(contractAddress(workchain, init), init);
  }

  async sendTransfer(
    provider: ContractProvider,
    via: Sender,
    opts: {
      toAddress: Address;
      jettonAmount: bigint;
      forwardTonAmount: bigint;
      forwardPayload?: Cell;
      queryId?: number;
    }
  ) {
    await provider.internal(via, {
      value: toNano('0.1'),
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(WalletOpcodes.transfer, 32)
        .storeUint(opts.queryId ?? 0, 64)
        .storeCoins(opts.jettonAmount)
        .storeAddress(opts.toAddress)
        .storeAddress(via.address) // response_destination
        .storeBit(false) // custom_payload
        .storeCoins(opts.forwardTonAmount)
        .storeMaybeRef(opts.forwardPayload)
        .endCell(),
    });
  }

  async sendBurn(
    provider: ContractProvider,
    via: Sender,
    opts: {
      jettonAmount: bigint;
      responseAddress?: Address;
      queryId?: number;
    }
  ) {
    await provider.internal(via, {
      value: toNano('0.05'),
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(WalletOpcodes.burn, 32)
        .storeUint(opts.queryId ?? 0, 64)
        .storeCoins(opts.jettonAmount)
        .storeAddress(opts.responseAddress ?? via.address)
        .storeBit(false) // custom_payload
        .endCell(),
    });
  }

  async getWalletData(provider: ContractProvider) {
    const result = await provider.get('get_wallet_data', []);
    const balance = result.stack.readBigNumber();
    const ownerAddress = result.stack.readAddress();
    const jettonMasterAddress = result.stack.readAddress();
    const jettonWalletCode = result.stack.readCell();

    return {
      balance,
      ownerAddress,
      jettonMasterAddress,
      jettonWalletCode,
    };
  }

  async getBalance(provider: ContractProvider): Promise<bigint> {
    const result = await provider.get('get_wallet_data', []);
    return result.stack.readBigNumber();
  }
}
