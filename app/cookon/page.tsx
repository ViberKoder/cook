'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useTonConnect } from '@/hooks/useTonConnect';
import { sendGrokChatRequest, parseMemecoinSuggestion, GrokChatMessage, MemecoinSuggestion } from '@/lib/grokApi';
import { deployJettonMinter } from '@/lib/deploy';
import { TokenData } from '@/components/TokenForm';
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
      content: 'РџСЂРёРІРµС‚! РЇ Grok AI, СЌРєСЃРїРµСЂС‚ РїРѕ СЃРѕР·РґР°РЅРёСЋ РјРµРјРєРѕРёРЅРѕРІ! рџљЂ\n\nР”Р°РІР°Р№ РІРјРµСЃС‚Рµ РїСЂРёРґСѓРјР°РµРј РєСЂСѓС‚РѕР№ РјРµРјРєРѕРёРЅ! Р Р°СЃСЃРєР°Р¶Рё РјРЅРµ Рѕ СЃРІРѕРµР№ РёРґРµРµ - С‡С‚Рѕ С‚РµР±СЏ РІРґРѕС…РЅРѕРІР»СЏРµС‚? РњРѕР¶РµС‚ Р±С‹С‚СЊ СЌС‚Рѕ РјРµРј, Р¶РёРІРѕС‚РЅРѕРµ, РёРЅС‚РµСЂРЅРµС‚-РєСѓР»СЊС‚СѓСЂР° РёР»Рё С‡С‚Рѕ-С‚Рѕ СЃРѕРІСЃРµРј Р±РµР·СѓРјРЅРѕРµ?\n\nРЇ РїРѕРјРѕРіСѓ С‚РµР±Рµ:\n- РџСЂРёРґСѓРјР°С‚СЊ РЅР°Р·РІР°РЅРёРµ Рё СЃРёРјРІРѕР»\n- РћРїРёСЃР°С‚СЊ РєРѕРЅС†РµРїС†РёСЋ\n- РџРѕРґРѕР±СЂР°С‚СЊ СЃСѓРїР»Р°Р№\n- РЎРѕР·РґР°С‚СЊ РѕРїРёСЃР°РЅРёРµ РґР»СЏ С‚РѕРєРµРЅР°\n\nРќР°С‡РЅРё СЃ С‚РѕРіРѕ, С‡С‚Рѕ С‚РµР±Рµ РЅСЂР°РІРёС‚СЃСЏ!',
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [tokenSuggestion, setTokenSuggestion] = useState<TokenSuggestion>({});
  const [showDeployForm, setShowDeployForm] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
      const chatMessages: GrokChatMessage[] = [
        ...messages.map(m => ({
          role: m.role === 'user' ? 'user' as const : 'assistant' as const,
          content: m.content,
        })),
        {
          role: 'user',
          content: currentInput,
        },
      ];

      const response = await sendGrokChatRequest(chatMessages, 0.7);
      const aiResponse = response.choices?.[0]?.message?.content || 'РР·РІРёРЅРёС‚Рµ, РЅРµ РїРѕР»СѓС‡РёР»РѕСЃСЊ РїРѕР»СѓС‡РёС‚СЊ РѕС‚РІРµС‚ РѕС‚ AI.';
      const suggestion = parseMemecoinSuggestion(aiResponse);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      if (suggestion.name || suggestion.symbol) {
        const updatedSuggestion: TokenSuggestion = {
          name: suggestion.name,
          symbol: suggestion.symbol,
          description: suggestion.description,
          image: suggestion.image,
          totalSupply: suggestion.supply,
        };
        setTokenSuggestion(prev => ({ ...prev, ...updatedSuggestion }));
      }

      if (suggestion.name && suggestion.symbol && suggestion.supply) {
        setShowDeployForm(true);
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error(error.message || 'Failed to send message to AI');
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'РР·РІРёРЅРёС‚Рµ, РїСЂРѕРёР·РѕС€Р»Р° РѕС€РёР±РєР° РїСЂРё РѕР±СЂР°С‰РµРЅРёРё Рє AI. РџРѕРїСЂРѕР±СѓР№С‚Рµ РµС‰Рµ СЂР°Р·.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCookIt = async () => {
    if (!connected || !wallet) {
      toast.error('РџРѕРґРєР»СЋС‡РёС‚Рµ РєРѕС€РµР»РµРє, С‡С‚РѕР±С‹ Р·Р°РґРµРїР»РѕРёС‚СЊ С‚РѕРєРµРЅ');
      return;
    }

    if (!tokenSuggestion.name || !tokenSuggestion.symbol || !tokenSuggestion.totalSupply) {
      toast.error('Р—Р°РїРѕР»РЅРёС‚Рµ РІСЃРµ РїРѕР»СЏ С‚РѕРєРµРЅР°');
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
          content: `рџЋ‰ РћС‚Р»РёС‡РЅРѕ! РўРІРѕР№ С‚РѕРєРµРЅ ${tokenSuggestion.name} (${tokenSuggestion.symbol}) СѓСЃРїРµС€РЅРѕ СЃРѕР·РґР°РЅ!\n\nРђРґСЂРµСЃ РєРѕРЅС‚СЂР°РєС‚Р°: ${result.address}\n\nРўРµРїРµСЂСЊ С‚С‹ РјРѕР¶РµС€СЊ С‚РѕСЂРіРѕРІР°С‚СЊ РёРј РЅР° DEX!`,
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
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-1/4 w-[600px] h-[600px] bg-gradient-to-br from-orange-500/30 to-yellow-500/20 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-gradient-to-br from-orange-400/25 to-amber-500/15 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/3 w-[550px] h-[550px] bg-gradient-to-br from-yellow-500/20 to-orange-400/25 rounded-full blur-3xl" />
      </div>

      <Header />

      <main className="flex-grow relative z-10 pt-24 pb-12 px-4">
        <div className="max-w-6xl mx-auto">
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
              AI РґРµРїР»РѕРµСЂ РјРµРјРєРѕРёРЅРѕРІ РЅР° TON! РћР±С‰Р°Р№СЃСЏ СЃ Grok AI, РїРѕР»СѓС‡Р°Р№ РёРґРµРё РґР»СЏ РјРµРјРєРѕРёРЅРѕРІ Рё СЃРѕР·РґР°РІР°Р№ С‚РѕРєРµРЅС‹ РѕРґРЅРёРј РєР»РёРєРѕРј! рџљЂ
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                          <span className="text-cook-text-secondary">AI РґСѓРјР°РµС‚...</span>
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
                      placeholder="Р Р°СЃСЃРєР°Р¶Рё Рѕ СЃРІРѕРµР№ РёРґРµРµ РјРµРјРєРѕРёРЅР°..."
                      className="flex-1 input-ton resize-none"
                      rows={2}
                      disabled={isLoading}
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!inputMessage.trim() || isLoading}
                      className="btn-cook px-6"
                    >
                      Send
                    </button>
                  </div>
                </div>
              </div>
            </div>

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
                    {connected && wallet ? (
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
                          'рџЌі Cook it!'
                        )}
                      </button>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-sm text-cook-text-secondary">РџРѕРґРєР»СЋС‡РёС‚Рµ РєРѕС€РµР»РµРє РґР»СЏ РґРµРїР»РѕСЏ</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-cook-text-secondary">
                    <p>РћР±С‰Р°Р№СЃСЏ СЃ AI, С‡С‚РѕР±С‹ РїРѕР»СѓС‡РёС‚СЊ РїСЂРµРґР»РѕР¶РµРЅРёСЏ РїРѕ С‚РѕРєРµРЅСѓ</p>
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