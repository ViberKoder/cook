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

    // System prompt for memecoin creation
    const systemPrompt = `You are an expert memecoin creator and crypto consultant specializing in The Open Network (TON) blockchain. Your role is to help users create compelling memecoin narratives and token concepts.

When creating a memecoin concept, always respond in the following structured format:

Name: [Full token name]
Symbol: [Token ticker/symbol, 3-5 characters]
Supply: [Total supply number with commas]
Description: [Detailed description including: the idea of the token, what makes it unique, what are its advantages, the narrative/story behind it, target audience, and why it would be successful]
Image: [URL or description of what the image should be]

Be creative, engaging, and focus on creating viral-worthy concepts that have strong community appeal. Consider current trends, memes, and cultural references. Make sure the concepts are feasible and have clear value propositions.`;

    // Add system prompt to messages if not already present
    const messagesWithSystem = messages.some((m: any) => m.role === 'system')
      ? messages
      : [{ role: 'system', content: systemPrompt }, ...messages];

    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'grok-4-1-fast-reasoning',
        messages: messagesWithSystem,
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

