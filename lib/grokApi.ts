// Grok XAI API Integration
// Based on https://api.x.ai/v1/chat/completions

const GROK_API_BASE = 'https://api.x.ai/v1';
// API key - must be set in environment variable NEXT_PUBLIC_XAI_API_KEY
// For development, set it in .env.local file
const GROK_API_KEY = process.env.NEXT_PUBLIC_XAI_API_KEY || '';

export interface GrokChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GrokChatRequest {
  model?: string;
  messages: GrokChatMessage[];
  stream?: boolean;
  temperature?: number;
}

export interface GrokChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// System prompt for memecoin ideas
const MEMECOIN_SYSTEM_PROMPT = `You are an expert memecoin creator and advisor. Your role is to help users create fun, engaging, and potentially viral memecoin ideas.

When suggesting memecoin ideas, always respond in this exact format:
Name: [Token Name]
Symbol: [Token Symbol (3-5 letters, uppercase)]
Supply: [Total Supply Number]
Description: [A creative, engaging description that explains the meme concept, what makes it unique, why it could be viral, and what community it targets. Be specific and exciting!]
Image: [Brief description of what the token image/logo should look like]

Key principles for memecoin creation:
1. Memes should be relatable, funny, or culturally relevant
2. Names should be catchy and memorable
3. Descriptions should explain the meme concept clearly
4. Think about what makes a memecoin go viral - humor, community, timing, or cultural relevance
5. Be creative but also practical
6. Consider different meme categories: animals, internet culture, pop culture, absurd humor, etc.

Always provide creative, engaging suggestions that could actually work as memecoins.`;

// Send chat completion request to Grok XAI
export async function sendGrokChatRequest(
  messages: GrokChatMessage[],
  temperature: number = 0.7
): Promise<GrokChatResponse> {
  if (!GROK_API_KEY) {
    throw new Error('XAI API key is not configured. Please set NEXT_PUBLIC_XAI_API_KEY environment variable.');
  }

  // Add system prompt if not already present
  const messagesWithSystem = messages.some(m => m.role === 'system')
    ? messages
    : [
        { role: 'system' as const, content: MEMECOIN_SYSTEM_PROMPT },
        ...messages
      ];

  const request: GrokChatRequest = {
    model: 'grok-2-1212', // or 'grok-beta' for latest
    messages: messagesWithSystem,
    stream: false,
    temperature,
  };

  try {
    const response = await fetch(`${GROK_API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROK_API_KEY}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Grok API error:', response.status, errorText);
      throw new Error(`Grok API error: ${response.status} ${errorText}`);
    }

    const data: GrokChatResponse = await response.json();
    return data;
  } catch (error: any) {
    console.error('Error sending Grok chat request:', error);
    throw error;
  }
}

// Parse memecoin suggestion from AI response
export interface MemecoinSuggestion {
  name?: string;
  symbol?: string;
  supply?: string;
  description?: string;
  image?: string;
}

export function parseMemecoinSuggestion(content: string): MemecoinSuggestion {
  const suggestion: MemecoinSuggestion = {};

  // Extract Name
  const nameMatch = content.match(/Name:\s*(.+?)(?:\n|$)/i);
  if (nameMatch) {
    suggestion.name = nameMatch[1].trim();
  }

  // Extract Symbol
  const symbolMatch = content.match(/Symbol:\s*(.+?)(?:\n|$)/i);
  if (symbolMatch) {
    suggestion.symbol = symbolMatch[1].trim();
  }

  // Extract Supply
  const supplyMatch = content.match(/Supply:\s*(.+?)(?:\n|$)/i);
  if (supplyMatch) {
    suggestion.supply = supplyMatch[1].trim().replace(/,/g, '');
  }

  // Extract Description (can be multiline)
  const descMatch = content.match(/Description:\s*([\s\S]+?)(?:\nImage:|$)/i);
  if (descMatch) {
    suggestion.description = descMatch[1].trim();
  }

  // Extract Image
  const imageMatch = content.match(/Image:\s*(.+?)(?:\n|$)/i);
  if (imageMatch) {
    suggestion.image = imageMatch[1].trim();
  }

  return suggestion;
}

