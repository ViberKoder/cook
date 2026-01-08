import { NextRequest, NextResponse } from 'next/server';
// Removed OpenAI import - using direct fetch 'openai';

// Get API key from environment variables
const getApiKey = () => {
  return process.env.XAI_API_KEY || process.env.NEXT_PUBLIC_XAI_API_KEY || '';
};

const createClient = () => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('XAI API key is not configured. Please set XAI_API_KEY or NEXT_PUBLIC_XAI_API_KEY environment variable.');
  }
  
  return new OpenAI({
    apiKey: apiKey,
  });
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

    // Create client with API key
    const client = createClient();

    // Generate image using DALL-E
    const response = await client.images.generate({
      model: 'dall-e-3',
      prompt: prompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
      response_format: 'url',
    });

    const imageUrl = response.data?.[0]?.url;

    if (!imageUrl) {
      throw new Error('Failed to generate image');
    }

    return NextResponse.json({
      imageUrl: imageUrl,
    });
  } catch (error: any) {
    console.error('Image generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate image' },
      { status: 500 }
    );
  }
}

