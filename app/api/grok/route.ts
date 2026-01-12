import { NextRequest, NextResponse } from 'next/server';
import { createVercel } from '@ai-sdk/vercel';
import { generateText } from 'ai';

// Vercel AI SDK
const VERCEL_API_KEY = 'vck_413sJS0GQCZTNCiDj7Q0TSC3FHf9nON6GldHo2N0lig4i74bVR35LZFA';
const MODEL = 'xai/grok-4.1-fast-reasoning';

const vercelAI = createVercel({
  apiKey: VERCEL_API_KEY,
});

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

    // Use Vercel AI SDK
    const result = await generateText({
      model: vercelAI(MODEL),
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

