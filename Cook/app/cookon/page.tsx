'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import toast from 'react-hot-toast';
import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { beginCell, toNano } from '@ton/core';
import { Address } from '@ton/core';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

// Payment wallet address
const PAYMENT_WALLET = 'UQDjQOdWTP1bPpGpYExAsCcVLGPN_pzGvdno3aCk565ZnQIz';
const INITIAL_PAYMENT = 0.3; // TON
const PERIODIC_PAYMENT = 0.2; // TON
const REQUESTS_PER_PAYMENT = 10;

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
    let formatted = '?? **MEMECOIN CONCEPT**\n\n';
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
  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: `Hello! I'm Grok, your AI memecoin creator! ??\n\nI specialize in creating compelling memecoin narratives and token concepts for The Open Network (TON) blockchain.\n\nTell me your idea, theme, or concept, and I'll help you create a complete memecoin concept with:\n Name and Symbol\n Supply\n Detailed Description\n Image suggestions\n\nWhat memecoin idea would you like to explore?`,
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasPaidInitial, setHasPaidInitial] = useState(false);
  const [requestCount, setRequestCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Check if user has paid initial payment (stored in localStorage)
  useEffect(() => {
    const paid = localStorage.getItem('cookon_initial_payment');
    if (paid === 'true') {
      setHasPaidInitial(true);
    }
    const count = localStorage.getItem('cookon_request_count');
    if (count) {
      setRequestCount(parseInt(count, 10));
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendPayment = async (amount: number, comment: string): Promise<boolean> => {
    if (!wallet) {
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

  const handleInitialPayment = async () => {
    if (!wallet) {
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

  const checkAndProcessPeriodicPayment = async (): Promise<boolean> => {
    const newCount = requestCount + 1;
    setRequestCount(newCount);
    localStorage.setItem('cookon_request_count', newCount.toString());

    if (newCount % REQUESTS_PER_PAYMENT === 0) {
      const success = await sendPayment(PERIODIC_PAYMENT, `Cookon periodic payment - ${newCount} requests`);
      if (!success) {
        return false;
      }
    }
    return true;
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    // Check wallet connection
    if (!wallet) {
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
        content: `Hello! I'm Grok, your AI memecoin creator! ??\n\nI specialize in creating compelling memecoin narratives and token concepts for The Open Network (TON) blockchain.\n\nTell me your idea, theme, or concept, and I'll help you create a complete memecoin concept with:\n Name and Symbol\n Supply\n Detailed Description\n Image suggestions\n\nWhat memecoin idea would you like to explore?`,
        timestamp: new Date(),
      },
    ]);
  };

  const handleMemeRandom = async () => {
    if (!wallet) {
      toast.error('Please connect your TON wallet to use Cookon');
      return;
    }

    if (!hasPaidInitial) {
      toast.error('Please pay the initial access fee of 0.3 TON to use Cookon');
      return;
    }

    const canProceed = await checkAndProcessPeriodicPayment();
    if (!canProceed) {
      return;
    }

    const randomMemeRequest = 'Generate a random memecoin concept with name, symbol, supply, description, and image suggestion.';
    setInputMessage(randomMemeRequest);
    
    // Auto-send after a brief delay
    setTimeout(() => {
      handleSendMessage();
    }, 100);
  };

  const handleCookIt = async () => {
    // This would typically deploy the token, but for now we'll show a message
    if (!wallet) {
      toast.error('Please connect your TON wallet first');
      return;
    }

    // Find the last memecoin concept in messages
    const lastConcept = [...messages].reverse().find(m => 
      m.role === 'assistant' && m.content.includes('MEMECOIN CONCEPT')
    );

    if (!lastConcept) {
      toast.error('Please generate a memecoin concept first by chatting with Grok');
      return;
    }

    toast.success('Token deployment feature coming soon!');
    // TODO: Implement actual token deployment logic
  };

  const isAccessGranted = wallet && hasPaidInitial;

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
              Chat with Grok 4 - your AI assistant for creating memecoins on TON blockchain! ??
            </p>
          </div>

          {!wallet && (
            <div className="card mb-4">
              <div className="text-center p-6">
                <p className="text-cook-text mb-4">Please connect your TON wallet to access Cookon</p>
                <button
                  onClick={() => {
                    if (tonConnectUI) {
                      tonConnectUI.openModal();
                    } else {
                      toast.error('TON Connect is not initialized. Please check your configuration.');
                    }
                  }}
                  className="btn-cook"
                >
                  Connect Wallet
                </button>
              </div>
            </div>
          )}

          {wallet && !hasPaidInitial && (
            <div className="card mb-4">
              <div className="text-center p-6">
                <p className="text-cook-text mb-2">Initial access fee: {INITIAL_PAYMENT} TON</p>
                <p className="text-sm text-cook-text-secondary mb-4">
                  This payment compensates for AI computation costs
                </p>
                <button
                  onClick={handleInitialPayment}
                  className="btn-cook"
                >
                  Pay {INITIAL_PAYMENT} TON to Access
                </button>
              </div>
            </div>
          )}

          {isAccessGranted && (
            <div className="card">
              <div className="flex justify-between items-center mb-4 pb-4 border-b border-cook-border">
                <h2 className="text-xl font-bold text-cook-text">Chat with Grok</h2>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-cook-text-secondary">
                    Requests: {requestCount}
                  </span>
                  <button
                    onClick={handleClearChat}
                    className="text-sm text-cook-text-secondary hover:text-cook-orange transition-colors"
                  >
                    Clear chat
                  </button>
                </div>
              </div>

              <div className="h-[780px] flex flex-col">
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

                <div className="border-t border-cook-border p-4 space-y-3">
                  <div className="flex gap-2">
                    <button
                      onClick={handleMemeRandom}
                      disabled={isLoading}
                      className="btn-cook px-4 flex items-center gap-2"
                    >
                      <Image
                        src="https://em-content.zobj.net/source/telegram/386/question-mark_2753.webp"
                        alt="Random"
                        width={20}
                        height={20}
                        unoptimized
                      />
                      <span>Meme random</span>
                    </button>
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
                  <div className="flex justify-center">
                    <button
                      onClick={handleCookIt}
                      disabled={isLoading}
                      className="btn-cook w-1/2 text-sm"
                      style={{ height: '26.67px' }}
                    >
                      Cook it!
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
