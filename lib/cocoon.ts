import { TonClient, Address, toNano, beginCell, contractAddress, Cell } from '@ton/ton';
import { KeyPair, sign } from '@ton/crypto';
import { COCOON_ROOT_ADDRESS, TON_CENTER_ENDPOINT, TON_CENTER_API_KEY } from './cocoonConfig';
import { getCocoonRoot, CocoonRoot, CocoonClient, CocoonRootParams, CocoonProxyInfo, CocoonClientState } from './cocoonWrappers';

// Initialize TON client
export function getTonClient(): TonClient {
  return new TonClient({
    endpoint: TON_CENTER_ENDPOINT,
    apiKey: TON_CENTER_API_KEY || undefined,
  });
}

// Parse address helper
export function parseAddr(addr: string): Address {
  return Address.parse(addr);
}

// Format nanoTON to TON
export function formatTON(nano: bigint): string {
  return (Number(nano) / 1e9).toFixed(4) + ' TON';
}

// Get all parameters from Root contract
export async function getAllParams(): Promise<CocoonRootParams | null> {
  try {
    const client = getTonClient();
    const root = getCocoonRoot();
    const params = await root.getAllParams(client);
    
    if (!params) {
      console.error('getAllParams returned null');
      // Try to get basic info to debug
      try {
        const account = await client.getContractState(root.address);
        console.log('Root contract state:', account.state);
        console.log('Root contract balance:', account.balance);
      } catch (debugError) {
        console.error('Debug error:', debugError);
      }
    }
    
    return params;
  } catch (error) {
    console.error('Error getting Cocoon params:', error);
    return null;
  }
}

// Get last proxy seqno
export async function getLastProxySeqno(): Promise<number> {
  try {
    const client = getTonClient();
    const rootAddr = parseAddr(COCOON_ROOT_ADDRESS);
    
    const result = await client.runMethod(rootAddr, 'last_proxy_seqno');
    
    if (!result.stack) {
      return 0;
    }

    try {
      return Number(result.stack.readBigNumber());
    } catch {
      return 0;
    }
  } catch (error) {
    console.error('Error getting last proxy seqno:', error);
    return 0;
  }
}

// Get proxy info
export async function getProxyInfo(seqno: number): Promise<CocoonProxyInfo | null> {
  try {
    const client = getTonClient();
    const rootAddr = parseAddr(COCOON_ROOT_ADDRESS);
    
    const result = await client.runMethod(rootAddr, 'get_proxy_info', [{ type: 'int', value: BigInt(seqno) }]);
    
    if (!result.stack) {
      return null;
    }

    const stack = result.stack;
    // Parse proxy info from stack
    // This is a simplified version - actual implementation depends on contract structure
    return {
      endpoint: '', // Extract from stack
      pubkey: Buffer.alloc(32), // Extract from stack
      state: 0,
      balance: 0n,
      stake: 0n,
    };
  } catch (error) {
    console.error('Error getting proxy info:', error);
    return null;
  }
}

// Check if hash is valid (worker/proxy/model)
export async function checkHashIsValid(
  hashType: 'worker' | 'proxy' | 'model',
  hash: Buffer
): Promise<boolean> {
  try {
    const client = getTonClient();
    const rootAddr = parseAddr(COCOON_ROOT_ADDRESS);
    
    const methodName = `${hashType}_hash_is_valid`;
    const result = await client.runMethod(rootAddr, methodName, [
      { type: 'slice', cell: beginCell().storeBuffer(hash).endCell() }
    ]);
    
    if (!result.stack) return false;
    try {
      return result.stack.readBoolean();
    } catch {
      return false;
    }
  } catch (error) {
    console.error(`Error checking ${hashType} hash:`, error);
    return false;
  }
}

// Calculate client contract address
export function calculateClientAddress(
  clientCode: Buffer,
  proxyAddress: Address,
  proxyPublicKey: Buffer,
  ownerAddress: Address,
  paramsCell: Buffer,
  minClientStake: bigint
): Address {
  // This is a simplified version
  // Actual implementation should use the same logic as CocoonClient.calculateAddress()
  // For now, return a placeholder - in production, use proper contract address calculation
  try {
    const codeCell = beginCell().storeBuffer(clientCode).endCell();
    const dataCell = beginCell()
      .storeAddress(ownerAddress)
      .storeAddress(proxyAddress)
      .storeBuffer(proxyPublicKey)
      .storeUint(0, 2) // state
      .storeCoins(0) // balance
      .storeCoins(minClientStake) // stake
      .storeUint(0, 64) // tokensUsed
      .storeUint(0, 32) // unlockTs
      .storeUint(0, 256) // secretHash
      .storeRef(beginCell().storeBuffer(paramsCell).endCell())
      .endCell();
    
    const stateInit = {
      code: codeCell,
      data: dataCell,
    };
    
    return contractAddress(0, stateInit);
  } catch (error) {
    console.error('Error calculating client address:', error);
    // Return a placeholder address
    return Address.parse('EQD4FSw8kPD0Cr8tQ3g5e8fsi8jH9vJ7K2mN1pQ3rS5tU9vW');
  }
}

