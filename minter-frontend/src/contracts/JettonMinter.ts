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
  TupleItemSlice,
} from '@ton/core';

export type JettonMinterConfig = {
  admin: Address;
  content: Cell;
  walletCode: Cell;
};

export function jettonMinterConfigToCell(config: JettonMinterConfig): Cell {
  return beginCell()
    .storeCoins(0) // total_supply
    .storeAddress(config.admin)
    .storeRef(config.content)
    .storeRef(config.walletCode)
    .endCell();
}

export const Opcodes = {
  mint: 21,
  changeAdmin: 3,
  changeContent: 4,
  internalTransfer: 0x178d4519,
  transfer: 0xf8a7ea5,
  burn: 0x595f07bc,
  burnNotification: 0x7bdd97de,
};

export class JettonMinter implements Contract {
  constructor(
    readonly address: Address,
    readonly init?: { code: Cell; data: Cell }
  ) {}

  static createFromAddress(address: Address) {
    return new JettonMinter(address);
  }

  static createFromConfig(
    config: JettonMinterConfig,
    code: Cell,
    workchain = 0
  ) {
    const data = jettonMinterConfigToCell(config);
    const init = { code, data };
    return new JettonMinter(contractAddress(workchain, init), init);
  }

  async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
    await provider.internal(via, {
      value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell().endCell(),
    });
  }

  async sendMint(
    provider: ContractProvider,
    via: Sender,
    opts: {
      toAddress: Address;
      jettonAmount: bigint;
      forwardTonAmount: bigint;
      totalTonAmount: bigint;
      queryId?: number;
    }
  ) {
    await provider.internal(via, {
      value: opts.totalTonAmount,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(Opcodes.mint, 32)
        .storeUint(opts.queryId ?? 0, 64)
        .storeAddress(opts.toAddress)
        .storeCoins(opts.forwardTonAmount)
        .storeRef(
          beginCell()
            .storeUint(Opcodes.internalTransfer, 32)
            .storeUint(0, 64)
            .storeCoins(opts.jettonAmount)
            .storeAddress(null)
            .storeAddress(via.address)
            .storeCoins(0)
            .storeBit(false)
            .endCell()
        )
        .endCell(),
    });
  }

  async sendChangeAdmin(
    provider: ContractProvider,
    via: Sender,
    newAdmin: Address
  ) {
    await provider.internal(via, {
      value: toNano('0.05'),
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(Opcodes.changeAdmin, 32)
        .storeUint(0, 64)
        .storeAddress(newAdmin)
        .endCell(),
    });
  }

  async sendChangeContent(
    provider: ContractProvider,
    via: Sender,
    content: Cell
  ) {
    await provider.internal(via, {
      value: toNano('0.05'),
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(Opcodes.changeContent, 32)
        .storeUint(0, 64)
        .storeRef(content)
        .endCell(),
    });
  }

  async getJettonData(provider: ContractProvider) {
    const result = await provider.get('get_jetton_data', []);
    const totalSupply = result.stack.readBigNumber();
    const mintable = result.stack.readBoolean();
    const adminAddress = result.stack.readAddress();
    const content = result.stack.readCell();
    const walletCode = result.stack.readCell();

    return {
      totalSupply,
      mintable,
      adminAddress,
      content,
      walletCode,
    };
  }

  async getWalletAddress(
    provider: ContractProvider,
    ownerAddress: Address
  ): Promise<Address> {
    const result = await provider.get('get_wallet_address', [
      { type: 'slice', cell: beginCell().storeAddress(ownerAddress).endCell() } as TupleItemSlice,
    ]);
    return result.stack.readAddress();
  }

  async getTotalSupply(provider: ContractProvider): Promise<bigint> {
    const result = await provider.get('get_jetton_data', []);
    return result.stack.readBigNumber();
  }
}
