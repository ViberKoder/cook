'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import toast from 'react-hot-toast';
import TokenForm, { TokenData } from '@/components/TokenForm';
import { useTonConnect } from '@/hooks/useTonConnect';
import DeploymentStatus, { DeploymentStep } from '@/components/DeploymentStatus';
import { Address, beginCell, toNano } from '@ton/core';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  tokenData?: TokenData;
}

// Payment configuration
const PAYMENT_WALLET = process.env.NEXT_PUBLIC_PAYMENT_WALLET || 'UQDjQOdWTP1bPpGpYExAsCcVLGPN_pzGvdno3aCk565ZnQIz';
const INITIAL_PAYMENT = 0.3; // TON
const PERIODIC_PAYMENT = 0.25; // TON
const REQUESTS_PER_PAYMENT = 10;

export default function CookonPage() {
  const { connected, wallet, sendTransaction, sendMultipleMessages, tonConnectUI } = useTonConnect();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m Cookon AI ??\n\nI\'ll help you create a viral memecoin on the TON blockchain. Just tell me your idea or ask me to come up with something new!',
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasPaidInitial, setHasPaidInitial] = useState(false);
  const [requestCount, setRequestCount] = useState(0);
  const [tokenData, setTokenData] = useState<TokenData>({
    name: '',
    symbol: '',
    description: '',
    image: '',
    imageData: '',
    decimals: 9,
    totalSupply: '1000000000',
    mintable: true,
  });
  const [step, setStep] = useState<DeploymentStep>('idle');
  const [deployedAddress, setDeployedAddress] = useState<string>('');
  const [error, setError] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Check payment status on mount and apply dark theme
  useEffect(() => {
    const paid = localStorage.getItem('cookon_initial_payment');
    if (paid === 'true') {
      setHasPaidInitial(true);
    }
    const count = localStorage.getItem('cookon_request_count');
    if (count) {
      setRequestCount(parseInt(count, 10));
    }

    // Apply dark theme to body
    document.body.style.backgroundColor = '#000000';
    document.body.style.color = '#ffffff';
    document.documentElement.style.backgroundColor = '#000000';

    // Cleanup on unmount
    return () => {
      document.body.style.backgroundColor = '';
      document.body.style.color = '';
      document.documentElement.style.backgroundColor = '';
    };
  }, []);

  // Send payment transaction
  const sendPayment = async (amount: number, comment: string): Promise<boolean> => {
    if (!connected || !wallet) {
      toast.error('Please connect your wallet first');
      return false;
    }

    if (!tonConnectUI) {
      toast.error('TON Connect is not initialized');
      return false;
    }

    try {
      const paymentAddress = Address.parse(PAYMENT_WALLET);
      const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 360,
        messages: [
          {
            address: paymentAddress.toString(),
            amount: toNano(amount).toString(),
            payload: beginCell()
              .storeUint(0, 32)
              .storeStringTail(comment)
              .endCell()
              .toBoc()
              .toString('base64'),
          },
        ],
      };

      await tonConnectUI.sendTransaction(transaction);
      toast.success(`Payment of ${amount} TON sent successfully`);
      return true;
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error(error.message || 'Payment failed');
      return false;
    }
  };

  // Handle initial payment
  const handleInitialPayment = async () => {
    if (!connected || !wallet) {
      toast.error('Please connect your TON wallet first');
      return;
    }

    const success = await sendPayment(INITIAL_PAYMENT, 'Cookon initial access payment');
    if (success) {
      setHasPaidInitial(true);
      localStorage.setItem('cookon_initial_payment', 'true');
      toast.success('Access granted! You can now use Cookon.');
    }
  };

  // Check and process periodic payment
  const checkAndProcessPeriodicPayment = async (): Promise<boolean> => {
    const newCount = requestCount + 1;
    setRequestCount(newCount);
    localStorage.setItem('cookon_request_count', newCount.toString());

    if (newCount % REQUESTS_PER_PAYMENT === 0) {
      const success = await sendPayment(PERIODIC_PAYMENT, `Cookon periodic payment - ${newCount} requests`);
      if (!success) {
        setRequestCount(newCount - 1);
        localStorage.setItem('cookon_request_count', (newCount - 1).toString());
        return false;
      }
    }
    return true;
  };

  // Parse AI response to extract token data
  const parseTokenData = (content: string): Partial<TokenData> => {
    const parsed: Partial<TokenData> = {};
    
    const nameMatch = content.match(/(?:Название|Name|Token Name)[::]\s*([^\n]+)|"([^"]+)"|'([^']+)'/i);
    if (nameMatch) {
      parsed.name = (nameMatch[1] || nameMatch[2] || nameMatch[3] || '').trim();
    }
    
    const symbolMatch = content.match(/\$([A-Z0-9]{2,10})|(?:Symbol|Тикер|Ticker)[::]\s*([A-Z0-9]{2,10})/i);
    if (symbolMatch) {
      parsed.symbol = (symbolMatch[1] || symbolMatch[2] || symbolMatch[3] || '').toUpperCase().trim();
    }
    
    const descMatch = content.match(/(?:Описание|Description|Нарратив)[::]\s*([^\n]+(?:\n[^\n]+){0,10})/i);
    if (descMatch) {
      parsed.description = descMatch[1].trim();
    } else {
      const narrativeMatch = content.match(/(?:Нарратив|Narrative|История)[::]?\s*([^\n]+(?:\n[^\n]+){2,15})/i);
      if (narrativeMatch) {
        parsed.description = narrativeMatch[1].trim();
      }
    }
    
    const imageMatch = content.match(/(?:Image|Картинка|Изображение|URL)[::]\s*(https?:\/\/[^\s]+)/i);
    if (imageMatch) {
      parsed.image = imageMatch[1].trim();
    }
    
    return parsed;
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    // Check wallet connection
    if (!connected || !wallet) {
      toast.error('Please connect your TON wallet to use Cookon');
      return;
    }

    // Check initial payment
    if (!hasPaidInitial) {
      toast.error('Please pay the initial access fee of 0.3 TON to use Cookon');
      return;
    }

    // Check and process periodic payment
    const canProceed = await checkAndProcessPeriodicPayment();
    if (!canProceed) {
      toast.error('Payment required. Please complete the payment to continue.');
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputMessage;
    setInputMessage('');
    setIsLoading(true);

    try {
      const apiMessages = [
        {
          role: 'system' as const,
          content: `Ты — Cookon Jettons and Meme Lord, легендарный креатор мемкоинов, который сочетает лёгкий абсурдный юмор Pepe и Doge с глубоким, цепляющим нарративом, который делает коин вирусным. Твоя креативность в 10 раз выше обычной: ты всегда придумываешь неожиданные, свежие, абсурдно-запомнинающиеся идеи, которые идеально ложатся на текущий вайб интернета.

Каждый раз, когда пользователь просит придумать мемкоин или нарратив (или просто начинает разговор на эту тему), следуй этому процессу строго:

1. Сначала проведи быстрый поиск актуальных трендов и новостей:
   - Используй web_search и/или x_keyword_search, чтобы найти самые свежие мемы, новости из мира крипты, TON-экосистемы, Telegram, популярные события, вирусные шутки и культурные моменты за последние 7–14 дней.
   - Обрати особое внимание на: новости TON (Notcoin, Hamster Kombat, новые игры/боты), тренды в Telegram-миниаппах, вирусные мемы на X/Twitter, Reddit, 4chan, актуальные мировые события, которые можно легко мемизировать.
   - Найди 3–5 самых горячих тем/событий, которые можно легко и смешно привязать к мемкоину.

2. На основе найденного создай мемкоин с нуля:
   - Лёгкий и абсурдный персонаж (животное, объект, вымышенное существо), как Pepe или Doge — но всегда с уникальным твистом.
   - Глубокий, но простой нарратив: почему этот персонаж существует, какая у него "миссия", как он отражает текущие тренды/новости, почему люди будут в него верить и холдить.
   - Нарратив должен быть эмоциональным, relatable, с элементами underdog-истории, FOMO и сообщества.
   - Юмор — лёгкий, самоироничный, абсурдный, но с смыслом (не пустой хайп).

3. Структура ответа (всегда используй её):
   - Название коина и тикер (например, $FROG или $WOOF).
   - Описание персонажа и визуальный стиль (что это за мем, какие цвета, эмоции).
   - Полный нарратив (короткая история 150–250 слов, как манифест сообщества).
   - Связь с актуальными новостями/трендами (покажи, как коин "ловит волну").
   - Идеи для вирусности: слоганы, мемы, возможные Telegram-боты/игры, как запустить на TON.
   - Почему это взлетит: краткий анализ, почему именно сейчас.

Ты всегда максимально креативен: комбинируй неожиданные элементы, придумывай новые мемы на лету, делай нарративы, от которых люди будут ржать и одновременно думать "это гениально". Никогда не повторяйся, каждый коин — абсолютно уникальный. Если пользователь даёт конкретную идею или тему — развивай её в этом стиле.

ВАЖНО: 
- В чате пиши ТОЛЬКО короткое описание нарратива (максимум 300 символов), без markdown, без #, без JSON, без кода, без символов #. Просто чистый текст с описанием идеи мемкоина. Никаких заголовков, никаких форматирований. ОБЯЗАТЕЛЬНО заканчивай мысль полностью - не обрывай на полуслове.
- После описания в чате, ВСЕГДА добавляй в конце ответа структурированные данные в формате JSON для автоматического заполнения формы (но JSON не показывай в чате, он будет автоматически извлечен). JSON должен быть на отдельной строке после текста:

JSON_DATA:
{
  "name": "Название токена",
  "symbol": "SYMBOL",
  "description": "Полное описание и нарратив для формы",
  "imagePrompt": "Детальное описание для генерации изображения"
}

Будь немногословным в общении, в основном заполняй форму данными. Начинай ответ сразу с предложения коина, без преамбул.`,
        },
        ...messages.filter(m => m.role !== 'system').map(m => ({
          role: m.role,
          content: m.content,
        })),
        {
          role: 'user' as const,
          content: currentInput,
        },
      ];

      const response = await fetch('/api/grok', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: apiMessages,
          temperature: 0.9,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get response');
      }

      const data = await response.json();
      const fullResponse = data.content || 'No response from AI';

      // Extract JSON data
      let jsonData = null;
      let chatMessage = fullResponse;
      
      const jsonDataMatch = fullResponse.match(/JSON_DATA\s*:\s*(\{[\s\S]*?\})/);
      if (jsonDataMatch && jsonDataMatch[1]) {
        try {
          jsonData = JSON.parse(jsonDataMatch[1]);
          chatMessage = fullResponse.replace(/JSON_DATA\s*:[\s\S]*/, '').trim();
        } catch (e) {
          console.error('Failed to parse JSON_DATA:', e);
        }
      }
      
      if (!jsonData) {
        const jsonMatch = fullResponse.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch && jsonMatch[1]) {
          try {
            jsonData = JSON.parse(jsonMatch[1]);
            chatMessage = fullResponse.replace(/```json[\s\S]*?```/, '').trim();
          } catch (e) {
            console.error('Failed to parse JSON block:', e);
          }
        }
      }

      // Clean chat message
      chatMessage = chatMessage
        .replace(/JSON_DATA\s*:[\s\S]*/, '')
        .replace(/```json[\s\S]*?```/g, '')
        .replace(/```[\s\S]*?```/g, '')
        .replace(/#{1,6}\s+/g, '')
        .replace(/#/g, '')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
        .replace(/\{[\s\S]*"name"[\s\S]*\}/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      // Limit chat message to 300 characters
      if (chatMessage.length > 300) {
        let cutAt = -1;
        const maxLength = 300;
        
        for (let i = maxLength - 1; i >= maxLength - 100 && i >= 0; i--) {
          if (chatMessage[i] === '.' || chatMessage[i] === '!' || chatMessage[i] === '?') {
            if (i === 0 || chatMessage[i - 1] !== '.' || (i < chatMessage.length - 1 && chatMessage[i + 1] === ' ')) {
              cutAt = i + 1;
              break;
            }
          }
        }
        
        if (cutAt === -1) {
          cutAt = chatMessage.lastIndexOf(' ', maxLength - 1);
          if (cutAt < maxLength - 50) {
            cutAt = maxLength;
          }
        }
        
        if (cutAt > 0 && cutAt <= chatMessage.length) {
          chatMessage = chatMessage.substring(0, cutAt).trim();
        } else {
          chatMessage = chatMessage.substring(0, maxLength).trim();
        }
      }

      // Parse and extract token data from JSON
      let extractedTokenData: TokenData | null = null;
      
      if (jsonData) {
        extractedTokenData = {
          name: (jsonData.name || '').trim(),
          symbol: ((jsonData.symbol || '').trim().replace(/[^A-Z0-9]/g, '')).toUpperCase(),
          description: (jsonData.description || '').trim(),
          image: '',
          imageData: '',
          decimals: 9,
          totalSupply: '1000000000',
          mintable: true,
        };
        
        const imagePrompt = jsonData.imagePrompt || 
          (jsonData.description ? `A memecoin token logo for ${extractedTokenData.name} (${extractedTokenData.symbol}): ${jsonData.description.substring(0, 200)}` : 
          `A memecoin token logo: ${chatMessage}`);
        
        const messageId = (Date.now() + 1).toString();
        const assistantMessage: Message = {
          id: messageId,
          role: 'assistant',
          content: chatMessage,
          timestamp: new Date(),
          tokenData: extractedTokenData || undefined,
        };

        setMessages(prev => [...prev, assistantMessage]);
        
        if (imagePrompt) {
          generateImageForMessage(imagePrompt, extractedTokenData, messageId).catch(err => {
            console.error('Image generation failed:', err);
          });
        }
      } else {
        const parsed = parseTokenData(fullResponse);
        if (parsed.name || parsed.symbol || parsed.description) {
          extractedTokenData = {
            name: (parsed.name || '').trim() || '',
            symbol: ((parsed.symbol || '').trim().replace(/[^A-Z0-9]/g, '')).toUpperCase() || '',
            description: (parsed.description || '').trim() || '',
            image: (parsed.image || '').trim() || '',
            imageData: '',
            decimals: 9,
            totalSupply: '1000000000',
            mintable: true,
          };
        }
        
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: chatMessage,
          timestamp: new Date(),
          tokenData: extractedTokenData || undefined,
        };

        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error(error.message || 'Failed to send message to AI');
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, an error occurred. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateImageForMessage = async (prompt: string, tokenData: TokenData, messageId: string) => {
    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.imageUrl) {
          setMessages(prev => {
            return prev.map(msg => 
              msg.id === messageId && msg.tokenData
                ? {
                    ...msg,
                    tokenData: {
                      ...msg.tokenData,
                      image: data.imageUrl,
                    }
                  }
                : msg
            );
          });
          toast.success('Image generated!');
        }
      }
    } catch (error) {
      console.error('Failed to generate image:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: '1',
        role: 'assistant',
        content: 'Hello! I\'m Cookon AI ??\n\nI\'ll help you create a viral memecoin on the TON blockchain. Just tell me your idea or ask me to come up with something new!',
        timestamp: new Date(),
      },
    ]);
    const emptyData: TokenData = {
      name: '',
      symbol: '',
      description: '',
      image: '',
      imageData: '',
      decimals: 9,
      totalSupply: '1000000000',
      mintable: true,
    };
    setTokenData(emptyData);
  };

  const handleDeploy = async (data: TokenData) => {
    if (!connected || !wallet) {
      setError('Please connect your wallet first');
      return;
    }

    try {
      setStep('preparing');
      setError('');
      
      const { deployJettonMinter } = await import('@/lib/deploy');
      
      setStep('deploying');
      
      const result = await deployJettonMinter(
        data,
        wallet,
        sendTransaction,
        sendMultipleMessages
      );
      
      if (result.success && result.address) {
        setDeployedAddress(result.address);
        setStep('completed');
      } else {
        throw new Error(result.error || 'Deployment failed');
      }
    } catch (err: any) {
      console.error('Deployment error:', err);
      setError(err.message || 'Failed to deploy token');
      setStep('error');
    }
  };

  const handleReset = () => {
    setStep('idle');
    setDeployedAddress('');
    setError('');
  };

  // Payment gate - show payment screen if not paid
  if (!connected || !hasPaidInitial) {
    return (
      <div className="cookon-dark-theme min-h-screen flex flex-col items-center justify-center px-4" style={{ backgroundColor: '#000000' }}>
        <div className="max-w-2xl w-full text-center">
          <div className="mb-8">
            <Image 
              src="https://lime-gigantic-quelea-995.mypinata.cloud/ipfs/bafkreicinlqivthmwglklcmd2f2hgikpjqtco4cmt73spj7frjfz4fpkwi" 
              alt="Cookon" 
              width={900}
              height={300}
              className="mx-auto mb-8"
              unoptimized
            />
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-4 text-white">
            Cookon
          </h1>
          <h2 className="text-2xl md:text-3xl font-light mb-8 text-gray-300">
            Confidential Compute Open Network
          </h2>
          <p className="text-lg text-gray-400 mb-12 max-w-xl mx-auto">
            Cookon connects AI, GPU power, and Telegram&apos;s vast ecosystem – all built on privacy and blockchain.
          </p>
          
          {!connected ? (
            <div className="bg-gray-900/50 backdrop-blur-lg rounded-2xl p-8 border border-gray-800">
              <p className="text-gray-300 mb-6">Please connect your TON wallet to access Cookon</p>
              <button
                onClick={() => tonConnectUI?.openModal()}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-8 py-4 rounded-xl transition-colors"
              >
                Connect Wallet
              </button>
            </div>
          ) : (
            <div className="bg-gray-900/50 backdrop-blur-lg rounded-2xl p-8 border border-gray-800">
              <p className="text-gray-300 mb-2">Initial access fee: <span className="text-white font-semibold">{INITIAL_PAYMENT} TON</span></p>
              <p className="text-sm text-gray-400 mb-6">After payment, you&apos;ll be charged {PERIODIC_PAYMENT} TON for every {REQUESTS_PER_PAYMENT} AI requests</p>
              <button
                onClick={handleInitialPayment}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-8 py-4 rounded-xl transition-colors w-full"
              >
                Pay {INITIAL_PAYMENT} TON to Access
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="cookon-dark-theme min-h-screen flex flex-col" style={{ backgroundColor: '#000000', minHeight: '100vh', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, overflow: 'auto' }}>
      <main className="flex-grow relative z-10 pt-12 pb-12 px-4" style={{ backgroundColor: '#000000' }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <Image 
                src="https://lime-gigantic-quelea-995.mypinata.cloud/ipfs/bafkreicinlqivthmwglklcmd2f2hgikpjqtco4cmt73spj7frjfz4fpkwi" 
                alt="Cookon" 
                width={600}
                height={200}
                className="drop-shadow-2xl"
                unoptimized
              />
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-4 text-white">
              Cookon
            </h1>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-4">
              Cookon AI — create your own viral memecoin, in chat with AI!????
            </p>
            <p className="text-sm text-gray-500">
              Requests: {requestCount} | Next payment at {Math.ceil((requestCount + 1) / REQUESTS_PER_PAYMENT) * REQUESTS_PER_PAYMENT} requests ({PERIODIC_PAYMENT} TON)
            </p>
          </div>

          {step === 'idle' || step === 'error' ? (
            <div className="bg-gray-900/50 backdrop-blur-lg rounded-2xl border border-gray-800 max-w-4xl mx-auto p-6">
              <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-800">
                <h2 className="text-xl font-semibold text-white">Chat with Cookon AI</h2>
                <button
                  onClick={handleClearChat}
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Clear
                </button>
              </div>

              <div className="h-[calc(100vh-280px)] min-h-[600px] flex flex-col">
                <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={chatContainerRef}>
                  {messages.map((message) => (
                    <div key={message.id} className="space-y-3">
                      <div
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-xl p-4 ${
                            message.role === 'user'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-800 text-gray-100'
                          }`}
                        >
                          <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                          <p className="text-xs opacity-70 mt-2">
                            {message.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                      
                      {message.role === 'assistant' && message.tokenData && (
                        <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700">
                          <h3 className="text-base font-semibold text-white mb-4">Token Details</h3>
                          <div className="space-y-3">
                            {message.tokenData.image && (
                              <div className="flex justify-center mb-3">
                                <img 
                                  src={message.tokenData.image} 
                                  alt="Token preview" 
                                  className="w-32 h-32 rounded-xl object-cover border-2 border-gray-700"
                                />
                              </div>
                            )}
                            <div className="bg-gray-900/50 rounded-lg p-3">
                              <div className="space-y-2">
                                <div>
                                  <span className="text-xs text-gray-400 uppercase tracking-wide">Token Name</span>
                                  <p className="text-lg font-semibold text-white mt-1">{message.tokenData.name || 'N/A'}</p>
                                </div>
                                <div>
                                  <span className="text-xs text-gray-400 uppercase tracking-wide">Symbol</span>
                                  <p className="text-xl font-bold text-blue-400 mt-1">${message.tokenData.symbol || 'N/A'}</p>
                                </div>
                                {message.tokenData.description && (
                                  <div>
                                    <span className="text-xs text-gray-400 uppercase tracking-wide">Description</span>
                                    <p className="text-sm text-gray-300 mt-1 leading-relaxed">{message.tokenData.description}</p>
                                  </div>
                                )}
                                <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-gray-700">
                                  <div>
                                    <span className="text-xs text-gray-400">Supply</span>
                                    <p className="text-sm font-medium text-gray-300">{message.tokenData.totalSupply || '1,000,000,000'}</p>
                                  </div>
                                  <div>
                                    <span className="text-xs text-gray-400">Decimals</span>
                                    <p className="text-sm font-medium text-gray-300">{message.tokenData.decimals || 9}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex justify-center mt-4">
                            <button
                              onClick={() => handleDeploy(message.tokenData!)}
                              disabled={!connected || !message.tokenData?.name || !message.tokenData?.symbol}
                              className="bg-white hover:opacity-90 disabled:bg-white/20 disabled:cursor-not-allowed text-black disabled:text-white/60 font-medium py-2 px-6 rounded-xl transition-opacity flex items-center gap-2 justify-center"
                            >
                              {!connected ? (
                                <span>Connect Wallet</span>
                              ) : (
                                <span>Cook it! ??</span>
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-gray-800 rounded-xl p-4">
                        <div className="flex items-center gap-2">
                          <div className="spinner-dark w-4 h-4" />
                          <span className="text-gray-400 text-sm">Cookon AI is thinking...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="border-t border-gray-800 p-4">
                  <div className="flex gap-2">
                    <textarea
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Tell me your memecoin idea or ask me to come up with something new..."
                      className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-600 transition-colors resize-none text-sm"
                      rows={2}
                      disabled={isLoading}
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!inputMessage.trim() || isLoading}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 rounded-xl transition-colors"
                    >
                      {isLoading ? (
                        <div className="spinner-dark w-5 h-5" />
                      ) : (
                        'Send'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto">
              <DeploymentStatus 
                step={step}
                deployedAddress={deployedAddress}
                onReset={handleReset}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}