// Send AI request to Cocoon proxy
export async function sendAIRequest(
  prompt: string,
  clientAddress: string,
  proxyEndpoint: string
): Promise<string> {
  try {
    // Send request to Cocoon proxy endpoint
    // Cocoon proxy expects POST request with prompt and client address
    const response = await fetch(proxyEndpoint + '/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Address': clientAddress,
      },
      body: JSON.stringify({
        model: 'default', // Use default model or specify
        messages: [
          {
            role: 'system',
            content: 'Ты AI помощник для создания Jetton 2.0 токенов на блокчейне TON. Помогай пользователям придумывать названия, символы, описания, токеномику и идеи для их токенов. Отвечай на русском языке.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI request failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    
    // Extract response from Cocoon API format
    if (data.choices && data.choices[0] && data.choices[0].message) {
      return data.choices[0].message.content;
    }
    
    return data.response || data.content || 'Error: No response from AI';
  } catch (error: any) {
    console.error('Error sending AI request:', error);
    // Fallback to mock response for development
    if (error.message?.includes('fetch')) {
      return generateFallbackAIResponse(prompt);
    }
    throw error;
  }
}

// Fallback AI response generator (for development/testing)
function generateFallbackAIResponse(prompt: string): string {
  const lowerPrompt = prompt.toLowerCase();
  
  if (lowerPrompt.includes('название') || lowerPrompt.includes('name')) {
    return 'Отличный вопрос! Давай придумаем название для твоего токена. Вот несколько идей:\n\n1. **CryptoChef** - для кулинарной тематики\n2. **TokenKitchen** - игривое название\n3. **CookCoin** - простое и понятное\n\nКакой стиль тебе ближе? Расскажи больше о концепции токена, и я предложу более точные варианты!';
  }
  
  if (lowerPrompt.includes('символ') || lowerPrompt.includes('symbol') || lowerPrompt.includes('ticker')) {
    return 'Для символа токена рекомендую:\n\n- **CHEF** - если выбрали кулинарную тематику\n- **COOK** - короткий и запоминающийся\n- **KIT** - для TokenKitchen\n\nСимвол должен быть 3-5 букв, легко запоминаться. Что выбираешь?';
  }
  
  if (lowerPrompt.includes('суплай') || lowerPrompt.includes('supply')) {
    return 'Для суплая рекомендую:\n\n- **1,000,000,000** (1 миллиард) - стандартный вариант\n- **100,000,000** (100 миллионов) - для более редкого токена\n- **10,000,000,000** (10 миллиардов) - для массового использования\n\nКакой суплай подходит твоей концепции?';
  }
  
  if (lowerPrompt.includes('описание') || lowerPrompt.includes('description')) {
    return 'Отличная идея! Для описания токена важно:\n\n- Кратко описать цель и назначение\n- Упомянуть уникальные особенности\n- Добавить призыв к действию\n\nРасскажи больше о своем токене, и я помогу составить идеальное описание!';
  }
  
  return 'Интересная идея! Расскажи больше:\n\n- Какую проблему решает твой токен?\n- Кто твоя целевая аудитория?\n- Какие уникальные функции у токена?\n\nЧем больше деталей, тем лучше я смогу помочь с созданием!';
}

// Get available Cocoon proxies
export async function getAvailableProxies(): Promise<CocoonProxyInfo[]> {
  try {
    const client = getTonClient();
    const root = getCocoonRoot();
    const lastSeqno = await root.getLastProxySeqno(client);
    
    const proxies: CocoonProxyInfo[] = [];
    for (let i = 1; i <= lastSeqno; i++) {
      const proxyInfo = await root.getProxyInfo(client, i);
      if (proxyInfo) {
        proxies.push(proxyInfo);
      }
    }
    
    return proxies;
  } catch (error) {
    console.error('Error getting proxies:', error);
    return [];
  }
}

// Get client state
export async function getClientState(clientAddress: string): Promise<CocoonClientState | null> {
  try {
    const client = getTonClient();
    const clientContract = new CocoonClient(Address.parse(clientAddress));
    return await clientContract.getData(client);
  } catch (error) {
    console.error('Error getting client state:', error);
    return null;
  }
}

