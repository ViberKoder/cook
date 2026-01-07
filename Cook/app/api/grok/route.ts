import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { messages, temperature = 0.7 } = await request.json();

    const apiKey = process.env.XAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'XAI API key is not configured' },
        { status: 500 }
      );
    }

    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'grok-beta',
        messages: messages,
        temperature: temperature,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.error?.message || 'Failed to get response from XAI API' },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    return NextResponse.json({
      content: data.choices[0]?.message?.content || 'No response from AI',
    });
  } catch (error: any) {
    console.error('Error in grok API route:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

