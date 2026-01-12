import { NextRequest, NextResponse } from 'next/server';

// Vercel AI SDK endpoint - using direct xAI API with Vercel proxy
const VERCEL_API_KEY = 'vck_413sJS0GQCZTNCiDj7Q0TSC3FHf9nON6GldHo2N0lig4i74bVR35LZFA';
// Try using Vercel AI proxy endpoint
const VERCEL_API_URL = 'https://api.vercel.com/v1/chat/completions';
const MODEL = 'xai/grok-4.1-fast-reasoning';

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

    // Use Vercel AI SDK endpoint with proper format
    // The vck_ key is used with Vercel AI SDK proxy
    const response = await fetch('https://api.vercel.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${VERCEL_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: messages.map((msg: any) => ({
          role: msg.role,
          content: msg.content,
        })),
        temperature: temperature,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Vercel API error:', errorData);
      throw new Error(`Vercel API error: ${response.status} ${errorData}`);
    }

    const data = await response.json();
    const textContent = data.choices?.[0]?.message?.content || '';

    return NextResponse.json({
      id: data.id || `chatcmpl-${Date.now()}`,
      content: textContent,
      role: 'assistant',
    });
  } catch (error: any) {
    console.error('Vercel AI API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get response from AI' },
      { status: 500 }
    );
  }
}

