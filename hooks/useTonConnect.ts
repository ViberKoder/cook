import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { Address, Cell, beginCell, toNano } from '@ton/core';
import { useCallback } from 'react';

export interface SendTransactionParams {
  to: string;
  value: string;
  stateInit?: string;
  body?: string;
}

export interface TransactionMessage {
  address: string;
  amount: string;
  stateInit?: string;
  payload?: string;
}

export function useTonConnect() {
  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();

  const connected = !!wallet?.account?.address;

  const sendTransaction = useCallback(
    async (params: SendTransactionParams) => {
      if (!connected) {
        throw new Error('Wallet not connected');
      }

      const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 600, // 10 minutes
        messages: [
          {
            address: params.to,
            amount: params.value,
            stateInit: params.stateInit,
            payload: params.body,
          },
        ],
      };

      const result = await tonConnectUI.sendTransaction(transaction);
      return result;
    },
    [connected, tonConnectUI]
  );

  // New method to send multiple messages in one transaction
  const sendMultipleMessages = useCallback(
    async (messages: TransactionMessage[]) => {
      if (!connected) {
        throw new Error('Wallet not connected');
      }

      const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 600, // 10 minutes
        messages: messages.map(msg => ({
          address: msg.address,
          amount: msg.amount,
          stateInit: msg.stateInit,
          payload: msg.payload,
        })),
      };

      const result = await tonConnectUI.sendTransaction(transaction);
      return result;
    },
    [connected, tonConnectUI]
  );

  const getWalletAddress = useCallback(() => {
    if (!wallet?.account?.address) {
      return null;
    }
    return Address.parse(wallet.account.address);
  }, [wallet]);

  return {
    connected,
    wallet: wallet?.account?.address ? Address.parse(wallet.account.address) : null,
    walletRaw: wallet,
    sendTransaction,
    sendMultipleMessages,
    getWalletAddress,
    tonConnectUI,
  };
}
