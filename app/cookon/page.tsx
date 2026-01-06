'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useTonConnect } from '@/hooks/useTonConnect';
import { getAllParams, formatTON, getTonClient } from '@/lib/cocoon';
import { getCocoonRoot } from '@/lib/cocoonWrappers';
import { COCOON_ROOT_ADDRESS } from '@/lib/cocoonConfig';
import { getCocoonProxies, sendCocoonChatRequest, CocoonChatMessage } from '@/lib/cocoonApi';
import { deployCocoonClientContract, findExistingClient, checkClientExists } from '@/lib/deployCocoonClient';
import { topUpCocoonClient, getCocoonClientBalance } from '@/lib/topUpCocoonClient';
import { Address } from '@ton/core';
import { deployJettonMinter } from '@/lib/deploy';
import { TokenData } from '@/components/TokenForm';
import { toNano } from '@ton/core';
import toast from 'react-hot-toast';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface TokenSuggestion {
  name?: string;
  symbol?: string;
  description?: string;
  image?: string;
  totalSupply?: string;
  tokenomics?: string;
  ideas?: string[];
}

export default function CookonPage() {
  const { connected, wallet, sendTransaction, sendMultipleMessages } = useTonConnect();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Привет! Я Cocoon AI. Давай создадим твой Jetton 2.0 токен вместе! Расскажи мне о своей идее - что это за токен, для чего он нужен, какая у него концепция?',
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [cocoonParams, setCocoonParams] = useState<any>(null);
  const [clientBalance, setClientBalance] = useState<bigint>(0n);
  const [topUpAmount, setTopUpAmount] = useState('1');
  const [isToppingUp, setIsToppingUp] = useState(false);
  const [clientAddress, setClientAddress] = useState<string | null>(null);
  const [proxyEndpoint, setProxyEndpoint] = useState<string | null>(null);
  const [isDeployingClient, setIsDeployingClient] = useState(false);
  const [tokenSuggestion, setTokenSuggestion] = useState<TokenSuggestion>({});
  const [showDeployForm, setShowDeployForm] = useState(false);
  const [isClientReady, setIsClientReady] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadCocoonParams = async () => {
    try {
      const params = await getAllParams();
      setCocoonParams(params);
    } catch (error) {
      console.error('Failed to load Cocoon params:', error);
    }
  };

  const loadClientBalance = useCallback(async () => {
    if (!wallet || !clientAddress) return;
    
    try {
      const clientAddr = Address.parse(clientAddress);
      const balance = await getCocoonClientBalance(clientAddr);
      setClientBalance(balance);
    } catch (error) {
      console.error('Failed to load client balance:', error);
      setClientBalance(0n);
    }
  }, [wallet, clientAddress]);

  // Initialize Cocoon client and get proxy
  const initializeCocoon = useCallback(async () => {
    if (!connected || !wallet) return;

    try {
      // Get available proxies from Cocoon API
      const proxies = await getCocoonProxies();
      if (proxies.length === 0) {
        // Use default Cocoon API endpoint
        setProxyEndpoint('https://cocoon.doge.tg');
      } else {
        // Use first available proxy
        const proxy = proxies[0];
        setProxyEndpoint(proxy.endpoint || 'https://cocoon.doge.tg');
      }

      // Try to find or deploy Cocoon client contract
      const ownerAddress = Address.parse(wallet.toString());
      
      // Get network parameters to find existing client
      const params = await getAllParams();
      if (!params) {
        toast.error('Failed to get Cocoon parameters', { id: 'deploy-client' });
        return;
      }

      // Get proxy info for client lookup
      // Try to get from contract, but fallback to root address if needed
      let proxyAddress: Address;
      let proxyPublicKey: Buffer;
      
      try {
        const root = getCocoonRoot();
        const client = getTonClient();
        const lastSeqno = await root.getLastProxySeqno(client);
        
        if (lastSeqno > 0) {
          const proxyInfo = await root.getProxyInfo(client, 1);
          if (proxyInfo && proxyInfo.endpoint) {
            // Try to parse endpoint as address
            try {
              proxyAddress = Address.parse(proxyInfo.endpoint);
              proxyPublicKey = proxyInfo.pubkey || Buffer.alloc(32);
            } catch {
              // If endpoint is not an address, use root address as fallback
              proxyAddress = Address.parse(COCOON_ROOT_ADDRESS);
              proxyPublicKey = proxyInfo.pubkey || Buffer.alloc(32);
            }
          } else {
            // Use root address as proxy address
            proxyAddress = Address.parse(COCOON_ROOT_ADDRESS);
            proxyPublicKey = Buffer.alloc(32);
          }
        } else {
          // No proxies in contract, use root address
          console.warn('No proxies found in contract, using root address');
          proxyAddress = Address.parse(COCOON_ROOT_ADDRESS);
          proxyPublicKey = Buffer.alloc(32);
        }
      } catch (proxyError) {
        console.warn('Error getting proxy from contract, using fallback:', proxyError);
        // Fallback: use root address
        proxyAddress = Address.parse(COCOON_ROOT_ADDRESS);
        proxyPublicKey = Buffer.alloc(32);
      }

      // Check if client already exists (with timeout)
      toast.loading('Checking for existing client...', { id: 'deploy-client' });
      
      try {
        const existingClientPromise = findExistingClient(
          ownerAddress,
          proxyAddress,
          proxyPublicKey,
          params
        );
        
        // Add timeout of 10 seconds
        const timeoutPromise = new Promise<Address | null>((resolve) => {
          setTimeout(() => {
            console.warn('findExistingClient timeout, assuming no client exists');
            resolve(null);
          }, 10000);
        });
        
        const existingClient = await Promise.race([existingClientPromise, timeoutPromise]);

        if (existingClient) {
          setClientAddress(existingClient.toString());
          // Check balance
          try {
            const balance = await getCocoonClientBalance(existingClient);
            setClientBalance(balance);
            setIsClientReady(balance > 0n); // Ready only if has balance
            if (balance > 0n) {
              toast.success('Cocoon client готов! Можно использовать AI.', { id: 'deploy-client' });
            } else {
              toast.success('Client найден, но баланс пуст. Пополните баланс.', { id: 'deploy-client' });
            }
          } catch (balanceError) {
            console.error('Error checking balance:', balanceError);
            setClientBalance(0n);
            setIsClientReady(false);
            toast.success('Client найден, но не удалось проверить баланс. Пополните баланс.', { id: 'deploy-client' });
          }
        } else {
          // Client doesn't exist - user needs to deploy manually
          setIsClientReady(false);
          toast.dismiss('deploy-client');
        }
      } catch (clientCheckError) {
        console.error('Error checking for existing client:', clientCheckError);
        setIsClientReady(false);
        toast.dismiss('deploy-client');
      }
    } catch (error: any) {
      console.error('Failed to initialize Cocoon:', error);
      toast.error('Failed to initialize Cocoon: ' + error.message);
    }
  }, [connected, wallet, sendTransaction]);

  // Load Cocoon parameters on mount
  useEffect(() => {
    loadCocoonParams();
  }, []);

  // Initialize Cocoon when wallet connects
  useEffect(() => {
    if (connected && wallet) {
      initializeCocoon();
    }
  }, [connected, wallet, initializeCocoon]);

  // Load client balance when client address is set
  useEffect(() => {
    if (clientAddress) {
      loadClientBalance();
    }
  }, [clientAddress, loadClientBalance]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleDeployClient = async () => {
    if (!connected || !wallet) {
      toast.error('Please connect your wallet first');
      return;
    }

    setIsDeployingClient(true);
    try {
      const ownerAddress = Address.parse(wallet.toString());
      
      toast.loading('Deploying Cocoon client contract...', { id: 'deploy-client' });
      const deployResult = await deployCocoonClientContract(
        ownerAddress,
        sendTransaction
      );
      
      if (deployResult.success && deployResult.address) {
        setClientAddress(deployResult.address);
        setClientBalance(0n); // New client has 0 balance
        toast.success('Cocoon client deployed! Now top up your balance.', { id: 'deploy-client' });
      } else {
        toast.error(deployResult.error || 'Failed to deploy client', { id: 'deploy-client' });
      }
    } catch (error: any) {
      console.error('Client deployment error:', error);
      toast.error(error.message || 'Failed to deploy client');
    } finally {
      setIsDeployingClient(false);
    }
  };

  const handleTopUp = async () => {
    if (!connected || !wallet || !clientAddress) {
      toast.error('Please deploy client contract first');
      return;
    }

    const amount = parseFloat(topUpAmount);
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setIsToppingUp(true);
    try {
      const depositAmount = toNano(amount.toString());
      const clientAddr = Address.parse(clientAddress);

      // Top up client contract
      toast.loading('Topping up balance...', { id: 'topup' });
      const result = await topUpCocoonClient(
        clientAddr,
        depositAmount,
        sendTransaction,
        Address.parse(wallet.toString())
      );

      if (result.success) {
        // Refresh balance
        const newBalance = await getCocoonClientBalance(clientAddr);
        setClientBalance(newBalance);
        setIsClientReady(newBalance > 0n); // Enable chat if has balance
        toast.success(`Topped up ${amount} TON! You can now use AI chat.`, { id: 'topup' });
      } else {
        toast.error(result.error || 'Failed to top up', { id: 'topup' });
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to top up', { id: 'topup' });
    } finally {
      setIsToppingUp(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      if (!proxyEndpoint || !clientAddress) {
        throw new Error('Cocoon not initialized. Please wait...');
      }

      // Prepare messages for Cocoon API
      const messages: CocoonChatMessage[] = [
        {
          role: 'system',
          content: 'Ты AI помощник для создания Jetton 2.0 токенов на блокчейне TON. Помогай пользователям придумывать названия, символы, описания, токеномику и идеи для их токенов. Отвечай на русском языке.',
        },
        {
          role: 'user',
          content: inputMessage,
        },
      ];

      // Send request to Cocoon AI through API
      const response = await sendCocoonChatRequest(
        messages,
        clientAddress,
        proxyEndpoint
      );

      // Extract AI response
      const aiResponse = response.choices?.[0]?.message?.content || 'Извините, не получилось получить ответ от AI.';

      // Parse AI response for token suggestions
      const suggestion = parseTokenSuggestion(aiResponse);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Update token suggestion if AI provided new data
      if (suggestion.name || suggestion.symbol) {
        setTokenSuggestion(prev => ({ ...prev, ...suggestion }));
      }

      // If AI suggests a complete token, show deploy form
      if (suggestion.name && suggestion.symbol && suggestion.totalSupply) {
        setShowDeployForm(true);
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      
      // Fallback: simulate AI response for demo
      const fallbackResponse = generateFallbackResponse(inputMessage);
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: fallbackResponse,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const parseTokenSuggestion = (response: string): TokenSuggestion => {
    // Simple parsing - in production, this would be more sophisticated
    const suggestion: TokenSuggestion = {};
    
    // Try to extract token name
    const nameMatch = response.match(/название[:\s]+([A-Za-z0-9\s]+)/i) || 
                     response.match(/name[:\s]+([A-Za-z0-9\s]+)/i);
    if (nameMatch) suggestion.name = nameMatch[1].trim();

    // Try to extract symbol
    const symbolMatch = response.match(/символ[:\s]+([A-Z]{2,10})/i) || 
                       response.match(/symbol[:\s]+([A-Z]{2,10})/i);
    if (symbolMatch) suggestion.symbol = symbolMatch[1].trim();

    // Try to extract supply
    const supplyMatch = response.match(/суплай[:\s]+([0-9,]+)/i) || 
                       response.match(/supply[:\s]+([0-9,]+)/i);
    if (supplyMatch) suggestion.totalSupply = supplyMatch[1].replace(/,/g, '');

    return suggestion;
  };

  const generateFallbackResponse = (userMessage: string): string => {
    // Fallback AI responses for demo purposes
    const lowerMessage = userMessage.toLowerCase();
    
    if (lowerMessage.includes('название') || lowerMessage.includes('name')) {
      return 'Отличный вопрос! Давай придумаем название. Что тебе нравится больше:\n\n1. **CryptoChef** - для кулинарной тематики\n2. **TokenKitchen** - игривое название\n3. **CookCoin** - простое и понятное\n\nКакой стиль тебе ближе?';
    }
    
    if (lowerMessage.includes('символ') || lowerMessage.includes('symbol') || lowerMessage.includes('ticker')) {
      return 'Для символа токена рекомендую:\n\n- **CHEF** - если выбрали кулинарную тематику\n- **COOK** - короткий и запоминающийся\n- **KIT** - для TokenKitchen\n\nСимвол должен быть 3-5 букв, легко запоминаться. Что выбираешь?';
    }
    
    if (lowerMessage.includes('суплай') || lowerMessage.includes('supply')) {
      return 'Для суплая рекомендую:\n\n- **1,000,000,000** (1 миллиард) - стандартный вариант\n- **100,000,000** (100 миллионов) - для более редкого токена\n- **10,000,000,000** (10 миллиардов) - для массового использования\n\nКакой суплай подходит твоей концепции?';
    }
    
    return 'Интересная идея! Расскажи больше:\n\n- Какую проблему решает твой токен?\n- Кто твоя целевая аудитория?\n- Какие уникальные функции у токена?\n\nЧем больше деталей, тем лучше я смогу помочь с созданием!';
  };

  const handleCookIt = async () => {
    if (!connected || !wallet) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!tokenSuggestion.name || !tokenSuggestion.symbol || !tokenSuggestion.totalSupply) {
      toast.error('Please complete the token details first');
      return;
    }

    try {
      const tokenData: TokenData = {
        name: tokenSuggestion.name,
        symbol: tokenSuggestion.symbol.toUpperCase(),
        description: tokenSuggestion.description || tokenSuggestion.name,
        image: tokenSuggestion.image || '',
        decimals: 9,
        totalSupply: tokenSuggestion.totalSupply,
        mintable: true,
      };

      setIsLoading(true);
      
      const result = await deployJettonMinter(
        tokenData,
        wallet,
        sendTransaction,
        sendMultipleMessages
      );

      if (result.success && result.address) {
        toast.success('Token deployed successfully!');
        setShowDeployForm(false);
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: `🎉 Отлично! Твой токен ${tokenSuggestion.name} (${tokenSuggestion.symbol}) успешно создан!\n\nАдрес контракта: ${result.address}\n\nТеперь ты можешь торговать им на DEX!`,
          timestamp: new Date(),
        }]);
      } else {
        throw new Error(result.error || 'Deployment failed');
      }
    } catch (error: any) {
      console.error('Deployment error:', error);
      toast.error(error.message || 'Failed to deploy token');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Background decorations */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-1/4 w-[600px] h-[600px] bg-gradient-to-br from-orange-500/30 to-yellow-500/20 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-gradient-to-br from-orange-400/25 to-amber-500/15 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/3 w-[550px] h-[550px] bg-gradient-to-br from-yellow-500/20 to-orange-400/25 rounded-full blur-3xl" />
      </div>

      <Header />

      <main className="flex-grow relative z-10 pt-24 pb-12 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <Image 
                src="https://em-content.zobj.net/source/telegram/386/robot_1f916.webp" 
                alt="Cookon" 
                width={120}
                height={120}
                className="drop-shadow-lg"
                unoptimized
              />
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-4">
              <span className="gradient-text-cook">Cookon</span>
            </h1>
            <p className="text-lg text-cook-text-secondary max-w-2xl mx-auto">
              AI деплоер Jetton 2.0. Общайся с AI Cocoon о нарративе токена, получай предложения и создавай токены одним кликом!
            </p>
          </div>

          {/* Setup Section - Show if client not ready */}
          {connected && !isClientReady && (
            <div className="card mb-6">
              <h2 className="text-2xl font-bold text-cook-text mb-4">
                {!clientAddress ? 'Шаг 1: Создайте Cocoon Client' : 'Шаг 2: Пополните баланс'}
              </h2>
              
              {!clientAddress ? (
                <div className="space-y-4">
                  <p className="text-cook-text-secondary">
                    Для использования AI Cocoon необходимо создать Client контракт. Это позволит вам оплачивать вычисления AI.
                  </p>
                  <button
                    onClick={handleDeployClient}
                    disabled={isDeployingClient || isInitializing}
                    className="btn-cook w-full"
                  >
                    {isDeployingClient ? 'Деплоим...' : 'Создать Client контракт'}
                  </button>
                  {isInitializing && (
                    <p className="text-sm text-cook-text-secondary text-center">
                      Проверяем существующий контракт...
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-cook-text-secondary">
                    Client контракт создан! Теперь пополните баланс для использования AI.
                  </p>
                  <div className="flex items-center gap-4">
                    <input
                      type="number"
                      value={topUpAmount}
                      onChange={(e) => setTopUpAmount(e.target.value)}
                      placeholder="1.0"
                      step="0.1"
                      min="0.1"
                      className="input-ton flex-1"
                    />
                    <button
                      onClick={handleTopUp}
                      disabled={isToppingUp}
                      className="btn-cook"
                    >
                      {isToppingUp ? 'Пополняем...' : 'Пополнить баланс'}
                    </button>
                  </div>
                  <div className="mt-2">
                    <p className="text-sm text-cook-text-secondary">
                      Текущий баланс: <span className="font-bold text-cook-text">{formatTON(clientBalance)}</span>
                    </p>
                    {cocoonParams && (
                      <p className="text-xs text-cook-text-secondary mt-1">
                        Цена за токен: {formatTON(cocoonParams.price_per_token || 0n)}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Balance Display - Show when ready */}
          {connected && isClientReady && (
            <div className="card mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-cook-text-secondary mb-1">Cocoon Balance</p>
                  <p className="text-2xl font-bold text-cook-text">
                    {formatTON(clientBalance)}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <input
                    type="number"
                    value={topUpAmount}
                    onChange={(e) => setTopUpAmount(e.target.value)}
                    placeholder="1.0"
                    step="0.1"
                    min="0.1"
                    className="input-ton w-32"
                  />
                  <button
                    onClick={handleTopUp}
                    disabled={isToppingUp}
                    className="btn-cook"
                  >
                    {isToppingUp ? 'Topping up...' : 'Top Up'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Chat Interface */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chat */}
            <div className="lg:col-span-2">
              <div className="card h-[600px] flex flex-col">
                <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={chatContainerRef}>
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-xl p-4 ${
                          message.role === 'user'
                            ? 'bg-cook-orange text-white'
                            : 'bg-cook-bg-secondary text-cook-text'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{message.content}</p>
                        <p className="text-xs opacity-70 mt-2">
                          {message.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-cook-bg-secondary rounded-xl p-4">
                        <div className="flex items-center gap-2">
                          <div className="spinner w-4 h-4" />
                          <span className="text-cook-text-secondary">AI думает...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="border-t border-cook-border p-4">
                  {!connected ? (
                    <div className="text-center py-4">
                      <p className="text-cook-text-secondary mb-2">Подключите кошелек, чтобы начать</p>
                    </div>
                  ) : !isClientReady ? (
                    <div className="text-center py-4">
                      <p className="text-cook-text-secondary mb-2">
                        {!clientAddress 
                          ? 'Создайте Client контракт и пополните баланс для использования AI'
                          : 'Пополните баланс для использования AI'}
                      </p>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <textarea
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Расскажи о своей идее токена..."
                        className="flex-1 input-ton resize-none"
                        rows={2}
                        disabled={isLoading}
                      />
                      <button
                        onClick={handleSendMessage}
                        disabled={!inputMessage.trim() || isLoading || !isClientReady}
                        className="btn-cook px-6"
                      >
                        Send
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Token Suggestion Panel */}
            <div className="lg:col-span-1">
              <div className="card sticky top-24">
                <h3 className="text-xl font-bold text-cook-text mb-4">Token Suggestion</h3>
                
                {showDeployForm && tokenSuggestion.name ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-cook-text mb-2">Name</label>
                      <input
                        type="text"
                        value={tokenSuggestion.name}
                        onChange={(e) => setTokenSuggestion(prev => ({ ...prev, name: e.target.value }))}
                        className="input-ton"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-cook-text mb-2">Symbol</label>
                      <input
                        type="text"
                        value={tokenSuggestion.symbol || ''}
                        onChange={(e) => setTokenSuggestion(prev => ({ ...prev, symbol: e.target.value }))}
                        className="input-ton"
                        maxLength={10}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-cook-text mb-2">Total Supply</label>
                      <input
                        type="text"
                        value={tokenSuggestion.totalSupply || ''}
                        onChange={(e) => setTokenSuggestion(prev => ({ ...prev, totalSupply: e.target.value }))}
                        className="input-ton"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-cook-text mb-2">Description</label>
                      <textarea
                        value={tokenSuggestion.description || ''}
                        onChange={(e) => setTokenSuggestion(prev => ({ ...prev, description: e.target.value }))}
                        className="input-ton"
                        rows={3}
                      />
                    </div>
                    <button
                      onClick={handleCookIt}
                      disabled={isLoading || !tokenSuggestion.name || !tokenSuggestion.symbol}
                      className="btn-cook w-full text-lg py-3"
                    >
                      {isLoading ? (
                        <>
                          <div className="spinner mx-auto mb-2" />
                          Cooking...
                        </>
                      ) : (
                        '🍳 Cook it!'
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-8 text-cook-text-secondary">
                    <p>Общайся с AI, чтобы получить предложения по токену</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

