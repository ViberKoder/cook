import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_XAI_API_KEY || process.env.XAI_API_KEY,
  baseURL: 'https://api.x.ai/v1',
  timeout: 360000, // 6 minutes timeout for reasoning models
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, responseId } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    // Prepare input messages
    const input = messages.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    }));

    // If responseId is provided, continue the conversation by appending new message
    // Otherwise create new conversation
    const response = await client.responses.create({
      model: 'grok-4',
      input,
      ...(responseId && { id: responseId }),
    });

    // Extract text content from response
    // Response content is an array with objects like { type: 'output_text', text: '...' }
    let textContent = '';
    if (Array.isArray(response.content)) {
      const outputText = response.content.find((item: any) => item.type === 'output_text');
      textContent = outputText?.text || '';
    } else if (typeof response.content === 'string') {
      textContent = response.content;
    }

    return NextResponse.json({
      id: response.id,
      content: textContent,
      role: response.role || 'assistant',
    });
  } catch (error: any) {
    console.error('Grok API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get response from Grok' },
      { status: 500 }
    );
  }
}

