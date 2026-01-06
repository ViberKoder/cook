import { NextRequest, NextResponse } from 'next/server';

const XAI_API_KEY = process.env.NEXT_PUBLIC_XAI_API_KEY || process.env.XAI_API_KEY;
const XAI_API_URL = 'https://api.x.ai/v1/responses';

export async function POST(request: NextRequest) {
  try {
    if (!XAI_API_KEY) {
      return NextResponse.json(
        { error: 'XAI API key is not configured' },
        { status: 500 }
      );
    }

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

    // Prepare request body
    const requestBody: any = {
      model: 'grok-4',
      input,
    };

    // If responseId is provided, continue the conversation
    if (responseId) {
      requestBody.id = responseId;
    }

    // Make request to XAI API
    const response = await fetch(XAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${XAI_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(360000), // 6 minutes timeout
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error?.message || errorData.error || `HTTP ${response.status}`);
    }

    const data = await response.json();

    // Extract text content from response
    // Response content is an array with objects like { type: 'output_text', text: '...' }
    let textContent = '';
    if (Array.isArray(data.content)) {
      const outputText = data.content.find((item: any) => item.type === 'output_text');
      textContent = outputText?.text || '';
    } else if (typeof data.content === 'string') {
      textContent = data.content;
    }

    return NextResponse.json({
      id: data.id,
      content: textContent,
      role: data.role || 'assistant',
    });
  } catch (error: any) {
    console.error('Grok API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get response from Grok' },
      { status: 500 }
    );
  }
}

