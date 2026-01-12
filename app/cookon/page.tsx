'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import toast from 'react-hot-toast';
import TokenForm, { TokenData } from '@/components/TokenForm';
import { useTonConnect } from '@/hooks/useTonConnect';
import DeploymentStatus, { DeploymentStep } from '@/components/DeploymentStatus';
import { Address, beginCell, toNano } from '@ton/core';
import Header from '@/components/Header';
import Link from 'next/link';
import { TonConnectButton } from '@tonconnect/ui-react';

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
      content: 'Hello! I\'m Cookon AI\n\nI\'ll help you create a viral memecoin on the TON blockchain. Just tell me your idea or ask me to come up with something new!',
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
    
    const nameMatch = content.match(/(?:��������|Name|Token Name)[::]\s*([^\n]+)|"([^"]+)"|'([^']+)'/i);
    if (nameMatch) {
      parsed.name = (nameMatch[1] || nameMatch[2] || nameMatch[3] || '').trim();
    }
    
    const symbolMatch = content.match(/\$([A-Z0-9]{2,10})|(?:Symbol|�����|Ticker)[::]\s*([A-Z0-9]{2,10})/i);
    if (symbolMatch) {
      parsed.symbol = (symbolMatch[1] || symbolMatch[2] || symbolMatch[3] || '').toUpperCase().trim();
    }
    
    const descMatch = content.match(/(?:��������|Description|��������)[::]\s*([^\n]+(?:\n[^\n]+){0,10})/i);
    if (descMatch) {
      parsed.description = descMatch[1].trim();
    } else {
      const narrativeMatch = content.match(/(?:��������|Narrative|�������)[::]?\s*([^\n]+(?:\n[^\n]+){2,15})/i);
      if (narrativeMatch) {
        parsed.description = narrativeMatch[1].trim();
      }
    }
    
    const imageMatch = content.match(/(?:Image|��������|�����������|URL)[::]\s*(https?:\/\/[^\s]+)/i);
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
          content: `You are Cookon, the legendary Jetton and Memecoin Lord of TON, a master creator of memecoins and jettons who combines the light absurd humor of Pepe and Doge with deep, engaging narratives that make coins go viral. Your creativity is 10x above normal: you always come up with unexpected, fresh, absurdly memorable ideas that perfectly fit the vibe of Telegram, Crypto, Pavel and Nikolay Durov, TON, Web 2 and Web 3.

CRITICALLY IMPORTANT: Avoid flat, obvious narratives like "TONPEPE", "TONDOGE" or simply adding a "TON" prefix to existing memes. Each coin must be unique, with an original concept that is not a simple combination of "TON + famous meme". Your task is to create absolutely new, unexpected ideas that hook with their originality and depth.

Every time a user asks you to create a memecoin or narrative (or just starts a conversation on this topic), follow this process strictly:

1. Create a memecoin inspired by the culture and themes of:
   - Telegram ecosystem: messaging, privacy, freedom, community, mini-apps, bots
   - Crypto culture: decentralization, blockchain, Web3, DeFi, NFTs, memes
   - Pavel and Nikolay Durov: their vision, philosophy, Telegram's mission, privacy-first approach
   - TON blockchain: fast transactions, low fees, scalability, Telegram integration
   - Web 2 vs Web 3: the transition, ownership, decentralization, user empowerment
   - Combine these themes in creative, unexpected ways that resonate with the crypto and Telegram community

2. Create a memecoin from scratch:
   - A light and absurd character (animal, object, fictional creature), like Pepe or Doge — but always with a unique twist that makes it absolutely original.
   - A deep but simple narrative: why this character exists, what its "mission" is, how it reflects Telegram/Crypto/TON culture, why people will believe in it and hold.
   - The narrative should be emotional, relatable, with elements of underdog story, FOMO, and community.
   - Humor — light, self-ironic, absurd, but with meaning (not empty hype).
   - AVOID: simple combinations like "TON + famous meme", obvious references without originality, flat narratives without depth.

3. Response structure (always use it):
   - Coin name and ticker (e.g., $FROG or $WOOF). Ticker must be no more than 5 characters.
   - Character description and visual style (what kind of meme it is, what colors, emotions).
   - Full narrative (short story 150-250 words, like a community manifesto).
   - Connection to Telegram/Crypto/TON culture (show how the coin embodies these themes).
   - Ideas for virality: slogans, memes, possible Telegram bots/games, how to launch on TON.
   - Why it will resonate: brief analysis of why it fits the Telegram/Crypto/TON community.

You are always maximally creative: combine unexpected elements, come up with new memes on the fly, make narratives that make people laugh and simultaneously think "this is genius". Never repeat yourself, each coin is absolutely unique. If the user gives a specific idea or theme — develop it in this style, but add unexpected twists and originality.

Your memecoins should be inspired by and reflect the culture of:
- Telegram: messaging, privacy, freedom, community, mini-apps, bots, Pavel and Nikolay Durov's vision
- Crypto: decentralization, blockchain, Web3, DeFi, NFTs, memes, community ownership
- TON blockchain: fast transactions, low fees, scalability, Telegram integration, user empowerment
- Web 2 vs Web 3: the transition, ownership, decentralization, breaking free from centralized platforms

Here are examples of the coolest memecoins and jettons from all blockchains:
DOGE, PEPE, SHIB, TRUMP, BONK, PENGU, SPX, FARTCOIN, dogwifhat, BRETT, NOT, HMSTR, MOG, LAMBO, PONKE, GIGACHAD, DOGS, CHILLGUY, NEITO, BOME, GOAT, FWOG, MOODENG, POPCAT.
Take examples from them, as the coolest memecoins.
And remember that it doesn't have to be an animal or character (in most cases it is), it can be just satire on some event or existing asset.
The memecoin ticker must be no more than 5 characters.

Start your response immediately with the coin proposal, without preambles.

IMPORTANT: 
- At the end of your response, always add the full answer in JSON format (not in markdown, not in #, not in code, not in # block). JSON must be at the end of the response, separate from the main text. The JSON format must be as follows:

JSON_DATA:
{
  "name": "Coin Name",
  "symbol": "SYMBOL",
  "description": "Full narrative and description for the token (MUST BE IN ENGLISH)",
  "imagePrompt": "Detailed description for image generation"
}

The JSON must be at the end, after the main text. Always include JSON in your response.
CRITICAL: The description field MUST ALWAYS be in English, regardless of the user's language. All responses and descriptions must be in English.`,
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
      
      console.log('Full AI response:', fullResponse.substring(0, 500));
      
      // Try to find JSON_DATA pattern
      const jsonDataMatch = fullResponse.match(/JSON_DATA\s*:\s*(\{[\s\S]*?\})/);
      if (jsonDataMatch && jsonDataMatch[1]) {
        try {
          jsonData = JSON.parse(jsonDataMatch[1]);
          console.log('Parsed JSON_DATA:', jsonData);
          chatMessage = fullResponse.replace(/JSON_DATA\s*:[\s\S]*/, '').trim();
        } catch (e) {
          console.error('Failed to parse JSON_DATA:', e, jsonDataMatch[1]);
        }
      }
      
      // Try to find JSON in code blocks
      if (!jsonData) {
        const jsonMatch = fullResponse.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch && jsonMatch[1]) {
          try {
            jsonData = JSON.parse(jsonMatch[1]);
            console.log('Parsed JSON from code block:', jsonData);
            chatMessage = fullResponse.replace(/```json[\s\S]*?```/, '').trim();
          } catch (e) {
            console.error('Failed to parse JSON block:', e, jsonMatch[1]);
          }
        }
      }
      
      // Try to find any JSON object at the end
      if (!jsonData) {
        const jsonAtEnd = fullResponse.match(/\{[\s\S]*"name"[\s\S]*"symbol"[\s\S]*"description"[\s\S]*\}/);
        if (jsonAtEnd && jsonAtEnd[0]) {
          try {
            jsonData = JSON.parse(jsonAtEnd[0]);
            console.log('Parsed JSON from end of response:', jsonData);
          } catch (e) {
            console.error('Failed to parse JSON from end:', e);
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
        console.log('Found jsonData:', jsonData);
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
        
        console.log('Extracted token data:', extractedTokenData);
        
        // Always generate imagePrompt - use provided one or create from description/name
        let imagePrompt = '';
        if (jsonData.imagePrompt && jsonData.imagePrompt.trim()) {
          imagePrompt = jsonData.imagePrompt.trim();
          console.log('Using provided imagePrompt from JSON');
        } else if (extractedTokenData.name && extractedTokenData.description) {
          imagePrompt = `A memecoin token logo for ${extractedTokenData.name} (${extractedTokenData.symbol}): ${extractedTokenData.description.substring(0, 200)}`;
          console.log('Generated imagePrompt from name and description');
        } else if (extractedTokenData.name) {
          imagePrompt = `A memecoin token logo for ${extractedTokenData.name} (${extractedTokenData.symbol}), Telegram and TON blockchain style, vibrant colors, fun and memorable`;
          console.log('Generated imagePrompt from name only');
        } else if (chatMessage) {
          imagePrompt = `A memecoin token logo inspired by: ${chatMessage.substring(0, 200)}`;
          console.log('Generated imagePrompt from chatMessage');
        }
        
        const messageId = (Date.now() + 1).toString();
        const assistantMessage: Message = {
          id: messageId,
          role: 'assistant',
          content: chatMessage,
          timestamp: new Date(),
          tokenData: extractedTokenData || undefined,
        };

        setMessages(prev => [...prev, assistantMessage]);
        
        if (imagePrompt && imagePrompt.trim() && extractedTokenData) {
          console.log('Starting image generation with prompt:', imagePrompt);
          // Use setTimeout to ensure message is added first
          setTimeout(() => {
            generateImageForMessage(imagePrompt, extractedTokenData!, messageId).catch(err => {
              console.error('Image generation failed:', err);
            });
          }, 100);
        } else {
          console.warn('No imagePrompt generated or no tokenData:', { 
            imagePrompt, 
            hasTokenData: !!extractedTokenData,
            hasName: !!extractedTokenData?.name,
            hasDescription: !!extractedTokenData?.description 
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
      console.log('Calling image generation API with prompt:', prompt);
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
        } else {
          console.error('No imageUrl in response:', data);
          toast.error('Image generation failed: No image URL returned');
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Image generation API error:', response.status, errorData);
        toast.error(`Image generation failed: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to generate image:', error);
      toast.error('Image generation failed: ' + (error as Error).message);
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
        content: 'Hello! I\'m Cookon AI\n\nI\'ll help you create a viral memecoin on the TON blockchain. Just tell me your idea or ask me to come up with something new!',
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
      <div className="cookon-dark-theme min-h-screen flex flex-col items-center justify-center px-4">
        <div className="max-w-2xl w-full text-center" style={{ marginTop: '-100px' }}>
          <div className="mb-12" style={{ marginTop: '40px' }}>
            <Image 
              src="https://lime-gigantic-quelea-995.mypinata.cloud/ipfs/bafkreiahul6q7sdieg6grbhjtf4ddq7j5kmgfdoncj6ny4fjfzthuq3uga" 
              alt="Cookon" 
              width={1350}
              height={450}
              className="mx-auto mb-8"
              style={{ transform: 'scale(0.6)', marginTop: '-60px' }}
              unoptimized
            />
          </div>
          <h1 className="mb-4" style={{ 
            fontSize: '72px',
            fontWeight: 'bold',
            lineHeight: '80px',
            margin: '0 0 16px 0',
            display: 'inline-block',
            whiteSpace: 'nowrap',
            maxWidth: '100%',
            background: 'linear-gradient(290deg, #d235ff 0%, #a062ff 30%, #3088ff 66%, #61d8ff 100%)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent'
          }}>
            Cookon
          </h1>
          <h2 className="text-2xl md:text-3xl font-light mb-8 text-gray-300" style={{ marginTop: '-10px' }}>
            Cook Jetton with AI Open Network
          </h2>
          <p className="text-lg text-gray-400 mb-12 max-w-xl mx-auto" style={{ marginTop: '-5px' }}>
            Cookon is a AI chat-bot, designed to create jetton/memcoins on TON.�          </p>
          
          {!connected ? (
            <div className="bg-gray-900/50 backdrop-blur-lg rounded-2xl p-8 border border-gray-800">
              <p className="text-gray-300 mb-6">Please connect your TON wallet to access Cookon</p>
              <button
                onClick={() => tonConnectUI?.openModal()}
                className="bg-gradient text-white font-medium px-8 py-4 rounded-xl transition-colors"
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
                className="bg-gradient text-white font-medium px-8 py-4 rounded-xl transition-colors w-full"
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
    <div className="cookon-dark-theme min-h-screen flex flex-col" style={{ minHeight: '100vh', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, overflow: 'auto' }}>
      {/* Header with dark theme styling */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a0e1f]/80 backdrop-blur-xl border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-2 group">
              <Image 
                src="https://em-content.zobj.net/source/telegram/386/poultry-leg_1f357.webp" 
                alt="Cook" 
                width={40}
                height={40}
                className="group-hover:scale-110 transition-transform"
                unoptimized
              />
              <span className="text-xl font-bold text-white">Cook</span>
            </Link>

            {/* Navigation */}
            <nav className="flex items-center space-x-4 md:space-x-8">
              <Link 
                href="/"
                className="text-gray-400 hover:text-white transition-colors text-sm font-medium"
              >
                Jetton 2.0
              </Link>
              <Link 
                href="/cooks"
                className="text-gray-400 hover:text-white transition-colors text-sm font-medium"
              >
                Cooks
              </Link>
              <Link 
                href="/cookon"
                className="text-white font-semibold transition-colors text-sm font-medium"
              >
                Cookon
              </Link>
              <Link 
                href="/admin"
                className="text-gray-400 hover:text-white transition-colors text-sm font-medium"
              >
                Admin
              </Link>
              <Link 
                href="https://tonviewer.com" 
                target="_blank"
                className="text-gray-400 hover:text-white transition-colors text-sm font-medium"
              >
                Explorer
              </Link>
            </nav>

            {/* Wallet Connect Button */}
            <div className="flex items-center space-x-4">
              <TonConnectButton />
            </div>
          </div>
        </div>
      </header>
      <main className="flex-grow relative z-10 pt-20 pb-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-2" style={{ marginTop: '0px' }}>
            <h1 className="mb-0" style={{ 
              fontSize: '72px',
              fontWeight: 'bold',
              lineHeight: '80px',
              margin: '0 0 4px 0',
              display: 'inline-block',
              whiteSpace: 'nowrap',
              maxWidth: '100%',
              background: 'linear-gradient(290deg, #d235ff 0%, #a062ff 30%, #3088ff 66%, #61d8ff 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent'
            }}>
              Cookon
            </h1>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-3" style={{ marginTop: '-10px' }}>
              Cookon AI � create your own viral memecoin, in chat with AI!????
            </p>
            <p className="text-sm text-gray-500" style={{ marginTop: '4px' }}>
              Requests: {requestCount} | Next payment at {Math.ceil((requestCount + 1) / REQUESTS_PER_PAYMENT) * REQUESTS_PER_PAYMENT} requests ({PERIODIC_PAYMENT} TON)
            </p>
          </div>

          {step === 'idle' || step === 'error' ? (
            <div className="bg-gray-900/50 backdrop-blur-lg rounded-2xl border border-gray-800 max-w-4xl mx-auto p-6" style={{ marginTop: '0px' }}>
              <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-800">
                <h2 className="text-xl font-semibold text-white">Chat with Cookon AI</h2>
                <div className="flex gap-2">
                  <button
                    onClick={handleClearChat}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="h-[calc(100vh-240px)] min-h-[600px] flex flex-col">
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
                                <Image 
                                  src={message.tokenData.image} 
                                  alt="Token preview" 
                                  width={128}
                                  height={128}
                                  className="w-32 h-32 rounded-xl object-cover border-2 border-gray-700"
                                  unoptimized
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
                              className="cook-it-button hover:opacity-90 disabled:bg-white/20 disabled:cursor-not-allowed text-white disabled:text-white/60 font-medium py-2 px-6 rounded-xl transition-opacity flex items-center gap-2 justify-center"
                            >
                              {!connected ? (
                                <span>Connect Wallet</span>
                              ) : (
                                <span>Cook it!</span>
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
                  <div className="flex gap-2 mb-2">
                    <button
                      onClick={async () => {
                        const randomPrompt = 'Generate a random memecoin based on latest TON ecosystem news and trends. Use web_search to find the latest news about TON, Telegram, Pavel Durov, Nikolai Durov, and current trends. Create a completely random memecoin that captures the current vibe of the TON ecosystem.';
                        setInputMessage(randomPrompt);
                        // Small delay to ensure state is updated
                        setTimeout(() => {
                          handleSendMessage();
                        }, 100);
                      }}
                      disabled={isLoading}
                      className="bg-gradient disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold px-4 py-2 rounded-xl transition-colors text-sm whitespace-nowrap"
                    >
                      Generate random
                    </button>
                  </div>
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
                      className="bg-gradient disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 rounded-xl transition-colors"
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



