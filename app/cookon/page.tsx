'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import toast from 'react-hot-toast';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export default function CookonPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'РџСЂРёРІРµС‚! РЇ Grok, С‚РІРѕР№ AI-РїРѕРјРѕС‰РЅРёРє! рџљЂ\n\nРЇ РјРѕРіСѓ РїРѕРјРѕС‡СЊ С‚РµР±Рµ СЃ СЂР°Р·Р»РёС‡РЅС‹РјРё РІРѕРїСЂРѕСЃР°РјРё, РѕР±СЃСѓРґРёС‚СЊ РёРґРµРё РёР»Рё РїСЂРѕСЃС‚Рѕ РїРѕР±РѕР»С‚Р°С‚СЊ. Р§С‚Рѕ С‚РµР±СЏ РёРЅС‚РµСЂРµСЃСѓРµС‚?',
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [responseId, setResponseId] = useState<string | null>(null);
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
      const apiMessages = [
        ...messages.map(m => ({
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
          responseId: responseId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get response');
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.content || 'РќРµС‚ РѕС‚РІРµС‚Р° РѕС‚ AI',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      if (data.id) {
        setResponseId(data.id);
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
        content: 'РџСЂРёРІРµС‚! РЇ Grok, С‚РІРѕР№ AI-РїРѕРјРѕС‰РЅРёРє! рџљЂ\n\nРЇ РјРѕРіСѓ РїРѕРјРѕС‡СЊ С‚РµР±Рµ СЃ СЂР°Р·Р»РёС‡РЅС‹РјРё РІРѕРїСЂРѕСЃР°РјРё, РѕР±СЃСѓРґРёС‚СЊ РёРґРµРё РёР»Рё РїСЂРѕСЃС‚Рѕ РїРѕР±РѕР»С‚Р°С‚СЊ. Р§С‚Рѕ С‚РµР±СЏ РёРЅС‚РµСЂРµСЃСѓРµС‚?',
        timestamp: new Date(),
      },
    ]);
    setResponseId(null);
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
        <div className="max-w-4xl mx-auto">
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
              Р§Р°С‚ СЃ Grok 4 - С‚РІРѕР№ AI-РїРѕРјРѕС‰РЅРёРє РґР»СЏ СЃРѕР·РґР°РЅРёСЏ РјРµРјРєРѕРёРЅРѕРІ Рё РЅРµ С‚РѕР»СЊРєРѕ! рџљЂ
            </p>
          </div>

          <div className="card">
            <div className="flex justify-between items-center mb-4 pb-4 border-b border-cook-border">
              <h2 className="text-xl font-bold text-cook-text">Р§Р°С‚ СЃ Grok</h2>
              <button
                onClick={handleClearChat}
                className="text-sm text-cook-text-secondary hover:text-cook-orange transition-colors"
              >
                РћС‡РёСЃС‚РёС‚СЊ С‡Р°С‚
              </button>
            </div>

            <div className="h-[600px] flex flex-col">
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
                        <span className="text-cook-text-secondary">Grok РґСѓРјР°РµС‚...</span>
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
                    placeholder="РќР°РїРёС€Рё СЃРѕРѕР±С‰РµРЅРёРµ..."
                    className="flex-1 input-ton resize-none"
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
                      'РћС‚РїСЂР°РІРёС‚СЊ'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}