'use client';

import React, { useState, useEffect, useRef } from 'react';
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

// Helper function to format memecoin responses with better structure
const formatMemecoinResponse = (content: string): string => {
  // Check if content follows the structured format
  const nameMatch = content.match(/Name:\s*(.+)/i);
  const symbolMatch = content.match(/Symbol:\s*(.+)/i);
  const supplyMatch = content.match(/Supply:\s*(.+)/i);
  const descriptionMatch = content.match(/Description:\s*([\s\S]+?)(?=\nImage:|$)/i);
  const imageMatch = content.match(/Image:\s*(.+)/i);
  
  if (nameMatch && symbolMatch && supplyMatch && descriptionMatch) {
    // Format as structured response
    let formatted = '🎯 **MEMECOIN CONCEPT**\n\n';
    formatted += `**Name:** ${nameMatch[1].trim()}\n`;
    formatted += `**Symbol:** ${symbolMatch[1].trim()}\n`;
    formatted += `**Supply:** ${supplyMatch[1].trim()}\n`;
    formatted += `\n**Description:**\n${descriptionMatch[1].trim()}\n`;
    if (imageMatch) {
      formatted += `\n**Image:** ${imageMatch[1].trim()}\n`;
    }
    return formatted;
  }
  
  return content;
};

export default function CookonPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: `Hello! I'm Grok, your AI memecoin creator! 🚀\n\nI specialize in creating compelling memecoin narratives and token concepts for The Open Network (TON) blockchain.\n\nTell me your idea, theme, or concept, and I'll help you create a complete memecoin concept with:\n• Name and Symbol\n• Supply\n• Detailed Description\n• Image suggestions\n\nWhat memecoin idea would you like to explore?`,
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get response');
      }

      const data = await response.json();

      const rawContent = data.content || 'No response from AI';
      const formattedContent = formatMemecoinResponse(rawContent);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: formattedContent,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error(error.message || 'Failed to send message to AI');
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, an error occurred while contacting AI. Please try again.',
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
        content: `Hello! I'm Grok, your AI memecoin creator! 🚀\n\nI specialize in creating compelling memecoin narratives and token concepts for The Open Network (TON) blockchain.\n\nTell me your idea, theme, or concept, and I'll help you create a complete memecoin concept with:\n• Name and Symbol\n• Supply\n• Detailed Description\n• Image suggestions\n\nWhat memecoin idea would you like to explore?`,
        timestamp: new Date(),
      },
    ]);
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
              Chat with Grok 4 - your AI assistant for creating memecoins on TON blockchain! 🚀
            </p>
          </div>

          <div className="card">
            <div className="flex justify-between items-center mb-4 pb-4 border-b border-cook-border">
              <h2 className="text-xl font-bold text-cook-text">Chat with Grok</h2>
              <button
                onClick={handleClearChat}
                className="text-sm text-cook-text-secondary hover:text-cook-orange transition-colors"
              >
                Clear chat
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
                        <span className="text-cook-text-secondary">Grok is thinking...</span>
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
                    placeholder="Type your message..."
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
                      'Send'
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

