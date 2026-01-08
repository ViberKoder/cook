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
}

export default function CookonPage() {
  const { connected, wallet, sendTransaction, sendMultipleMessages } = useTonConnect();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Привет! Я Memelord TON 🐸\n\nЯ помогу тебе создать вирусный мемкоин на блокчейне TON. Просто расскажи мне свою идею или попроси придумать что-то новое!',
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
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

ВАЖНО: После описания мемкоина, всегда добавляй в конце ответа структурированные данные в формате JSON для автоматического заполнения формы:

\`\`\`json
{
  "name": "Название токена",
  "symbol": "SYMBOL",
  "description": "Полное описание и нарратив",
  "imagePrompt": "Детальное описание для генерации изображения"
}
\`\`\`

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
      const aiResponse = data.content || 'No response from AI';

      // Try to parse JSON from response
      const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        try {
          const parsedData = JSON.parse(jsonMatch[1]);
          const updatedData: TokenData = {
            ...tokenData,
            name: parsedData.name || tokenData.name,
            symbol: parsedData.symbol || tokenData.symbol,
            description: parsedData.description || tokenData.description,
          };
          setTokenData(updatedData);
          
          // Generate image if prompt provided
          if (parsedData.imagePrompt) {
            generateImage(parsedData.imagePrompt);
          }
          
          toast.success('Форма автоматически заполнена!');
        } catch (e) {
          console.error('Failed to parse JSON:', e);
        }
      } else {
        // Fallback: try to parse from text
        const parsed = parseTokenData(aiResponse);
        if (parsed.name || parsed.symbol || parsed.description) {
          setTokenData(prev => ({
            ...prev,
            ...parsed,
          }));
          toast.success('Данные извлечены из ответа!');
        }
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error(error.message || 'Failed to send message to AI');
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Извини, произошла ошибка. Попробуй ещё раз.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateImage = async (prompt: string) => {
    try {
      setIsLoading(true);
      // Use image generation API (you'll need to implement this)
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
          setTokenData(prev => ({
            ...prev,
            image: data.imageUrl,
          }));
          toast.success('Изображение сгенерировано!');
        }
      }
    } catch (error) {
      console.error('Failed to generate image:', error);
      toast.error('Не удалось сгенерировать изображение');
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

  const handleClearChat = () => {
    setMessages([
      {
        id: '1',
        role: 'assistant',
        content: 'Привет! Я Memelord TON 🐸\n\nЯ помогу тебе создать вирусный мемкоин на блокчейне TON. Просто расскажи мне свою идею или попроси придумать что-то новое!',
        timestamp: new Date(),
      },
    ]);
    setTokenData({
      name: '',
      symbol: '',
      description: '',
      image: '',
      imageData: '',
      decimals: 9,
      totalSupply: '1000000000',
      mintable: true,
    });
  };

  const handleDeploy = async (data: TokenData) => {
    if (!connected || !wallet) {
      setError('Пожалуйста, подключи кошелёк');
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
              Memelord TON — создай вирусный мемкоин с помощью AI! 🐸🚀
            </p>
          </div>

          {step === 'idle' || step === 'error' ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Chat Section - Left */}
              <div className="card">
                <div className="flex justify-between items-center mb-4 pb-4 border-b border-cook-border">
                  <h2 className="text-xl font-bold text-cook-text">Чат с Memelord TON</h2>
                  <button
                    onClick={handleClearChat}
                    className="text-sm text-cook-text-secondary hover:text-cook-orange transition-colors"
                  >
                    Очистить
                  </button>
                </div>

                <div className="h-[calc(100vh-280px)] min-h-[600px] flex flex-col">
                  <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={chatContainerRef}>
                    {messages.map((message) => (
                      <div
                        key={message.id}
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
                    ))}
                    {isLoading && (
                      <div className="flex justify-start">
                        <div className="bg-cook-bg-secondary rounded-xl p-4">
                          <div className="flex items-center gap-2">
                            <div className="spinner w-4 h-4" />
                            <span className="text-cook-text-secondary text-sm">Memelord думает...</span>
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
                        placeholder="Расскажи идею для мемкоина или попроси придумать что-то новое..."
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
                          'Отправить'
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Token Form Section - Right */}
              <div className="card">
                <h2 className="text-xl font-bold text-cook-text mb-6">Форма токена</h2>
                <TokenForm 
                  onDeploy={handleDeploy} 
                  isConnected={connected}
                  error={error}
                  {...({
                    initialData: tokenData,
                    onDataChange: (data: TokenData) => setTokenData(data),
                  } as Partial<{ initialData: TokenData; onDataChange: (data: TokenData) => void }>)}
                />
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
