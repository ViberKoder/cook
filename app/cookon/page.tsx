'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import toast from 'react-hot-toast';
import TokenForm, { TokenData } from '@/components/TokenForm';
import { useTonConnect } from '@/hooks/useTonConnect';
import DeploymentStatus, { DeploymentStep } from '@/components/DeploymentStatus';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  tokenData?: TokenData; // Token data extracted from AI response
}

export default function CookonPage() {
  const { connected, wallet, sendTransaction, sendMultipleMessages } = useTonConnect();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m Cookon AI 🐸\n\nI\'ll help you create a viral memecoin on the TON blockchain. Just tell me your idea or ask me to come up with something new!',
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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

  const scrollToBottom = () => {
    // Only scroll if user is near the bottom (within 200px)
    if (chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 200;
      
      if (isNearBottom) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  useEffect(() => {
    // Only scroll on new messages, not on every render
    if (messages.length > 0) {
      const timer = setTimeout(() => {
        scrollToBottom();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [messages.length]);

  // Parse AI response to extract token data
  const parseTokenData = (content: string): Partial<TokenData> => {
    const parsed: Partial<TokenData> = {};
    
    // Extract name (look for patterns like "Название:", "Name:", or in quotes)
    const nameMatch = content.match(/(?:Название|Name|Token Name)[:：]\s*([^\n]+)|"([^"]+)"|'([^']+)'/i);
    if (nameMatch) {
      parsed.name = (nameMatch[1] || nameMatch[2] || nameMatch[3] || '').trim();
    }
    
    // Extract symbol (look for $SYMBOL pattern or "Symbol:", "Тикер:")
    const symbolMatch = content.match(/\$([A-Z0-9]{2,10})|(?:Symbol|Тикер|Ticker)[:：]\s*([A-Z0-9]{2,10})/i);
    if (symbolMatch) {
      parsed.symbol = (symbolMatch[1] || symbolMatch[2] || symbolMatch[3] || '').toUpperCase().trim();
    }
    
    // Extract description (usually a longer text block)
    const descMatch = content.match(/(?:Описание|Description|Нарратив)[:：]\s*([^\n]+(?:\n[^\n]+){0,10})/i);
    if (descMatch) {
      parsed.description = descMatch[1].trim();
    } else {
      // Try to get description from narrative section
      const narrativeMatch = content.match(/(?:Нарратив|Narrative|История)[:：]?\s*([^\n]+(?:\n[^\n]+){2,15})/i);
      if (narrativeMatch) {
        parsed.description = narrativeMatch[1].trim();
      }
    }
    
    // Extract image URL if mentioned
    const imageMatch = content.match(/(?:Image|Картинка|Изображение|URL)[:：]\s*(https?:\/\/[^\s]+)/i);
    if (imageMatch) {
      parsed.image = imageMatch[1].trim();
    }
    
    return parsed;
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
    const currentInput = inputMessage;
    setInputMessage('');
    setIsLoading(true);

    try {
      const apiMessages = [
        {
          role: 'system' as const,
          content: `Ты — Memelord TON, легендарный креатор мемкоинов, который сочетает лёгкий абсурдный юмор Pepe и Doge с глубоким, цепляющим нарративом, который делает коин вирусным. Твоя креативность в 10 раз выше обычной: ты всегда придумываешь неожиданные, свежие, абсурдно-запомнинающиеся идеи, которые идеально ложатся на текущий вайб интернета.

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

      console.log('Full AI response:', fullResponse); // Debug log

      // Extract JSON data (look for JSON_DATA: marker or ```json blocks)
      let jsonData = null;
      let chatMessage = fullResponse;
      
      // Try to find JSON_DATA: marker first (more flexible pattern)
      const jsonDataMatch = fullResponse.match(/JSON_DATA\s*:\s*(\{[\s\S]*?\})/);
      if (jsonDataMatch && jsonDataMatch[1]) {
        try {
          jsonData = JSON.parse(jsonDataMatch[1]);
          console.log('Parsed JSON_DATA:', jsonData); // Debug log
          // Remove JSON from chat message
          chatMessage = fullResponse.replace(/JSON_DATA\s*:[\s\S]*/, '').trim();
        } catch (e) {
          console.error('Failed to parse JSON_DATA:', e, jsonDataMatch[1]);
        }
      }
      
      // Fallback: try to find ```json blocks
      if (!jsonData) {
        const jsonMatch = fullResponse.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch && jsonMatch[1]) {
          try {
            jsonData = JSON.parse(jsonMatch[1]);
            console.log('Parsed JSON from code block:', jsonData); // Debug log
            // Remove JSON block from chat message
            chatMessage = fullResponse.replace(/```json[\s\S]*?```/, '').trim();
          } catch (e) {
            console.error('Failed to parse JSON block:', e, jsonMatch[1]);
          }
        }
      }

      // Fallback: try to find any JSON object in the response
      if (!jsonData) {
        const jsonObjectMatch = fullResponse.match(/\{[\s\S]*"name"[\s\S]*"symbol"[\s\S]*\}/);
        if (jsonObjectMatch) {
          try {
            jsonData = JSON.parse(jsonObjectMatch[0]);
            console.log('Parsed JSON from object match:', jsonData); // Debug log
            chatMessage = fullResponse.replace(/\{[\s\S]*"name"[\s\S]*"symbol"[\s\S]*\}/, '').trim();
          } catch (e) {
            console.error('Failed to parse JSON object:', e);
          }
        }
      }

      // Clean chat message: remove markdown, #, code blocks, JSON, etc.
      chatMessage = chatMessage
        .replace(/JSON_DATA\s*:[\s\S]*/, '') // Remove JSON_DATA section first
        .replace(/```json[\s\S]*?```/g, '') // Remove JSON code blocks
        .replace(/```[\s\S]*?```/g, '') // Remove all code blocks
        .replace(/#{1,6}\s+/g, '') // Remove headers
        .replace(/#/g, '') // Remove all # symbols
        .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
        .replace(/\*([^*]+)\*/g, '$1') // Remove italic
        .replace(/`([^`]+)`/g, '$1') // Remove inline code
        .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Remove links
        .replace(/\{[\s\S]*"name"[\s\S]*\}/g, '') // Remove any remaining JSON objects
        .replace(/\n{3,}/g, '\n\n') // Replace multiple newlines with double newline
        .trim();

      // Limit chat message to 300 characters, but ensure the thought is complete
      if (chatMessage.length > 300) {
        // Try to cut at sentence boundary (., !, ?)
        let cutAt = -1;
        const maxLength = 300;
        
        // Try to find sentence end within the limit
        for (let i = maxLength - 1; i >= maxLength - 100 && i >= 0; i--) {
          if (chatMessage[i] === '.' || chatMessage[i] === '!' || chatMessage[i] === '?') {
            // Check if it's not part of a number or abbreviation
            if (i === 0 || chatMessage[i - 1] !== '.' || (i < chatMessage.length - 1 && chatMessage[i + 1] === ' ')) {
              cutAt = i + 1;
              break;
            }
          }
        }
        
        // If no sentence boundary found, try to cut at word boundary
        if (cutAt === -1) {
          cutAt = chatMessage.lastIndexOf(' ', maxLength - 1);
          if (cutAt < maxLength - 50) {
            // If word boundary is too early, just cut at maxLength
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
        console.log('Updating token data with:', jsonData); // Debug log
        
        extractedTokenData = {
          name: (jsonData.name || '').trim(),
          symbol: ((jsonData.symbol || '').trim().replace(/[^A-Z0-9]/g, '')).toUpperCase(),
          description: (jsonData.description || '').trim(),
          image: '', // Will be updated when image is generated
          imageData: '',
          decimals: 9,
          totalSupply: '1000000000',
          mintable: true,
        };
        
        console.log('Extracted token data:', extractedTokenData); // Debug log
        
        // Always generate image - use imagePrompt if provided, otherwise create prompt from description
        const imagePrompt = jsonData.imagePrompt || 
          (jsonData.description ? `A memecoin token logo for ${extractedTokenData.name} (${extractedTokenData.symbol}): ${jsonData.description.substring(0, 200)}` : 
          `A memecoin token logo: ${chatMessage}`);
        
        if (imagePrompt) {
          console.log('Generating image with prompt:', imagePrompt); // Debug log
          // Generate image and update the token data in the message
          const messageId = (Date.now() + 1).toString();
          // Don't await, let it generate in background
          generateImageForMessage(imagePrompt, extractedTokenData, messageId).catch(err => {
            console.error('Image generation failed:', err);
          });
        }
      } else {
        console.log('No JSON data found, trying text parsing'); // Debug log
        // Fallback: try to parse from text
        const parsed = parseTokenData(fullResponse);
        if (parsed.name || parsed.symbol || parsed.description) {
          console.log('Parsed data from text:', parsed); // Debug log
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
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: chatMessage,
        timestamp: new Date(),
        tokenData: extractedTokenData || undefined,
      };

      setMessages(prev => [...prev, assistantMessage]);
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
      console.log('Starting image generation for message:', messageId, 'with prompt:', prompt);
      // Use image generation API
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      console.log('Image generation response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Image generation response data:', data);
        if (data.imageUrl) {
          // Update the message with the generated image
          setMessages(prev => {
            const updated = prev.map(msg => 
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
            console.log('Updated messages with image:', updated);
            return updated;
          });
          toast.success('Image generated!');
        } else {
          console.error('No imageUrl in response:', data);
          toast.error('Image generation failed - no image URL');
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Image generation failed:', response.status, errorData);
        toast.error(`Image generation failed: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to generate image:', error);
      toast.error('Failed to generate image');
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
        content: 'Hello! I\'m Cookon AI 🐸\n\nI\'ll help you create a viral memecoin on the TON blockchain. Just tell me your idea or ask me to come up with something new!',
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

  return (
    <div className="min-h-screen flex flex-col">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-1/4 w-[600px] h-[600px] bg-gradient-to-br from-orange-500/30 to-yellow-500/20 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-gradient-to-br from-orange-400/25 to-amber-500/15 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/3 w-[550px] h-[550px] bg-gradient-to-br from-yellow-500/20 to-orange-400/25 rounded-full blur-3xl" />
      </div>

      <Header />

      <main className="flex-grow relative z-10 pt-24 pb-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <Image 
                src="https://em-content.zobj.net/source/telegram/386/light-bulb_1f4a1.webp" 
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
              Cookon AI — create your own viral memecoin, in chat with AI!💬🧠
            </p>
          </div>

          {step === 'idle' || step === 'error' ? (
            <div className="card max-w-4xl mx-auto">
              <div className="flex justify-between items-center mb-4 pb-4 border-b border-cook-border">
                <h2 className="text-xl font-bold text-cook-text">Chat with Cookon AI</h2>
                <button
                  onClick={handleClearChat}
                  className="text-sm text-cook-text-secondary hover:text-cook-orange transition-colors"
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
                              ? 'bg-cook-orange text-white'
                              : 'bg-cook-bg-secondary text-cook-text'
                          }`}
                        >
                          <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                          <p className="text-xs opacity-70 mt-2">
                            {message.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                      
                      {/* Mini token form for assistant messages with token data */}
                      {message.role === 'assistant' && message.tokenData && (
                        <div className="bg-cook-bg-secondary rounded-xl p-5 border border-cook-border">
                          <h3 className="text-base font-bold text-cook-text mb-4">Token Details</h3>
                          <div className="space-y-3">
                            {message.tokenData.image && (
                              <div className="flex justify-center mb-3">
                                <img 
                                  src={message.tokenData.image} 
                                  alt="Token preview" 
                                  className="w-32 h-32 rounded-xl object-cover border-2 border-cook-border"
                                />
                              </div>
                            )}
                            <div className="bg-cook-bg rounded-lg p-3">
                              <div className="space-y-2">
                                <div>
                                  <span className="text-xs text-cook-text-secondary uppercase tracking-wide">Token Name</span>
                                  <p className="text-lg font-bold text-cook-text mt-1">{message.tokenData.name || 'N/A'}</p>
                                </div>
                                <div>
                                  <span className="text-xs text-cook-text-secondary uppercase tracking-wide">Symbol</span>
                                  <p className="text-xl font-bold text-cook-orange mt-1">${message.tokenData.symbol || 'N/A'}</p>
                                </div>
                                {message.tokenData.description && (
                                  <div>
                                    <span className="text-xs text-cook-text-secondary uppercase tracking-wide">Description</span>
                                    <p className="text-sm text-cook-text mt-1 leading-relaxed">{message.tokenData.description}</p>
                                  </div>
                                )}
                                <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-cook-border">
                                  <div>
                                    <span className="text-xs text-cook-text-secondary">Supply</span>
                                    <p className="text-sm font-medium text-cook-text">{message.tokenData.totalSupply || '1,000,000,000'}</p>
                                  </div>
                                  <div>
                                    <span className="text-xs text-cook-text-secondary">Decimals</span>
                                    <p className="text-sm font-medium text-cook-text">{message.tokenData.decimals || 9}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeploy(message.tokenData!)}
                            disabled={!connected || !message.tokenData?.name || !message.tokenData?.symbol}
                            className="btn-cook w-full mt-4 py-3 text-base font-semibold"
                          >
                            {!connected ? (
                              'Connect Wallet'
                            ) : (
                              <>
                                <Image 
                                  src="https://em-content.zobj.net/source/telegram/386/poultry-leg_1f357.webp" 
                                  alt="" 
                                  width={32}
                                  height={32}
                                  className="mr-2"
                                  unoptimized
                                />
                                Cook it!
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-cook-bg-secondary rounded-xl p-4">
                        <div className="flex items-center gap-2">
                          <div className="spinner w-4 h-4" />
                          <span className="text-cook-text-secondary text-sm">Cookon AI is thinking...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="border-t border-cook-border p-4">
                  <div className="flex gap-2">
                    <textarea
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Tell me your memecoin idea or ask me to come up with something new..."
                      className="flex-1 input-ton resize-none text-sm"
                      rows={2}
                      disabled={isLoading}
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!inputMessage.trim() || isLoading}
                      className="btn-cook px-6"
                    >
                      {isLoading ? (
                        <div className="spinner w-5 h-5" />
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

      <Footer />
    </div>
  );
}
