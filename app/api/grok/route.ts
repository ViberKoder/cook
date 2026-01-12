import { NextRequest, NextResponse } from 'next/server';
import { createVercel } from '@ai-sdk/vercel';
import { generateText } from 'ai';

// Vercel AI SDK
const VERCEL_API_KEY = process.env.VERCEL_AI_API_KEY || 'vck_413sJS0GQCZTNCiDj7Q0TSC3FHf9nON6GldHo2N0lig4i74bVR35LZFA';
const MODEL = 'xai/grok-4.1-fast-reasoning';

// Initialize Vercel AI - try without explicit apiKey first (uses env var)
const vercelAI = createVercel();

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

    // Use Vercel AI SDK with explicit API key in headers
    const result = await generateText({
      model: vercelAI(MODEL, {
        apiKey: VERCEL_API_KEY,
      }),
      messages: messages.map((msg: any) => ({
        role: msg.role,
        content: msg.content,
      })),
      temperature: temperature,
      maxTokens: 2000,
    } as any);

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

