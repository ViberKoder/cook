// Top Up Cocoon Client Contract Balance
// Based on Cocoon contracts documentation

import { Address, Cell, beginCell, toNano } from '@ton/core';
import { SendTransactionParams } from '@/hooks/useTonConnect';
import { CocoonClient } from './cocoonWrappers';
import { getTonClient } from './cocoon';

// Top up client contract balance
// Operation code: 0x7362d09c (ext_top_up)
export async function topUpCocoonClient(
  clientAddress: Address,
  amount: bigint,
  sendTransaction: (params: SendTransactionParams) => Promise<any>,
  returnAddress?: Address
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getTonClient();
    
    // Check if client contract exists
    const account = await client.getContractState(clientAddress);
    if (account.state.type !== 'active') {
      return { success: false, error: 'Client contract does not exist' };
    }

    // Build top-up message
    // op::ext_top_up = 0x7362d09c
    // query_id:uint64
    // excess_return_address:MsgAddress
    const queryId = BigInt(Date.now());
    const excessReturnAddress = returnAddress || clientAddress;

    const topUpMessage = beginCell()
      .storeUint(0x7362d09c, 32) // op code
      .storeUint(queryId, 64) // query_id
      .storeAddress(excessReturnAddress) // excess_return_address
      .endCell();

    // Send transaction
    await sendTransaction({
      messages: [{
        address: clientAddress.toString(),
        amount: amount.toString(),
        payload: topUpMessage.toBoc().toString('base64'),
      }],
      validUntil: Math.floor(Date.now() / 1000) + 60,
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error topping up client:', error);
    return {
      success: false,
      error: error.message || 'Failed to top up client contract',
    };
  }
}

// Get client balance
export async function getCocoonClientBalance(clientAddress: Address): Promise<bigint> {
  try {
    const client = getTonClient();
    const cocoonClient = CocoonClient.createFromAddress(clientAddress);
    const clientContract = client.open(cocoonClient);
    
    const state = await clientContract.getData(client);
    return state?.balance || 0n;
  } catch (error) {
    console.error('Error getting client balance:', error);
    return 0n;
  }
}

