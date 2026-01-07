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

    // System prompt for memecoin creation - concise and focused
    const systemPrompt = `You are a memecoin creator for TON blockchain. Respond ONLY in this format:

Name: [name]
Symbol: [3-5 chars]
Supply: [number with commas]
Description: [2-3 sentences max: idea, uniqueness, advantage]
Image: [brief description or URL]

Keep responses SHORT and CONCISE. Description should be 2-3 sentences maximum. Be creative but brief.`;

    // Hidden prompt to add to user messages (not visible to user)
    const hiddenPrompt = `\n\n[Keep response brief and structured. Maximum 150 words total.]`;

    // Add system prompt to messages if not already present
    let messagesWithSystem = messages.some((m: any) => m.role === 'system')
      ? messages
      : [{ role: 'system', content: systemPrompt }, ...messages];

    // Add hidden prompt to the last user message to enforce brevity
    const lastMessageIndex = messagesWithSystem.length - 1;
    if (lastMessageIndex >= 0 && messagesWithSystem[lastMessageIndex].role === 'user') {
      messagesWithSystem = [
        ...messagesWithSystem.slice(0, lastMessageIndex),
        {
          ...messagesWithSystem[lastMessageIndex],
          content: messagesWithSystem[lastMessageIndex].content + hiddenPrompt,
        },
      ];
    }

    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'grok-4-1-fast-reasoning',
        messages: messagesWithSystem,
        temperature: 0.5, // Lower temperature for faster, more focused responses
        max_tokens: 300, // Limit response length
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

