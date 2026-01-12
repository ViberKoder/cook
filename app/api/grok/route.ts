import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';

// Vercel AI Gateway - uses AI_GATEWAY_API_KEY from environment
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

    // Use AI SDK with Vercel AI Gateway
    // The AI_GATEWAY_API_KEY should be set in environment variables
    const result = await generateText({
      model: MODEL,
      messages: messages.map((msg: any) => ({
        role: msg.role,
        content: msg.content,
      })),
      temperature: temperature,
      maxTokens: 2000,
    });

    return NextResponse.json({
      id: `chatcmpl-${Date.now()}`,
      content: result.text,
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

