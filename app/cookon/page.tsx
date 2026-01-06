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
  }, [connected, wallet]);

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
