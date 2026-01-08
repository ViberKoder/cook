import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Get API key from environment variables
// On server side, prefer XAI_API_KEY, fallback to NEXT_PUBLIC_XAI_API_KEY
const getApiKey = () => {
  return process.env.XAI_API_KEY || process.env.NEXT_PUBLIC_XAI_API_KEY || '';
};

const createClient = () => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('XAI API key is not configured. Please set XAI_API_KEY or NEXT_PUBLIC_XAI_API_KEY environment variable.');
  }
  
  return new OpenAI({
    apiKey: apiKey,
    baseURL: 'https://api.x.ai/v1',
    timeout: 360000, // 6 minutes timeout for reasoning models
  });
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, temperature = 0.7 } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    // Create client with API key
    const client = createClient();

    // Use chat/completions API as recommended by xAI
    // Grok-4-latest has built-in web search capabilities for real-time Twitter/news updates
    // Economic settings: max_tokens limits response length, reducing costs
    // Recommended TPM/RPM settings for cost efficiency:
    //   - TPM (Tokens Per Minute): 10000-20000 (standard tier, adjust based on usage)
    //   - RPM (Requests Per Minute): 10-20 (for cost savings, use 10-15)
    // These are typically configured in your xAI API key settings, not in code
    const response = await client.chat.completions.create({
      model: 'grok-4-latest', // This model has built-in web search for real-time updates
      messages: messages.map((msg: any) => ({
        role: msg.role,
        content: msg.content,
      })),
      stream: false,
      temperature: temperature,
      max_tokens: 2000, // Limit tokens for cost efficiency (adjust based on needs)
    });

    // Extract text content from response
    const textContent = response.choices[0]?.message?.content || '';

    return NextResponse.json({
      id: response.id,
      content: textContent,
      role: 'assistant',
    });
  } catch (error: any) {
    console.error('Grok API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get response from Grok' },
      { status: 500 }
    );
  }
}

