import { NextRequest, NextResponse } from 'next/server';

// Get API key from environment variables - using XAI_API_KEY for xAI API
const getApiKey = () => {
  return process.env.XAI_API_KEY || process.env.NEXT_PUBLIC_XAI_API_KEY || '';
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt } = body;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Get API key first to provide better error message
    const apiKey = getApiKey();
    if (!apiKey) {
      return NextResponse.json(
        { error: 'XAI API key is not configured. Please set XAI_API_KEY or NEXT_PUBLIC_XAI_API_KEY environment variable.' },
        { status: 500 }
      );
    }

    // Use direct fetch to xAI API to avoid OpenAI SDK default API key issues
    const response = await fetch('https://api.x.ai/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'grok-2-image-1212',
        prompt: prompt,
        n: 1,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('xAI API error:', response.status, errorData);
      
      // Provide more specific error message
      const errorMessage = errorData.error?.message || errorData.error || 'Failed to generate image';
      if (errorMessage.includes('API key') || errorMessage.includes('OPENAI_API_KEY') || errorMessage.includes('authentication')) {
        return NextResponse.json(
          { error: 'XAI API key is not configured. Please set XAI_API_KEY or NEXT_PUBLIC_XAI_API_KEY environment variable.' },
          { status: 500 }
        );
      }
      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Extract image URL from response
    const imageUrl = data.data?.[0]?.url;

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Failed to generate image - no image URL in response' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      imageUrl: imageUrl,
    });
  } catch (error: any) {
    console.error('Image generation API error:', error);
    const errorMessage = error.message || 'Failed to generate image';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
